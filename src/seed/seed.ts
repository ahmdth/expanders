import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { AuthService } from '../auth/auth.service.js';
import { Client } from '../clients/client.entity.js';
import { MatchesService } from '../matches/matches.service.js';
import { Project, ProjectStatus } from '../projects/project.entity.js';
import { ResearchDocument } from '../research/research.schema.js';
import { User } from '../users/user.entity.js';
import { Vendor } from '../vendors/vendor.entity.js';

const DEMO_PASSWORD = 'Password123!';
const day = 24 * 3600 * 1000;

const CLIENTS = [
  { companyName: 'Acme Robotics', email: 'acme@example.com' },
  { companyName: 'Nomad Foods', email: 'nomad@example.com' },
];

const VENDORS = [
  { name: 'Berlin Partners', countriesSupported: ['DE', 'AT'], servicesOffered: ['legal', 'logistics', 'hr'], rating: 4.5, responseSlaHours: 12, slaExpiresAt: new Date(Date.now() + 365 * day) },
  { name: 'Alpine Advisory', countriesSupported: ['DE', 'CH'], servicesOffered: ['legal', 'tax'], rating: 4.2, responseSlaHours: 24, slaExpiresAt: new Date(Date.now() + 200 * day) },
  { name: 'Nile Gateway', countriesSupported: ['EG', 'AE'], servicesOffered: ['logistics', 'legal', 'hr'], rating: 4.7, responseSlaHours: 12, slaExpiresAt: new Date(Date.now() + 300 * day) },
  { name: 'Gulf Setup', countriesSupported: ['AE', 'SA'], servicesOffered: ['legal', 'incorporation', 'hr'], rating: 4.0, responseSlaHours: 48, slaExpiresAt: new Date(Date.now() + 100 * day) },
  { name: 'Iberia Launch', countriesSupported: ['ES', 'PT'], servicesOffered: ['marketing', 'legal', 'logistics'], rating: 3.9, responseSlaHours: 36, slaExpiresAt: new Date(Date.now() + 150 * day) },
  // Deliberately lapsed: shows up flagged after the SLA job and is excluded from matching
  { name: 'Lapsed Logistics', countriesSupported: ['DE'], servicesOffered: ['logistics'], rating: 4.8, responseSlaHours: 6, slaExpiresAt: new Date(Date.now() - 30 * day) },
];

const PROJECTS = [
  { client: 'acme@example.com', country: 'DE', servicesNeeded: ['legal', 'hr'], budget: 50000, status: ProjectStatus.ACTIVE },
  { client: 'acme@example.com', country: 'AE', servicesNeeded: ['logistics', 'legal'], budget: 30000, status: ProjectStatus.DRAFT },
  { client: 'nomad@example.com', country: 'EG', servicesNeeded: ['logistics', 'hr'], budget: 42000, status: ProjectStatus.ACTIVE },
  { client: 'nomad@example.com', country: 'ES', servicesNeeded: ['marketing'], budget: 18000, status: ProjectStatus.ACTIVE },
];

const RESEARCH = [
  { country: 'DE', title: 'Germany market entry overview', content: 'Regulation, works councils and competitor landscape for robotics in Germany.', tags: ['market', 'regulation'] },
  { country: 'DE', title: 'German employment contract template', content: 'Standard employment contract clauses and notice periods.', tags: ['contract', 'hr'] },
  { country: 'EG', title: 'Egypt logistics and customs report', content: 'Port capacity, customs clearance timelines and free-zone incentives.', tags: ['market', 'logistics'] },
  { country: 'ES', title: 'Spain food retail insights', content: 'Retail channels, consumer trends and labelling requirements.', tags: ['market', 'report'] },
];

async function main() {
  const log = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const ds = app.get(DataSource);
    const auth = app.get(AuthService);
    const matches = app.get(MatchesService);
    const research = app.get<Model<ResearchDocument>>(getModelToken(ResearchDocument.name), { strict: false });

    // Admin is created by AuthService.onModuleInit (ADMIN_EMAIL / ADMIN_PASSWORD).

    // Clients + login users
    for (const c of CLIENTS) {
      try {
        await auth.register({ companyName: c.companyName, email: c.email, password: DEMO_PASSWORD });
        log.log(`client created: ${c.email}`);
      } catch (e) {
        if (!(e instanceof ConflictException)) throw e;
      }
    }

    // Vendors (idempotent by name)
    const vendorRepo = ds.getRepository(Vendor);
    for (const v of VENDORS) {
      if (await vendorRepo.exists({ where: { name: v.name } })) continue;
      await vendorRepo.save(vendorRepo.create({ ...v, slaExpired: v.slaExpiresAt < new Date() }));
      log.log(`vendor created: ${v.name}`);
    }

    // Projects (idempotent by client + country)
    const projectRepo = ds.getRepository(Project);
    const userRepo = ds.getRepository(User);
    const seeded: Project[] = [];
    for (const p of PROJECTS) {
      const user = await userRepo.findOneByOrFail({ email: p.client });
      let project = await projectRepo.findOne({ where: { clientId: user.clientId!, country: p.country }, relations: { client: true } });
      if (!project) {
        const { client: _c, ...fields } = p;
        project = await projectRepo.save(projectRepo.create({ ...fields, clientId: user.clientId! }));
        project.client = (await ds.getRepository(Client).findOneBy({ id: user.clientId! }))!;
        log.log(`project created: ${p.country} for ${p.client}`);
      }
      seeded.push(project);
    }

    // Research documents (idempotent by project + title)
    for (const r of RESEARCH) {
      const project = seeded.find((p) => p.country === r.country);
      if (!project) continue;
      const exists = await research.exists({ projectId: project.id, title: r.title });
      if (!exists) {
        await research.create({ projectId: project.id, title: r.title, content: r.content, tags: r.tags });
        log.log(`research doc created: ${r.title}`);
      }
    }

    // Matches for every active project (idempotent upsert; emails go to the mailer/MailHog)
    for (const p of seeded.filter((p) => p.status === ProjectStatus.ACTIVE)) {
      const r = await matches.rebuildForProject(p);
      log.log(`matches for project ${p.id} (${p.country}): ${r.total}`);
    }

    log.log(`Done. Demo logins → admin: ${process.env.ADMIN_EMAIL} | clients: acme@example.com, nomad@example.com (password: ${DEMO_PASSWORD})`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
