import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBatch extends Document {
  userId: string;
  name: string;
  status: "pending" | "running" | "paused" | "completed";
  calliAgentId?: Types.ObjectId;
}

const batchSchema = new Schema<IBatch>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "running", "paused", "completed"],
      default: "pending",
    },
    calliAgentId: { type: Schema.Types.ObjectId, ref: "CalliAgent", default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        if (ret.calliAgentId) ret.calliAgentId = String(ret.calliAgentId);
      },
    },
  }
);

batchSchema.index({ userId: 1, status: 1 });

export const Batch = mongoose.models.Batch ?? mongoose.model<IBatch>("Batch", batchSchema);
