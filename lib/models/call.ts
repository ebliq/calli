import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITranscriptEntry {
  role: string;
  message: string;
  time_in_call_secs?: number;
}

export interface ICall extends Document {
  userId: string;
  contactId: Types.ObjectId;
  batchId?: Types.ObjectId;
  calliAgentId?: Types.ObjectId;
  status: "planned" | "ringing" | "in-progress" | "completed" | "failed" | "transferred";
  outcome?: "answered" | "no-answer" | "voicemail" | "busy" | "meeting-booked" | "callback-requested";
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  transcript?: string;
  summary?: string;
  meetingBooked?: boolean;
  meetingDate?: Date;
  agentNotes?: string;
  conversationId?: string;
  elevenLabsTranscript?: ITranscriptEntry[];
  elevenLabsSummary?: string;
  elevenLabsData?: Record<string, { value: string; rationale: string }>;
}

const transcriptEntrySchema = new Schema<ITranscriptEntry>(
  {
    role: { type: String, required: true },
    message: { type: String, required: true },
    time_in_call_secs: { type: Number },
  },
  { _id: false }
);

const callSchema = new Schema<ICall>(
  {
    userId: { type: String, required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", required: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", default: null },
    calliAgentId: { type: Schema.Types.ObjectId, ref: "CalliAgent", default: null },
    status: {
      type: String,
      enum: ["planned", "ringing", "in-progress", "completed", "failed", "transferred"],
      default: "planned",
    },
    outcome: {
      type: String,
      enum: ["answered", "no-answer", "voicemail", "busy", "meeting-booked", "callback-requested"],
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number },
    transcript: { type: String },
    summary: { type: String },
    meetingBooked: { type: Boolean },
    meetingDate: { type: Date },
    agentNotes: { type: String },
    conversationId: { type: String },
    elevenLabsTranscript: { type: [transcriptEntrySchema], default: undefined },
    elevenLabsSummary: { type: String },
    elevenLabsData: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        if (ret.contactId) ret.contactId = String(ret.contactId);
        if (ret.batchId) ret.batchId = String(ret.batchId);
        if (ret.calliAgentId) ret.calliAgentId = String(ret.calliAgentId);
      },
    },
  }
);

callSchema.index({ userId: 1, contactId: 1 });
callSchema.index({ userId: 1, batchId: 1 });
callSchema.index({ userId: 1, status: 1 });
callSchema.index({ conversationId: 1 }, { sparse: true });

export const Call = mongoose.models.Call ?? mongoose.model<ICall>("Call", callSchema);
