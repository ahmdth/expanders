import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { AuthUser } from '../common/auth-user.js';
import { ProjectsService } from '../projects/projects.service.js';
import { SearchResearchDto, UploadResearchDto } from './research.dto.js';
import { ResearchDocument } from './research.schema.js';

@Injectable()
export class ResearchService {
  constructor(
    @InjectModel(ResearchDocument.name) private model: Model<ResearchDocument>,
    private projects: ProjectsService,
  ) {}

  async upload(user: AuthUser, dto: UploadResearchDto) {
    await this.projects.findOneAuthorized(user, dto.projectId); // 404 if not yours
    return this.model.create({
      ...dto,
      tags: dto.tags ?? [],
      uploadedBy: user.userId,
    });
  }

  async search(user: AuthUser, q: SearchResearchDto) {
    const filter: QueryFilter<ResearchDocument> = {};
    if (q.projectId !== undefined) {
      await this.projects.findOneAuthorized(user, q.projectId);
      filter.projectId = q.projectId;
    } else {
      const ids = await this.projects.accessibleIds(user); // clients only see their own projects' docs
      if (ids) filter.projectId = { $in: ids };
    }
    if (q.tag) filter.tags = q.tag.trim().toLowerCase();
    if (q.q) filter.$text = { $search: q.q };

    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const query = this.model.find(
      filter,
      q.q ? { score: { $meta: 'textScore' } } : undefined,
    );
    query.sort(q.q ? { score: { $meta: 'textScore' } } : { createdAt: -1 });
    const [items, total] = await Promise.all([
      query
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { total, page, limit, items };
  }

  /** Used by analytics: document counts grouped by projectId. */
  async countByProject(projectIds: number[]): Promise<Map<number, number>> {
    if (!projectIds.length) return new Map();
    const rows = await this.model.aggregate<{ _id: number; n: number }>([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$projectId', n: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id, r.n]));
  }
}
