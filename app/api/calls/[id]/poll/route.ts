import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Call } from "@/lib/models/call";
import { Settings } from "@/lib/models/settings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/calls/:id/poll
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const call = await Call.findOne({ _id: id, userId });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // If call is already done, return immediately
    if (["completed", "failed", "transferred"].includes(call.status)) {
      return NextResponse.json({
        data: {
          status: call.status,
          polling: false,
          duration: call.duration,
          summary: call.summary,
          transcript: call.elevenLabsTranscript,
          conversationId: call.conversationId,
        },
      });
    }

    // No conversationId yet — keep polling (call might still be connecting)
    if (!call.conversationId) {
      return NextResponse.json({
        data: {
          status: call.status,
          polling: true,
          message: "Warte auf Conversation-ID",
        },
      });
    }

    const conversationId = call.conversationId;

    // Load user settings to get ElevenLabs API key
    const settings = await Settings.findOne({ userId }).lean();
    if (!settings || !(settings as Record<string, unknown>).apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 400 }
      );
    }

    const apiKey = (settings as Record<string, unknown>).apiKey as string;

    // Call ElevenLabs conversation detail API
    let detail: Record<string, unknown>;
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        {
          method: "GET",
          headers: { "xi-api-key": apiKey },
        }
      );

      if (!res.ok) {
        // Don't fail hard — return current state so the UI can retry
        return NextResponse.json({
          data: {
            status: call.status,
            polling: true,
            conversationId,
          },
        });
      }

      detail = await res.json();
    } catch {
      // Network / parse error — return current state, let the UI retry
      return NextResponse.json({
        data: {
          status: call.status,
          polling: true,
          conversationId,
        },
      });
    }

    const elStatus = detail.status as string | undefined;

    if (elStatus === "done" || elStatus === "failed") {
      const transcript = detail.transcript as
        | Array<{ role: string; message: string }>
        | undefined;
      const analysis = detail.analysis as
        | { summary?: string; data_collection_results?: Record<string, unknown> }
        | undefined;
      const duration = detail.call_duration_secs as number | undefined;

      const newStatus = elStatus === "failed" ? "failed" : "completed";

      await Call.findByIdAndUpdate(id, {
        $set: {
          status: newStatus,
          ...(newStatus === "completed" && { outcome: "answered" }),
          endedAt: new Date(),
          duration,
          transcript: transcript
            ?.map((t) => t.role + ": " + t.message)
            .join("\n"),
          summary: analysis?.summary,
          elevenLabsTranscript: transcript,
          elevenLabsSummary: analysis?.summary,
          elevenLabsData: analysis?.data_collection_results,
        },
      });

      return NextResponse.json({
        data: {
          status: newStatus,
          polling: false,
          duration,
          summary: analysis?.summary,
          transcript,
          conversationId,
        },
      });
    }

    // Conversation still in progress
    if (call.status === "ringing") {
      await Call.findByIdAndUpdate(id, { $set: { status: "in-progress" } });
    }

    return NextResponse.json({
      data: {
        status: "in-progress",
        polling: true,
        conversationId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
