import mongoose, { Schema, Document } from "mongoose";

export interface ICustomProperty {
  name: string;
  key: string;
  type: "string" | "number" | "boolean";
  createdAt: Date;
}

export interface ISettings extends Document {
  userId: string;
  apiKey?: string;
  operatorApiKey?: string;
  customProperties: ICustomProperty[];
  mockMode: boolean;
  concurrentAgents: number;
  workingHoursStart: number;
  workingHoursEnd: number;
  workingDays: number[];
}

const customPropertySchema = new Schema<ICustomProperty>({
  name: { type: String, required: true },
  key: { type: String, required: true },
  type: { type: String, enum: ["string", "number", "boolean"], required: true },
  createdAt: { type: Date, default: Date.now },
});

const settingsSchema = new Schema<ISettings>(
  {
    userId: { type: String, required: true, unique: true },
    apiKey: { type: String },
    operatorApiKey: { type: String },
    customProperties: { type: [customPropertySchema], default: [] },
    mockMode: { type: Boolean, default: true },
    concurrentAgents: { type: Number, default: 2, min: 1, max: 50 },
    workingHoursStart: { type: Number, default: 9, min: 0, max: 23 },
    workingHoursEnd: { type: Number, default: 17, min: 0, max: 23 },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc: unknown, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        if (Array.isArray(ret.customProperties)) {
          ret.customProperties = ret.customProperties.map(
            (cp: Record<string, unknown>) => {
              const { _id, ...rest } = cp;
              return { id: String(_id), ...rest };
            }
          );
        }
      },
    },
  }
);

export const Settings =
  mongoose.models.Settings ?? mongoose.model<ISettings>("Settings", settingsSchema);
