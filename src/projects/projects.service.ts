import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationService } from '@nestjs/authorization';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user.js';
import { Role } from '../common/role.enum.js';
import { CreateProjectDto, UpdateProjectDto } from './project.dto.js';
import { ProjectPolicy } from './project.policy.js';
import { Project, ProjectStatus } from './project.entity.js';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private repo: Repository<Project>,
    private authz: AuthorizationService,
  ) {}

  async create(user: AuthUser, dto: CreateProjectDto) {
    const clientId = user.role === Role.ADMIN ? dto.clientId : user.clientId;
    if (!clientId)
      throw new ForbiddenException(
        'clientId is required when creating a project as admin',
      );
    const { clientId: _ignored, ...rest } = dto;
    return this.repo.save(
      this.repo.create({
        ...rest,
        clientId,
        status: dto.status ?? ProjectStatus.DRAFT,
      }),
    );
  }

  async findAll(user: AuthUser) {
    const all = await this.authz.can(ProjectPolicy, 'viewAll', user);
    return this.repo.find({
      where: all ? {} : { clientId: user.clientId! },
      order: { id: 'DESC' },
    });
  }

  /** Loads a project and enforces "clients only touch their own projects". */
  async findOneAuthorized(user: AuthUser, id: number) {
    const project = await this.repo.findOne({
      where: { id },
      relations: { client: true },
    });
    // 404 (not 403) for other clients' projects so ids can't be probed
    if (
      !project ||
      !(await this.authz.can(ProjectPolicy, 'access', user, project))
    ) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    return project;
  }

  async update(user: AuthUser, id: number, dto: UpdateProjectDto) {
    const project = await this.findOneAuthorized(user, id);
    const { clientId: _ignored, ...rest } = dto;
    Object.assign(project, rest);
    delete project.client;
    return this.repo.save(project);
  }

  async remove(user: AuthUser, id: number) {
    const project = await this.findOneAuthorized(user, id);
    await this.repo.delete(project.id);
    return { deleted: true };
  }

  /** Ids of projects a user may see (used to scope MongoDB research queries). */
  async accessibleIds(user: AuthUser): Promise<number[] | null> {
    if (await this.authz.can(ProjectPolicy, 'viewAll', user)) return null; // null = unrestricted
    const rows = await this.repo.find({
      select: { id: true },
      where: { clientId: user.clientId! },
    });
    return rows.map((r) => r.id);
  }

  findActive() {
    return this.repo.find({
      where: { status: ProjectStatus.ACTIVE },
      relations: { client: true },
    });
  }
}
