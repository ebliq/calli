import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/lib/models/settings";

// GET /api/settings/custom-properties — List custom properties
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const settings = await Settings.findOne({ userId });

    if (!settings) {
      return NextResponse.json({ data: [] });
    }

    const data = settings.toJSON().customProperties ?? [];
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/settings/custom-properties — Add a custom property
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "name and type are required" },
        { status: 400 }
      );
    }

    // Generate key from name
    const key = name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    const property = { name, key, type, createdAt: new Date() };

    const settings = await Settings.findOneAndUpdate(
      { userId },
      { $push: { customProperties: property } },
      { new: true, upsert: true }
    );

    const props = settings.toJSON().customProperties ?? [];
    const added = props[props.length - 1];

    return NextResponse.json({ data: added }, { status: 201 });
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
