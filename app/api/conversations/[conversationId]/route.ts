import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/lib/models/settings";

interface RouteParams {
  params: Promise<{ conversationId: string }>;
}

// Detect transfer from ElevenLabs tool_results in transcript entries
// ElevenLabs system tools produce results with types like:
//   transfer_to_number_twilio_success, transfer_to_number_sip_success,
//   transfer_to_agent_success (and their _error variants)
interface ToolResult {
  type?: string;
  system?: {
    type?: string;
    transfer_number?: string;
    from_agent?: string;
    to_agent?: string;
    reason?: string;
    [key: string]: unknown;
  };
  tool_name?: string;
  [key: string]: unknown;
}

interface TranscriptEntry {
  role: string;
  message?: string | null;
  time_in_call_secs?: number;
  tool_calls?: { tool_name?: string; [key: string]: unknown }[];
  tool_results?: ToolResult[];
  [key: string]: unknown;
}

interface TransferDetectionResult {
  detected: boolean;
  // Was a system transfer tool actually executed?
  toolTransfer: {
    found: boolean;
    type?: string;
    details?: Record<string, unknown>;
    transcriptIndex?: number;
  };
  // Did features_usage confirm transfer was used?
  featureUsed: {
    transferToNumber: boolean;
    transferToAgent: boolean;
  };
  // Fallback: keyword match in transcript text
  textMatch: {
    found: boolean;
    matchedLine?: { role: string; message: string; index: number; pattern: string };
  };
}

const TRANSFER_TOOL_TYPES = [
  "transfer_to_number_twilio_success",
  "transfer_to_number_sip_success",
  "transfer_to_agent_success",
  "transfer_to_number_error",
  "transfer_to_agent_error",
];

const TEXT_TRANSFER_PATTERNS = [
  "agent hat den anruf weitergegeben",
  "anruf weitergeleitet",
  "weiterleitung an",
  "möchte mit einem menschen sprechen",
  "verbinde sie weiter",
  "ich leite sie weiter",
  "wird weitergeleitet",
];

function detectTransfer(
  transcript: TranscriptEntry[],
  metadata?: Record<string, unknown>,
): TransferDetectionResult {
  const result: TransferDetectionResult = {
    detected: false,
    toolTransfer: { found: false },
    featureUsed: { transferToNumber: false, transferToAgent: false },
    textMatch: { found: false },
  };

  // 1) Check tool_results in transcript for system transfer tools
  for (let i = 0; i < transcript.length; i++) {
    const entry = transcript[i];
    if (!entry.tool_results) continue;
    for (const tr of entry.tool_results) {
      const systemType = tr.system?.type ?? tr.type;
      if (systemType && TRANSFER_TOOL_TYPES.some((t) => systemType.includes(t))) {
        result.toolTransfer = {
          found: true,
          type: systemType,
          details: tr.system ?? tr as Record<string, unknown>,
          transcriptIndex: i,
        };
        result.detected = true;
        break;
      }
    }
    if (result.toolTransfer.found) break;
  }

  // 2) Check features_usage from metadata
  const features = (metadata as Record<string, unknown>)?.features_usage as Record<string, unknown> | undefined;
  if (features) {
    const ttn = features.transfer_to_number as Record<string, boolean> | undefined;
    const tta = features.transfer_to_agent as Record<string, boolean> | undefined;
    if (ttn?.used) {
      result.featureUsed.transferToNumber = true;
      result.detected = true;
    }
    if (tta?.used) {
      result.featureUsed.transferToAgent = true;
      result.detected = true;
    }
  }

  // 3) Fallback: text pattern match in transcript messages
  for (let i = 0; i < transcript.length; i++) {
    const msg = transcript[i].message;
    if (!msg) continue;
    const lower = msg.toLowerCase();
    for (const pattern of TEXT_TRANSFER_PATTERNS) {
      if (lower.includes(pattern)) {
        result.textMatch = {
          found: true,
          matchedLine: { role: transcript[i].role, message: msg, index: i, pattern },
        };
        result.detected = true;
        break;
      }
    }
    if (result.textMatch.found) break;
  }

  return result;
}

// GET /api/conversations/:conversationId — Fetch transcript from ElevenLabs and analyze
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { conversationId } = await params;

    // Get API key from settings
    const settings = await Settings.findOne({ userId });
    const apiKey = settings?.apiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured. Set it in Settings." },
        { status: 400 }
      );
    }

    // Fetch conversation from ElevenLabs
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      { headers: { "xi-api-key": apiKey } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || `ElevenLabs API returned ${res.status}` },
        { status: res.status }
      );
    }

    const conversation = await res.json();

    const transcript: TranscriptEntry[] = conversation.transcript ?? [];
    const metadata = conversation.metadata ?? {};
    const analysis = conversation.analysis ?? {};
    const transferDetection = detectTransfer(transcript, metadata);

    return NextResponse.json({
      data: {
        conversationId: conversation.conversation_id,
        agentId: conversation.agent_id,
        status: conversation.status,
        callDurationSecs: metadata.call_duration_secs ?? conversation.call_duration_secs ?? null,
        terminationReason: metadata.termination_reason ?? null,
        transcript,
        metadata: {
          startTimeUnixSecs: metadata.start_time_unix_secs ?? null,
          callDurationSecs: metadata.call_duration_secs ?? null,
          terminationReason: metadata.termination_reason ?? null,
          phoneCall: metadata.phone_call ?? null,
          featuresUsage: metadata.features_usage ?? null,
        },
        analysis: {
          callSuccessful: analysis.call_successful ?? null,
          transcriptSummary: analysis.transcript_summary ?? null,
          dataCollectionResults: analysis.data_collection_results ?? null,
        },
        // Transfer detection with 3 layers:
        // 1. toolTransfer  — ElevenLabs system tool was executed (most reliable)
        // 2. featureUsed   — features_usage.transfer_to_number/agent.used = true
        // 3. textMatch     — Fallback keyword match in transcript text
        transferDetection,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
