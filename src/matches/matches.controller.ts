import { Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { AuthUser } from '../common/auth-user.js';
import { MatchesService } from './matches.service.js';

@ApiTags('Matches')
@ApiBearerAuth()
@Controller('projects/:id/matches')
export class MatchesController {
  constructor(private matches: MatchesService) {}

  @Post('rebuild')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rebuild vendor matches for a project (idempotent upsert)' })
  rebuild(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.matches.rebuildForUser(u, id);
  }

  @Get()
  @ApiOperation({ summary: 'List stored matches for a project, best score first' })
  list(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.matches.list(u, id);
  }
}
