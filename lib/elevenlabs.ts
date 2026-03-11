import { getApiKey, getDefaultAgent } from "./store";
import { normalizePhone } from "./utils";
import type { Contact } from "./types";

export interface ElevenLabsCallResult {
  success: boolean;
  conversationId?: string;
  error?: string;
  response?: Record<string, unknown>;
}

export interface ConversationDetail {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript?: { role: string; message: string; time_in_call_secs?: number }[];
  analysis?: {
    summary?: string;
    data_collection_results?: Record<string, { value: string; rationale: string }>;
  };
  call_duration_secs?: number;
}

export function isElevenLabsConfigured(): boolean {
  const agent = getDefaultAgent();
  const apiKey = getApiKey();
  return !!(agent?.agentId && agent?.agentPhoneNumberId && apiKey);
}

export async function makeOutboundCall(
  phone: string,
  contact?: Contact,
): Promise<ElevenLabsCallResult> {
  const apiKey = getApiKey();
  const agent = getDefaultAgent();

  if (!apiKey || !agent?.agentId || !agent?.agentPhoneNumberId) {
    return { success: false, error: "ElevenLabs nicht konfiguriert" };
  }

  const normalized = normalizePhone(phone);
  const apiNumber = normalized.startsWith("00")
    ? "+" + normalized.slice(2)
    : normalized;

  // Build dynamic variables from property mappings
  const dynamicVariables: Record<string, string> = {};
  if (contact && agent.propertyMappings) {
    for (const mapping of agent.propertyMappings) {
      if (!mapping.contactField || !mapping.apiVariable) continue;
      let value: string = "";
      if (mapping.contactField.startsWith("custom:")) {
        const key = mapping.contactField.slice(7);
        const v = contact.customProperties?.[key];
        value = v !== undefined ? String(v) : "";
      } else {
        const v = (contact as unknown as Record<string, unknown>)[mapping.contactField];
        value = v !== undefined ? String(v) : "";
      }
      dynamicVariables[mapping.apiVariable] = value;
    }
  }

  const body = {
    agent_id: agent.agentId,
    agent_phone_number_id: agent.agentPhoneNumberId,
    to_number: apiNumber,
    conversation_initiation_client_data: {
      dynamic_variables: dynamicVariables,
    },
  };

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data) {
      return {
        success: true,
        conversationId: data.conversation_id,
        response: data,
      };
    } else {
      const errMsg = data?.detail || data?.message || `HTTP ${res.status}`;
      return {
        success: false,
        error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg),
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Netzwerkfehler",
    };
  }
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
      { headers: { "xi-api-key": apiKey } }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  return null;
}
