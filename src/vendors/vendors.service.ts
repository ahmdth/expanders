import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateVendorDto, UpdateVendorDto } from './vendor.dto.js';
import { Vendor } from './vendor.entity.js';

@Injectable()
export class VendorsService {
  constructor(@InjectRepository(Vendor) private repo: Repository<Vendor>) {}

  private toEntity(dto: Partial<CreateVendorDto>) {
    const { slaExpiresAt, ...rest } = dto;
    return {
      ...rest,
      ...(slaExpiresAt !== undefined
        ? { slaExpiresAt: new Date(slaExpiresAt) }
        : {}),
    };
  }

  create(dto: CreateVendorDto) {
    const v = this.repo.create(this.toEntity(dto));
    v.slaExpired = !!v.slaExpiresAt && v.slaExpiresAt < new Date();
    return this.repo.save(v);
  }
  findAll() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findOne(id: number) {
    const v = await this.repo.findOne({ where: { id } });
    if (!v) throw new NotFoundException(`Vendor ${id} not found`);
    return v;
  }
  async update(id: number, dto: UpdateVendorDto) {
    const v = await this.findOne(id);
    Object.assign(v, this.toEntity(dto));
    if (dto.slaExpiresAt !== undefined)
      v.slaExpired = !!v.slaExpiresAt && v.slaExpiresAt < new Date();
    return this.repo.save(v);
  }
  async remove(id: number) {
    await this.findOne(id);
    await this.repo.delete(id);
    return { deleted: true };
  }

  /** Scheduler: flag vendors whose SLA lapsed, un-flag ones that were renewed. */
  async syncSlaFlags() {
    const now = new Date();
    const flagged = await this.repo.update(
      { slaExpired: false, slaExpiresAt: LessThan(now) },
      { slaExpired: true },
    );
    const cleared = await this.repo
      .createQueryBuilder()
      .update(Vendor)
      .set({ slaExpired: false })
      .where(
        'sla_expired = true AND (sla_expires_at IS NULL OR sla_expires_at >= :now)',
        { now },
      )
      .execute();
    return { flagged: flagged.affected ?? 0, cleared: cleared.affected ?? 0 };
  }
}
