import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { NormalizeList } from '../common/transformers.js';

export class UploadResearchDto {
  @ApiProperty({ description: 'MySQL project id this document belongs to' })
  @IsInt()
  projectId: number;
  @ApiProperty({ example: 'Germany market entry report' })
  @IsString()
  title: string;
  @ApiProperty({ example: 'Key regulations, competitors, pricing…' })
  @IsString()
  content: string;
  @ApiPropertyOptional({ example: ['market', 'regulation'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @NormalizeList()
  tags?: string[];
  @ApiPropertyOptional({ description: 'Free-form extra fields' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SearchResearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  projectId?: number;
  @ApiPropertyOptional({ example: 'market' })
  @IsOptional()
  @IsString()
  tag?: string;
  @ApiPropertyOptional({ description: 'Full-text search over title + content' })
  @IsOptional()
  @IsString()
  q?: string;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
