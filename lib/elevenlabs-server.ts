/**
 * Server-side ElevenLabs utility for Next.js API routes.
 * No browser APIs — backend only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerCallParams {
  apiKey: string;
  agentId: string;
  agentPhoneNumberId: string;
  toNumber: string;
  dynamicVariables?: Record<string, string>;
}

export interface ServerCallResult {
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

// ---------------------------------------------------------------------------
// 1. makeOutboundCallServer
// ---------------------------------------------------------------------------

export async function makeOutboundCallServer(
  params: ServerCallParams
): Promise<ServerCallResult> {
  const { apiKey, agentId, agentPhoneNumberId, toNumber, dynamicVariables } =
    params;

  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: agentPhoneNumberId,
          to_number: toNumber,
          conversation_initiation_client_data: {
            dynamic_variables: dynamicVariables ?? {},
          },
        }),
      }
    );

    if (!res.ok) {
      let errorMessage = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errorMessage = body.detail || body.message || errorMessage;
      } catch {
        // response body was not JSON — keep the status-based message
      }
      return { success: false, error: errorMessage };
    }

    const data = (await res.json()) as Record<string, unknown>;
    return {
      success: true,
      conversationId: data.conversation_id as string | undefined,
      response: data,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Netzwerkfehler";
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// 2. fetchConversationServer
// ---------------------------------------------------------------------------

export async function fetchConversationServer(
  apiKey: string,
  conversationId: string
): Promise<ConversationDetail | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!res.ok) return null;

    return (await res.json()) as ConversationDetail;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. buildDynamicVariables
// ---------------------------------------------------------------------------

export function buildDynamicVariables(
  contact: Record<string, unknown>,
  propertyMappings: { contactField: string; apiVariable: string }[]
): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const mapping of propertyMappings) {
    if (!mapping.contactField || !mapping.apiVariable) continue;

    let value = "";

    if (mapping.contactField.startsWith("custom:")) {
      const key = mapping.contactField.slice(7);
      const customProps = contact.customProperties;

      if (customProps instanceof Map) {
        const v = customProps.get(key);
        value = v !== undefined ? String(v) : "";
      } else if (customProps && typeof customProps === "object") {
        const v = (customProps as Record<string, unknown>)[key];
        value = v !== undefined ? String(v) : "";
      }
    } else {
      const v = contact[mapping.contactField];
      value = v !== undefined ? String(v) : "";
    }

    vars[mapping.apiVariable] = value;
  }

  return vars;
}
