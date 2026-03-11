import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  userId: string;
  salutation?: string;
  title?: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneMobile?: string;
  email?: string;
  company?: string;
  position?: string;
  department?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  callReason?: string;
  preferredCallTime?: string;
  language?: string;
  customProperties?: Map<string, string | number | boolean>;
  notes?: string;
  tags?: string[];
  source?: string;
  lastContactDate?: Date;
  nextScheduledCall?: Date;
  status: "new" | "contacted" | "scheduled" | "completed" | "no-answer" | "callback";
}

const contactSchema = new Schema<IContact>(
  {
    userId: { type: String, required: true, index: true },
    salutation: { type: String, trim: true },
    title: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    phoneMobile: { type: String, trim: true },
    email: { type: String, trim: true },
    company: { type: String, trim: true },
    position: { type: String, trim: true },
    department: { type: String, trim: true },
    street: { type: String, trim: true },
    zip: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    callReason: { type: String, trim: true },
    preferredCallTime: { type: String, trim: true },
    language: { type: String, trim: true },
    customProperties: { type: Map, of: Schema.Types.Mixed },
    notes: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    source: { type: String, trim: true },
    lastContactDate: { type: Date },
    nextScheduledCall: { type: Date },
    status: {
      type: String,
      enum: ["new", "contacted", "scheduled", "completed", "no-answer", "callback"],
      default: "new",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        if (ret.customProperties instanceof Map) {
          ret.customProperties = Object.fromEntries(ret.customProperties);
        }
      },
    },
  }
);

contactSchema.index({ firstName: "text", lastName: "text", phone: "text", email: "text", company: "text" });
contactSchema.index({ status: 1 });
contactSchema.index({ userId: 1, status: 1 });

export const Contact = mongoose.models.Contact ?? mongoose.model<IContact>("Contact", contactSchema);
