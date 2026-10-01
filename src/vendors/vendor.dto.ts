import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { NormalizeList } from '../common/transformers.js';

export class CreateVendorDto {
  @ApiProperty({ example: 'Berlin Expansion Partners' }) @IsString() name: string;
  @ApiProperty({ example: ['DE', 'AT'] })
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) @NormalizeList(true) countriesSupported: string[];
  @ApiProperty({ example: ['legal', 'logistics', 'hr'] })
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) @NormalizeList() servicesOffered: string[];
  @ApiProperty({ example: 4.6, minimum: 0, maximum: 5 }) @IsNumber() @Min(0) @Max(5) rating: number;
  @ApiProperty({ example: 24 }) @IsInt() @Min(1) responseSlaHours: number;
  @ApiPropertyOptional({ example: '2027-01-01T00:00:00Z', description: 'When the vendor SLA agreement lapses' })
  @IsOptional() @IsDateString() slaExpiresAt?: string;
}
export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
