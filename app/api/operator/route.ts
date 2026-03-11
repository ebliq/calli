import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Operator } from "@/lib/models/operator";

// GET /api/operator — Get operator status for user (create default if none)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let operator = await Operator.findOne({ userId });

    if (!operator) {
      operator = await Operator.create({ userId });
    }

    return NextResponse.json({ data: operator.toJSON() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/operator — Update operator status
// Body: { available?: boolean, locked?: boolean, lockedBy?: string }
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const updates = await req.json();

    // Protect immutable fields
    delete updates.id;
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;

    // If unlocking, clear lockedBy and lockedAt
    if (updates.locked === false) {
      updates.lockedBy = null;
      updates.lockedAt = null;
    }

    // If locking, require lockedBy and set lockedAt
    if (updates.locked === true && !updates.lockedBy) {
      return NextResponse.json(
        { error: "lockedBy is required when locking the operator" },
        { status: 400 }
      );
    }
    if (updates.locked === true) {
      updates.lockedAt = new Date();
    }

    const operator = await Operator.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ data: operator.toJSON() });
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
