import mongoose, { Schema, Document } from "mongoose";

export interface IAppointmentAttendee {
  name: string;
  email: string;
}

export interface IAppointment extends Document {
  userId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: IAppointmentAttendee[];
  notes?: string;
}

const attendeeSchema = new Schema<IAppointmentAttendee>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const appointmentSchema = new Schema<IAppointment>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    attendees: { type: [attendeeSchema], default: [] },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

appointmentSchema.index({ userId: 1, startTime: 1 });

export const Appointment =
  mongoose.models.Appointment ?? mongoose.model<IAppointment>("Appointment", appointmentSchema);
