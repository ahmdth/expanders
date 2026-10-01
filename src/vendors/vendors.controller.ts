import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Can } from '@nestjs/authorization';
import { AdminPolicy } from '../policies/admin.policy.js';
import { CreateVendorDto, UpdateVendorDto } from './vendor.dto.js';
import { VendorsService } from './vendors.service.js';

@ApiTags('Vendors (admin)')
@ApiBearerAuth()
@Can(AdminPolicy, 'manage')
@Controller('vendors')
export class VendorsController {
  constructor(private vendors: VendorsService) {}
  @Post() create(@Body() dto: CreateVendorDto) { return this.vendors.create(dto); }
  @Get() findAll() { return this.vendors.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.vendors.findOne(id); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorDto) { return this.vendors.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.vendors.remove(id); }
}
