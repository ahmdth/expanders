import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Acme Robotics' }) @IsString() @MinLength(2) companyName: string;
  @ApiProperty({ example: 'founder@acme.io', description: 'Used for login and as the client contact email' })
  @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'founder@acme.io' }) @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}
