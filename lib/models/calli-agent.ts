import mongoose, { Schema, Document } from "mongoose";

export interface IPropertyMapping {
  contactField: string;
  apiVariable: string;
}

export interface ICalliAgent extends Document {
  userId: string;
  name: string;
  agentId: string;
  agentPhoneNumberId: string;
  isDefault: boolean;
  propertyMappings: IPropertyMapping[];
}

const propertyMappingSchema = new Schema<IPropertyMapping>(
  {
    contactField: { type: String, required: true },
    apiVariable: { type: String, required: true },
  },
  { _id: false }
);

const calliAgentSchema = new Schema<ICalliAgent>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    agentId: { type: String, required: true, trim: true },
    agentPhoneNumberId: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    propertyMappings: { type: [propertyMappingSchema], default: [] },
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

calliAgentSchema.index({ userId: 1, isDefault: 1 });

export const CalliAgent =
  mongoose.models.CalliAgent ?? mongoose.model<ICalliAgent>("CalliAgent", calliAgentSchema);
