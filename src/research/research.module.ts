import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from '../projects/projects.module.js';
import { ResearchController } from './research.controller.js';
import { ResearchSchema, ResearchDocument } from './research.schema.js';
import { ResearchService } from './research.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: ResearchDocument.name, schema: ResearchSchema }]), ProjectsModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
