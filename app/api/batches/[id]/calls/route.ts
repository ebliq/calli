import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/lib/models/batch";
import { Call } from "@/lib/models/call";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/batches/:id/calls — Add planned calls to an existing batch
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
