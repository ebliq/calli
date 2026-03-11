import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Appointment } from "@/lib/models/appointment";
import { Settings } from "@/lib/models/settings";

async function authenticateApiKey(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return { error: NextResponse.json({ error: "Missing x-api-key" }, { status: 401 }) };

  const settings = await Settings.findOne({ operatorApiKey: apiKey });
  if (!settings) return { error: NextResponse.json({ error: "Invalid API key" }, { status: 401 }) };

  return { userId: settings.userId, settings };
}

// GET /api/appointments/public — List available slots
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const result = await authenticateApiKey(req);
    if ("error" in result) return result.error;
    const { userId, settings } = result;

    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const duration = Math.max(1, Number(searchParams.get("duration") ?? 30));

    if (!from || !to) {
      return NextResponse.json(
        { error: "Both 'from' and 'to' query params are required" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const workingHoursStart = settings.workingHoursStart ?? 9;
    const workingHoursEnd = settings.workingHoursEnd ?? 17;
    const workingDays: number[] = settings.workingDays ?? [1, 2, 3, 4, 5];

    // Load existing appointments in range
    const existing = await Appointment.find({
      userId,
      startTime: { $lt: toDate },
      endTime: { $gt: fromDate },
    })
      .sort("startTime")
      .lean();

    const appointments = existing.map((a) => ({
      start: new Date((a as Record<string, unknown>).startTime as string).getTime(),
      end: new Date((a as Record<string, unknown>).endTime as string).getTime(),
    }));

    // Generate available slots
    const slots: { start: string; end: string }[] = [];
    const durationMs = duration * 60 * 1000;

    // Iterate day by day
    const current = new Date(fromDate);
    current.setUTCHours(0, 0, 0, 0);

    const endBound = toDate.getTime();

    while (current.getTime() < endBound) {
      const dayOfWeek = current.getUTCDay();

      if (workingDays.includes(dayOfWeek)) {
        // Build working hours window for this day
        const dayStart = new Date(current);
        dayStart.setUTCHours(workingHoursStart, 0, 0, 0);

        const dayEnd = new Date(current);
        dayEnd.setUTCHours(workingHoursEnd, 0, 0, 0);

        // Clamp to requested range
        const windowStart = Math.max(dayStart.getTime(), fromDate.getTime());
        const windowEnd = Math.min(dayEnd.getTime(), endBound);

        let slotStart = windowStart;

        while (slotStart + durationMs <= windowEnd) {
          const slotEnd = slotStart + durationMs;

          // Check for overlap with existing appointments
          const overlaps = appointments.some(
            (appt) => slotStart < appt.end && slotEnd > appt.start
          );

          if (!overlaps) {
            slots.push({
              start: new Date(slotStart).toISOString(),
              end: new Date(slotEnd).toISOString(),
            });
          }

          slotStart += durationMs;
        }
      }

      // Move to next day
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// POST /api/appointments/public — Create appointment via API key
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const result = await authenticateApiKey(req);
    if ("error" in result) return result.error;
    const { userId } = result;

    const body = await req.json();
    const appointment = await Appointment.create({ ...body, userId });

    return NextResponse.json({ data: appointment.toJSON() }, { status: 201 });
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
