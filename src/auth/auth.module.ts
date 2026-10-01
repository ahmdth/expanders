import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/client.entity.js';
import { User } from '../users/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuth } from './jwt-auth.provider.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, Client])],
  controllers: [AuthController],
  providers: [AuthService, JwtAuth],
})
export class AuthModule {}
