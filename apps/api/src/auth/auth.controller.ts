import { Body, Controller, Get, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { AuthUser } from '../common/types';
import { CurrentUser } from './current-user';
import { Public, Roles } from './roles';

class LoginDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(1) @MaxLength(200) password: string;
}

// Used to keep response time similar for unknown emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private db: DbService, private jwt: JwtService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const { rows } = await this.db.query(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1',
      [dto.email.toLowerCase()],
    );
    const u = rows[0];
    const ok = await bcrypt.compare(dto.password, u?.password_hash ?? DUMMY_HASH);
    if (!u || !ok || !u.is_active) throw new UnauthorizedException('Invalid email or password');
    const accessToken = await this.jwt.signAsync({ sub: u.id, role: u.role });
    return { accessToken, user: { id: u.id, email: u.email, name: u.name, role: u.role } };
  }

  @ApiBearerAuth()
  @Roles('ADMIN', 'MANAGER', 'STAFF')
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
