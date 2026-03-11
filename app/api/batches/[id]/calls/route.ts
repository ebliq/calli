import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/lib/models/batch";
import { Call } from "@/lib/models/call";
import { Contact } from "@/lib/models/contact";
import { CalliAgent } from "@/lib/models/calli-agent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/batches/:id/calls — Add planned calls to an existing batch
// Validates that each contact has all fields required by the agent's property mappings.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Verify batch exists and belongs to user
    const batch = await Batch.findOne({ _id: id, userId });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (!Array.isArray(body.contactIds) || body.contactIds.length === 0) {
      return NextResponse.json({ error: "contactIds array is required" }, { status: 400 });
    }

    // Determine the agent — batch-specific or default
    const agent = batch.calliAgentId
      ? await CalliAgent.findOne({ _id: batch.calliAgentId, userId })
      : await CalliAgent.findOne({ userId, isDefault: true });

    // Load all contacts
    const contacts = await Contact.find({
      _id: { $in: body.contactIds },
      userId,
    });

    const contactMap = new Map(contacts.map((c) => [String(c._id), c]));

    // Validate: all contactIds must exist
    const notFound = body.contactIds.filter((cid: string) => !contactMap.has(cid));
    if (notFound.length > 0) {
      return NextResponse.json(
        {
          error: `${notFound.length} Kontakt(e) nicht gefunden`,
          code: "CONTACTS_NOT_FOUND",
          notFound,
        },
        { status: 404 }
      );
    }

    // Validate: check agent property mappings against each contact
    if (agent && agent.propertyMappings && agent.propertyMappings.length > 0) {
      const invalidContacts: { contactId: string; name: string; missingFields: string[] }[] = [];

      for (const contactId of body.contactIds as string[]) {
        const contact = contactMap.get(contactId)!;
        const missing: string[] = [];

        for (const mapping of agent.propertyMappings) {
          if (!mapping.contactField || !mapping.apiVariable) continue;

          let value: unknown;
          let fieldLabel = mapping.contactField;

          if (mapping.contactField.startsWith("custom:")) {
            const customKey = mapping.contactField.slice("custom:".length);
            fieldLabel = customKey;
            value = contact.customProperties?.get(customKey);
          } else {
            value = (contact as unknown as Record<string, unknown>)[mapping.contactField];
          }

          if (value === undefined || value === null || String(value).trim() === "") {
            missing.push(`${fieldLabel} → ${mapping.apiVariable}`);
          }
        }

        if (missing.length > 0) {
          invalidContacts.push({
            contactId,
            name: `${contact.firstName} ${contact.lastName}`,
            missingFields: missing,
          });
        }
      }

      if (invalidContacts.length > 0) {
        return NextResponse.json(
          {
            error: `${invalidContacts.length} Kontakt(e) haben fehlende Felder für Agent "${agent.name}"`,
            code: "MISSING_CONTACT_FIELDS",
            agent: { id: String(agent._id), name: agent.name },
            invalidContacts,
          },
          { status: 422 }
        );
      }
    }

    // Create planned calls
    const callDocs = body.contactIds.map((contactId: string) => ({
      userId,
      contactId,
      batchId: batch._id,
      calliAgentId: batch.calliAgentId || null,
      status: "planned",
    }));

    const calls = await Call.insertMany(callDocs);

    return NextResponse.json(
      { data: calls.map((c) => c.toJSON()), count: calls.length },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
