import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { AuthUser } from '../common/auth-user.js';
import { SearchResearchDto, UploadResearchDto } from './research.dto.js';
import { ResearchService } from './research.service.js';

@ApiTags('Research documents (MongoDB)')
@ApiBearerAuth()
@Controller('research')
export class ResearchController {
  constructor(private research: ResearchService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a research document linked to a project' })
  upload(@CurrentUser() u: AuthUser, @Body() dto: UploadResearchDto) {
    return this.research.upload(u, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search documents by project, tag and/or full text' })
  search(@CurrentUser() u: AuthUser, @Query() q: SearchResearchDto) {
    return this.research.search(u, q);
  }
}
