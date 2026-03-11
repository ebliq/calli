import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/lib/models/batch";
import { Call } from "@/lib/models/call";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/batches/:id — Get batch with counts, optionally include calls
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const batch = await Batch.findOne({ _id: id, userId }).lean();

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const { _id, __v, ...rest } = batch as Record<string, unknown>;

    // Compute counts
    const [totalCalls, completedCalls] = await Promise.all([
      Call.countDocuments({ batchId: id }),
      Call.countDocuments({ batchId: id, status: { $in: ["completed", "failed", "transferred"] } }),
    ]);

    const result: Record<string, unknown> = {
      id: String(_id),
      ...rest,
      calliAgentId: rest.calliAgentId ? String(rest.calliAgentId) : null,
      totalCalls,
      completedCalls,
    };

    // Optionally include calls
    const include = req.nextUrl.searchParams.get("include");
    if (include === "calls") {
      const calls = await Call.find({ batchId: id }).sort({ createdAt: 1 }).lean();
      result.calls = calls.map((c) => {
        const { _id: cId, __v: cV, ...cRest } = c as Record<string, unknown>;
        return {
          id: String(cId),
          ...cRest,
          contactId: cRest.contactId ? String(cRest.contactId) : null,
          batchId: cRest.batchId ? String(cRest.batchId) : null,
          calliAgentId: cRest.calliAgentId ? String(cRest.calliAgentId) : null,
        };
      });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/batches/:id — Update batch name or status
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

    const batch = await Batch.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Return with computed counts
    const [totalCalls, completedCalls] = await Promise.all([
      Call.countDocuments({ batchId: id }),
      Call.countDocuments({ batchId: id, status: { $in: ["completed", "failed", "transferred"] } }),
    ]);

    return NextResponse.json({
      data: {
        ...batch.toJSON(),
        totalCalls,
        completedCalls,
      },
    });
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

// DELETE /api/batches/:id — Delete batch and its planned calls
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const batch = await Batch.findOneAndDelete({ _id: id, userId });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Delete planned calls (not yet started)
    const deletedPlanned = await Call.deleteMany({ batchId: id, status: "planned" });

    // Unlink calls that already started (keep the call record, remove batch reference)
    await Call.updateMany(
      { batchId: id, status: { $ne: "planned" } },
      { $set: { batchId: null } }
    );

    return NextResponse.json({
      deleted: true,
      plannedCallsRemoved: deletedPlanned.deletedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
