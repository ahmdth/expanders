import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/client.entity.js';
import { Project } from './project.entity.js';
import { ProjectPolicy } from './project.policy.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Client])],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectPolicy],
  exports: [ProjectsService],
})
export class ProjectsModule {}
