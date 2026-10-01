import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { NormalizeCountry, NormalizeList } from '../common/transformers.js';
import { ProjectStatus } from './project.entity.js';

export class CreateProjectDto {
  @ApiPropertyOptional({ description: 'Admins only: client that owns the project. Ignored for clients.' })
  @IsOptional() @IsInt() clientId?: number;
  @ApiProperty({ example: 'DE', description: 'Country code/name (stored upper-case)' })
  @IsString() @NormalizeCountry() country: string;
  @ApiProperty({ example: ['legal', 'logistics'], description: 'Stored lower-case' })
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) @NormalizeList() servicesNeeded: string[];
  @ApiProperty({ example: 50000 }) @IsNumber() @Min(0) budget: number;
  @ApiPropertyOptional({ enum: ProjectStatus }) @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
