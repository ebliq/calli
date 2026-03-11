import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/lib/models/settings";
import { Operator } from "@/lib/models/operator";

// POST /api/operator/lock — Lock/unlock operator via API key (idempotent)
// Headers: x-api-key: <operatorApiKey>
// Body: { "locked": true, "lockedBy": "conv_xxx" } or { "locked": false }
//
// Lock responses:
//   status: "blocked"                  — freshly locked by this conversation
//   status: "already_blocked_same_id"  — already locked by the same conversation ID
//   status: "already_blocked_other_id" — already locked by a different conversation ID
//   status: "unlocked"                 — successfully unlocked
//   status: "already_unlocked"         — was not locked
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing x-api-key header" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user by operator API key
    const settings = await Settings.findOne({ operatorApiKey: apiKey });
    if (!settings) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const userId = settings.userId;
    const body = await req.json();

    if (typeof body.locked !== "boolean") {
      return NextResponse.json(
        { error: "Field 'locked' (boolean) is required" },
        { status: 400 }
      );
    }

    // Get current operator state
    let operator = await Operator.findOne({ userId });
    if (!operator) {
      operator = await Operator.create({ userId });
    }

    // === LOCK ===
    if (body.locked === true) {
      if (!body.lockedBy || typeof body.lockedBy !== "string") {
        return NextResponse.json(
          { error: "Field 'lockedBy' (string, e.g. conversation ID) is required when locking" },
          { status: 400 }
        );
      }

      // Already locked?
      if (operator.locked) {
        if (operator.lockedBy === body.lockedBy) {
          return NextResponse.json({
            status: "already_blocked_same_id",
            lockedBy: operator.lockedBy,
            lockedAt: operator.lockedAt,
            data: operator.toJSON(),
          });
        } else {
          return NextResponse.json({
            status: "already_blocked_other_id",
            lockedBy: operator.lockedBy,
            requestedBy: body.lockedBy,
            lockedAt: operator.lockedAt,
            data: operator.toJSON(),
          });
        }
      }

      // Lock it
      operator = await Operator.findOneAndUpdate(
        { userId },
        { $set: { locked: true, lockedBy: body.lockedBy, lockedAt: new Date() } },
        { new: true }
      );

      return NextResponse.json({
        status: "blocked",
        lockedBy: body.lockedBy,
        data: operator!.toJSON(),
      });
    }

    // === UNLOCK ===
    if (!operator.locked) {
      return NextResponse.json({
        status: "already_unlocked",
        data: operator.toJSON(),
      });
    }

    const previousLockedBy = operator.lockedBy;
    operator = await Operator.findOneAndUpdate(
      { userId },
      { $set: { locked: false, lockedBy: null, lockedAt: null } },
      { new: true }
    );

    return NextResponse.json({
      status: "unlocked",
      previousLockedBy,
      data: operator!.toJSON(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
