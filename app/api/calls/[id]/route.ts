import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Call } from "@/lib/models/call";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/calls/:id
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const call = await Call.findOne({ _id: id, userId }).lean();

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const { _id, __v, ...rest } = call as Record<string, unknown>;
    return NextResponse.json({
      data: {
        id: String(_id),
        ...rest,
        contactId: rest.contactId ? String(rest.contactId) : null,
        batchId: rest.batchId ? String(rest.batchId) : null,
        calliAgentId: rest.calliAgentId ? String(rest.calliAgentId) : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/calls/:id — Update call status, outcome, transcript, etc.
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const updates = await req.json();

    // Protect immutable fields
    delete updates.id;
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;

    // Auto-set startedAt when transitioning to ringing
    if (updates.status === "ringing" && !updates.startedAt) {
      updates.startedAt = new Date();
    }

    // Auto-set endedAt when call finishes
    if (["completed", "failed", "transferred"].includes(updates.status) && !updates.endedAt) {
      updates.endedAt = new Date();
    }

    const call = await Call.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ data: call.toJSON() });
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/calls/:id — Remove a planned call
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const call = await Call.findOneAndDelete({ _id: id, userId });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
