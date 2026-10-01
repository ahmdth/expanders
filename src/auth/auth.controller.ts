import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@nestjs/authentication';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a client company + user (role: client)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in (clients and admins) and receive a JWT' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
