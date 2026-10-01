import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ResearchDoc = HydratedDocument<ResearchDocument>;

@Schema({ collection: 'research_documents', timestamps: true })
export class ResearchDocument {
  /** Links the document to a MySQL projects.id */
  @Prop({ required: true, index: true }) projectId: number;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) content: string;
  @Prop({ type: [String], default: [], index: true }) tags: string[];
  @Prop() uploadedBy: number;
  /** Schema-free: anything else (source URL, doc type, author, …) */
  @Prop({ type: Object }) metadata?: Record<string, unknown>;
}

export const ResearchSchema = SchemaFactory.createForClass(ResearchDocument);
ResearchSchema.index({ title: 'text', content: 'text' });
