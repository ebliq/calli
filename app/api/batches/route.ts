import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Batch } from "@/lib/models/batch";
import { Call } from "@/lib/models/call";

// GET /api/batches — List batches with computed counts
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const sort = searchParams.get("sort") ?? "-createdAt";

    const filter: Record<string, unknown> = { userId };
    if (status) filter.status = status;

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Batch.countDocuments(filter),
    ]);

    // Compute call counts per batch in a single aggregation
    const batchIds = batches.map((b) => b._id);
    const counts = await Call.aggregate([
      { $match: { batchId: { $in: batchIds } } },
      {
        $group: {
          _id: "$batchId",
          totalCalls: { $sum: 1 },
          completedCalls: {
            $sum: {
              $cond: [{ $in: ["$status", ["completed", "failed", "transferred"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    const countMap = new Map(
      counts.map((c: { _id: unknown; totalCalls: number; completedCalls: number }) => [
        String(c._id),
        { totalCalls: c.totalCalls, completedCalls: c.completedCalls },
      ])
    );

    const data = batches.map((b) => {
      const { _id, __v, ...rest } = b as Record<string, unknown>;
      const id = String(_id);
      const batchCounts = countMap.get(id) ?? { totalCalls: 0, completedCalls: 0 };
      return {
        id,
        ...rest,
        calliAgentId: rest.calliAgentId ? String(rest.calliAgentId) : null,
        ...batchCounts,
      };
    });

    return NextResponse.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/batches — Create a batch with planned calls
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Create the batch
    const batch = await Batch.create({
      userId,
      name: body.name.trim(),
      status: "pending",
      calliAgentId: body.calliAgentId || null,
    });

    // Optionally create planned calls if contactIds provided
    let callCount = 0;
    const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];
    if (contactIds.length > 0) {
      const callDocs = contactIds.map((contactId: string) => ({
        userId,
        contactId,
        batchId: batch._id,
        calliAgentId: body.calliAgentId || null,
        status: "planned",
      }));
      const calls = await Call.insertMany(callDocs);
      callCount = calls.length;
    }

    return NextResponse.json(
      {
        data: {
          ...batch.toJSON(),
          totalCalls: callCount,
          completedCalls: 0,
        },
      },
      { status: 201 }
    );
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
