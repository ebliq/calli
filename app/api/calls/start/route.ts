import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Call } from "@/lib/models/call";
import { Contact } from "@/lib/models/contact";
import { Settings } from "@/lib/models/settings";
import { CalliAgent } from "@/lib/models/calli-agent";
import { Operator } from "@/lib/models/operator";
import { normalizePhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, contactId } = await req.json();
    if (!callId || !contactId) {
      return NextResponse.json(
        { error: "callId and contactId are required", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    await connectDB();

    // Load and verify the Call document
    const call = await Call.findOne({ _id: callId, userId });
    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }
    if (call.status !== "planned") {
      return NextResponse.json(
        { error: "Call is not in planned status", code: "INVALID_STATUS" },
        { status: 409 }
      );
    }

    // Load and verify the Contact document
    const contact = await Contact.findOne({ _id: contactId, userId });
    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Check operator availability
    const operator = await Operator.findOne({ userId });
    if (!operator || !operator.available || operator.locked) {
      return NextResponse.json(
        { error: "Operator nicht verfügbar", code: "OPERATOR_UNAVAILABLE" },
        { status: 409 }
      );
    }

    // Load settings for the ElevenLabs API key
    const settings = await Settings.findOne({ userId });
    const apiKey = settings?.apiKey;

    // Load default CalliAgent
    const agent = await CalliAgent.findOne({ userId, isDefault: true });

    if (!apiKey || !agent) {
      return NextResponse.json(
        { error: "ElevenLabs nicht konfiguriert", code: "NOT_CONFIGURED" },
        { status: 422 }
      );
    }

    // Normalize the phone number — convert to E.164 format (+...)
    let normalizedPhone = normalizePhone(contact.phone);
    // normalizePhone returns "00..." format, ElevenLabs needs "+"
    if (normalizedPhone.startsWith("00")) {
      normalizedPhone = "+" + normalizedPhone.slice(2);
    } else if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+" + normalizedPhone;
    }

    // Build dynamic variables from property mappings — validate all exist on contact
    const dynamicVariables: Record<string, string> = {};
    const missingFields: string[] = [];
    for (const mapping of agent.propertyMappings) {
      if (!mapping.contactField || !mapping.apiVariable) continue;
      let value: unknown;
      let fieldLabel = mapping.contactField;
      if (mapping.contactField.startsWith("custom:")) {
        const customKey = mapping.contactField.slice("custom:".length);
        fieldLabel = customKey;
        value = contact.customProperties?.get(customKey);
      } else {
        value = (contact as Record<string, unknown>)[mapping.contactField];
      }
      if (value === undefined || value === null || String(value).trim() === "") {
        missingFields.push(`${fieldLabel} → ${mapping.apiVariable}`);
      } else {
        dynamicVariables[mapping.apiVariable] = String(value);
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Kontakt hat fehlende Felder für Agent-Mappings: ${missingFields.join(", ")}`,
          code: "MISSING_CONTACT_FIELDS",
          missingFields,
        },
        { status: 422 }
      );
    }

    // Call ElevenLabs API
    const elResponse = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          agent_id: agent.agentId,
          agent_phone_number_id: agent.agentPhoneNumberId,
          to_number: normalizedPhone,
          conversation_initiation_client_data: {
            dynamic_variables: dynamicVariables,
          },
        }),
      }
    );

    if (!elResponse.ok) {
      let errorMessage = `ElevenLabs error: ${elResponse.status}`;
      try {
        const errData = await elResponse.json();
        errorMessage = errData.detail || errData.message || errorMessage;
      } catch {
        // use default error message
      }

      await Call.findByIdAndUpdate(callId, {
        $set: {
          status: "failed",
          summary: errorMessage,
          endedAt: new Date(),
        },
      });

      return NextResponse.json(
        { error: errorMessage, code: "ELEVENLABS_ERROR" },
        { status: 502 }
      );
    }

    const data = await elResponse.json();

    // Update call to ringing
    await Call.findByIdAndUpdate(callId, {
      $set: {
        status: "ringing",
        conversationId: data.conversation_id,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      data: {
        callId,
        conversationId: data.conversation_id,
        status: "ringing",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
