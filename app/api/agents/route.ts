import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { CalliAgent } from "@/lib/models/calli-agent";

// GET /api/agents — List all agents for user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const agents = await CalliAgent.find({ userId }).sort({ createdAt: 1 }).lean();

    const data = agents.map((a) => {
      const { _id, __v, ...rest } = a as Record<string, unknown>;
      return { id: String(_id), ...rest };
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/agents — Create a new agent
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    // If this is the first agent for the user, auto-set isDefault
    const existingCount = await CalliAgent.countDocuments({ userId });
    const isDefault = existingCount === 0 ? true : body.isDefault ?? false;

    const agent = await CalliAgent.create({ ...body, userId, isDefault });

    return NextResponse.json({ data: agent.toJSON() }, { status: 201 });
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
