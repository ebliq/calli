import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Call } from "@/lib/models/call";

// GET /api/calls — List calls with optional filters
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = req.nextUrl;
    const contactId = searchParams.get("contactId");
    const batchId = searchParams.get("batchId");
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const sort = searchParams.get("sort") ?? "-createdAt";

    const filter: Record<string, unknown> = { userId };
    if (contactId) filter.contactId = contactId;
    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;

    const [calls, total] = await Promise.all([
      Call.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Call.countDocuments(filter),
    ]);

    const data = calls.map((c) => {
      const { _id, __v, ...rest } = c as Record<string, unknown>;
      return {
        id: String(_id),
        ...rest,
        contactId: rest.contactId ? String(rest.contactId) : null,
        batchId: rest.batchId ? String(rest.batchId) : null,
        calliAgentId: rest.calliAgentId ? String(rest.calliAgentId) : null,
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

// POST /api/calls — Create a single planned call
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.contactId) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
    }

    const call = await Call.create({
      userId,
      contactId: body.contactId,
      batchId: body.batchId || null,
      calliAgentId: body.calliAgentId || null,
      status: "planned",
    });

    return NextResponse.json({ data: call.toJSON() }, { status: 201 });
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
