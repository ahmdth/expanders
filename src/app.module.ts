import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { MailModule } from '@nestjs/mail';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AuthModule } from './auth/auth.module.js';
import { buildJwtOptions } from './auth/jwt-options.js';
import { MatchesModule } from './matches/matches.module.js';
import { mailTransport } from './notifications/mail-transport.js';
import { AdminPolicy } from './policies/admin.policy.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ResearchModule } from './research/research.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { VendorsModule } from './vendors/vendors.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'mysql' as const,
        host: c.get<string>('MYSQL_HOST') ?? 'localhost',
        port: Number(c.get<string>('MYSQL_PORT') ?? 3306),
        username: c.get<string>('MYSQL_USER'),
        password: c.get<string>('MYSQL_PASSWORD') as string | undefined,
        database: c.get<string>('MYSQL_DATABASE') as string | undefined,
        autoLoadEntities: true,
        synchronize: (c.get<string>('DB_SYNCHRONIZE') ?? 'true') === 'true',
        timezone: 'Z',
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ uri: c.getOrThrow<string>('MONGO_URI') }),
    }),
    ScheduleModule.forRoot(),
    // Authentication FIRST: its global guard must set request.user before authorization's guard reads it.
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ accessToken: buildJwtOptions(c) }),
    }),
    AuthorizationModule.forRoot({ policies: [AdminPolicy] }),
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        transport: mailTransport(c),
        from: c.get<string>('MAIL_FROM') ?? 'Expanders360 <no-reply@expanders360.com>',
      }),
    }),
    AuthModule,
    ProjectsModule,
    VendorsModule,
    MatchesModule,
    ResearchModule,
    AnalyticsModule,
    SettingsModule,
    SchedulerModule,
  ],
})
export class AppModule {}
