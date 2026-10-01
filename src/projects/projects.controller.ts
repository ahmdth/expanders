import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { AuthUser } from '../common/auth-user.js';
import { CreateProjectDto, UpdateProjectDto } from './project.dto.js';
import { ProjectsService } from './projects.service.js';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a project (clients: own; admins: pass clientId)',
  })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(u, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (clients: own; admins: all)' })
  findAll(@CurrentUser() u: AuthUser) {
    return this.projects.findAll(u);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { client, ...project } = await this.projects.findOneAuthorized(u, id);
    return project;
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(u, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.projects.remove(u, id);
  }
}
