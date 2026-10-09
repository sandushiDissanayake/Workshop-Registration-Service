import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { Roles } from '../auth/roles';
import { CurrentUser } from '../auth/current-user';
import { AuthUser, Role } from '../common/types';
import { DbService } from '../db/db.service';

const ROLE_VALUES = ['ADMIN', 'MANAGER', 'STAFF'];
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,100}$/;
const PASSWORD_MSG = 'password must be 10-100 characters and include a letter and a number';

class CreateUserDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsIn(ROLE_VALUES) role: Role;
  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG }) password: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsIn(ROLE_VALUES) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Matches(PASSWORD_RULE, { message: PASSWORD_MSG }) password?: string;
}

const toUser = (r: any) => ({
  id: r.id, email: r.email, name: r.name, role: r.role, isActive: r.is_active, createdAt: r.created_at,
});

@ApiTags('users')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private db: DbService) {}

  @Get()
  async list() {
    const { rows } = await this.db.query('SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at');
    return rows.map(toUser);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, 12);
    try {
      const { rows } = await this.db.query(
        'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, is_active, created_at',
        [dto.email.toLowerCase(), dto.name.trim(), dto.role, hash],
      );
      return toUser(rows[0]);
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException({ message: 'A user with this email already exists', code: 'EMAIL_TAKEN' });
      throw e;
    }
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.db.tx(async (c) => {
      // Lock all admin rows so "last admin" checks are race-free.
      await c.query(`SELECT id FROM users WHERE role = 'ADMIN' FOR UPDATE`);
      const cur = (await c.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!cur) throw new NotFoundException('User not found');

      const newRole = dto.role ?? cur.role;
      const newActive = dto.isActive ?? cur.is_active;
      if (id === actor.id && (newRole !== 'ADMIN' || !newActive)) {
        throw new BadRequestException({ message: 'You cannot demote or deactivate your own account', code: 'SELF_LOCKOUT' });
      }
      if (cur.role === 'ADMIN' && cur.is_active && (newRole !== 'ADMIN' || !newActive)) {
        const { rows } = await c.query(`SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND is_active AND id <> $1`, [id]);
        if (rows[0].n === 0) throw new BadRequestException({ message: 'At least one active Admin must remain', code: 'LAST_ADMIN' });
      }
      const hash = dto.password ? await bcrypt.hash(dto.password, 12) : cur.password_hash;
      const { rows } = await c.query(
        `UPDATE users SET name = $2, role = $3, is_active = $4, password_hash = $5, updated_at = now()
         WHERE id = $1 RETURNING id, email, name, role, is_active, created_at`,
        [id, dto.name?.trim() ?? cur.name, newRole, newActive, hash],
      );
      return toUser(rows[0]);
    });
  }
}
