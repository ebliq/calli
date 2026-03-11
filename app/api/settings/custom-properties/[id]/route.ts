import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/lib/models/settings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/settings/custom-properties/:id — Update a custom property
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const updates = await req.json();

    const setFields: Record<string, unknown> = {};
    if (updates.name !== undefined) {
      setFields["customProperties.$.name"] = updates.name;
      // Regenerate key when name changes
      setFields["customProperties.$.key"] = updates.name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    }
    if (updates.type !== undefined) {
      setFields["customProperties.$.type"] = updates.type;
    }

    const settings = await Settings.findOneAndUpdate(
      { userId, "customProperties._id": id },
      { $set: setFields },
      { new: true }
    );

    if (!settings) {
      return NextResponse.json(
        { error: "Custom property not found" },
        { status: 404 }
      );
    }

    const props = settings.toJSON().customProperties ?? [];
    const updated = props.find(
      (cp: { id: string }) => cp.id === id
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/custom-properties/:id — Remove a custom property
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const settings = await Settings.findOneAndUpdate(
      { userId },
      { $pull: { customProperties: { _id: id } } },
      { new: true }
    );

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
