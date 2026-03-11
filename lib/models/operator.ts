import mongoose, { Schema, Document } from "mongoose";

export interface IOperator extends Document {
  userId: string;
  available: boolean;
  locked: boolean;
  lockedBy?: string; // conversation ID (e.g. conv_xxx) or "manual" for manual lock
  lockedAt?: Date; // when the lock was acquired
}

const operatorSchema = new Schema<IOperator>(
  {
    userId: { type: String, required: true, unique: true },
    available: { type: Boolean, default: true },
    locked: { type: Boolean, default: false },
    lockedBy: { type: String, default: null },
    lockedAt: { type: Date, default: null },
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

export const Operator =
  mongoose.models.Operator ?? mongoose.model<IOperator>("Operator", operatorSchema);
