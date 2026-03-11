import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/lib/models/settings";
import { Operator } from "@/lib/models/operator";

// POST /api/operator/lock — Lock/unlock operator via API key
// Headers: x-api-key: <operatorApiKey>
// Body: { "locked": true, "lockedBy": "conv_xxx" } or { "locked": false }
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

    const updates: Record<string, unknown> = {};

    if (body.locked === true) {
      if (!body.lockedBy || typeof body.lockedBy !== "string") {
        return NextResponse.json(
          { error: "Field 'lockedBy' (string, e.g. conversation ID) is required when locking" },
          { status: 400 }
        );
      }
      updates.locked = true;
      updates.lockedBy = body.lockedBy;
      updates.lockedAt = new Date();
    } else {
      updates.locked = false;
      updates.lockedBy = null;
      updates.lockedAt = null;
    }

    const operator = await Operator.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ data: operator.toJSON() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
