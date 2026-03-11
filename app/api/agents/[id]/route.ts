import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { CalliAgent } from "@/lib/models/calli-agent";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/:id
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const agent = await CalliAgent.findOne({ _id: id, userId }).lean();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const { _id, __v, ...rest } = agent as Record<string, unknown>;
    return NextResponse.json({ data: { id: String(_id), ...rest } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/:id
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const updates = await req.json();

    delete updates.id;
    delete updates._id;
    delete updates.createdAt;

    // If setting isDefault to true, unset all others first
    if (updates.isDefault === true) {
      await CalliAgent.updateMany(
        { userId, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }

    const agent = await CalliAgent.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ data: agent.toJSON() });
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

// DELETE /api/agents/:id
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const agent = await CalliAgent.findOneAndDelete({ _id: id, userId });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // If deleted agent was default, make the first remaining one default
    if (agent.isDefault) {
      const firstRemaining = await CalliAgent.findOne({ userId }).sort({ createdAt: 1 });
      if (firstRemaining) {
        firstRemaining.isDefault = true;
        await firstRemaining.save();
      }
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
