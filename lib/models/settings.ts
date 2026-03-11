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
