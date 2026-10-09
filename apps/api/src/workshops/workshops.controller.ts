import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../auth/roles';
import { CurrentUser } from '../auth/current-user';
import { AuthUser } from '../common/types';
import { DbService } from '../db/db.service';

const STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

class CreateWorkshopDto {
  @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'code must be 2-20 letters, digits or hyphens' }) code: string;
  @IsString() @MinLength(1) @MaxLength(150) title: string;
  @IsString() @MinLength(1) @MaxLength(100) instructor: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() @MinLength(1) @MaxLength(100) location: string;
  @IsISO8601() startsAt: string;
  @IsISO8601() endsAt: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000) capacity: number;
  @IsOptional() @IsIn(STATUSES) status?: string;
}

class UpdateWorkshopDto {
  @IsOptional() @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'code must be 2-20 letters, digits or hyphens' }) code?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(150) title?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) instructor?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) location?: string;
  @IsOptional() @IsISO8601() startsAt?: string;
  @IsOptional() @IsISO8601() endsAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) capacity?: number;
  @IsOptional() @IsIn(STATUSES) status?: string;
}

class ListWorkshopsQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(STATUSES) status?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsIn(['available', 'full']) availability?: 'available' | 'full';
}

// Active registrations are counted live from the registrations table (the source of truth).
const SELECT_WORKSHOP = `
  SELECT w.*, COALESCE(r.active, 0)::int AS active_count, u.name AS created_by_name
  FROM workshops w
  LEFT JOIN (SELECT workshop_id, count(*) AS active FROM registrations WHERE status = 'ACTIVE' GROUP BY workshop_id) r
    ON r.workshop_id = w.id
  JOIN users u ON u.id = w.created_by`;

export const toWorkshop = (r: any) => ({
  id: r.id, code: r.code, title: r.title, instructor: r.instructor, description: r.description,
  location: r.location, startsAt: r.starts_at, endsAt: r.ends_at, capacity: r.capacity, status: r.status,
  activeRegistrations: r.active_count, seatsAvailable: Math.max(r.capacity - r.active_count, 0),
  createdByName: r.created_by_name, createdAt: r.created_at, updatedAt: r.updated_at,
});

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => '\\' + m);

@ApiTags('workshops')
@ApiBearerAuth()
@Controller('workshops')
export class WorkshopsController {
  constructor(private db: DbService) {}

  @Roles('MANAGER', 'STAFF')
  @Get()
  async list(@Query() q: ListWorkshopsQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    if (q.q) {
      const like = p(`%${escapeLike(q.q.trim())}%`);
      where.push(`(w.code ILIKE ${like} OR w.title ILIKE ${like} OR w.instructor ILIKE ${like})`);
    }
    if (q.status) where.push(`w.status = ${p(q.status)}`);
    if (q.from) where.push(`w.starts_at >= ${p(q.from)}`);
    if (q.to) where.push(`w.starts_at < ${p(q.to)}`);
    if (q.availability === 'available') where.push(`w.status = 'SCHEDULED' AND w.capacity - COALESCE(r.active, 0) > 0`);
    if (q.availability === 'full') where.push(`w.capacity - COALESCE(r.active, 0) <= 0`);
    const sql = `${SELECT_WORKSHOP} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY w.starts_at ASC LIMIT 500`;
    const { rows } = await this.db.query(sql, params);
    return rows.map(toWorkshop);
  }

  @Roles('MANAGER', 'STAFF')
  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const { rows } = await this.db.query(`${SELECT_WORKSHOP} WHERE w.id = $1`, [id]);
    if (!rows[0]) throw new NotFoundException('Workshop not found');
    return toWorkshop(rows[0]);
  }

  @Roles('MANAGER')
  @Post()
  async create(@Body() dto: CreateWorkshopDto, @CurrentUser() user: AuthUser) {
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException({ message: 'endsAt must be after startsAt', code: 'INVALID_TIME_RANGE' });
    }
    try {
      const { rows } = await this.db.query(
        `INSERT INTO workshops (code, title, instructor, description, location, starts_at, ends_at, capacity, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [dto.code.toUpperCase(), dto.title.trim(), dto.instructor.trim(), dto.description?.trim() || null, dto.location.trim(),
         dto.startsAt, dto.endsAt, dto.capacity, dto.status ?? 'SCHEDULED', user.id],
      );
      return this.get(rows[0].id);
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException({ message: 'A workshop with this code already exists', code: 'CODE_TAKEN' });
      throw e;
    }
  }

  @Roles('MANAGER')
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkshopDto) {
    try {
      await this.db.tx(async (c) => {
        // Same lock as register/cancel: capacity edits serialise with registrations.
        const cur = (await c.query('SELECT * FROM workshops WHERE id = $1 FOR UPDATE', [id])).rows[0];
        if (!cur) throw new NotFoundException('Workshop not found');
        const next = {
          code: (dto.code ?? cur.code).toUpperCase(),
          title: dto.title?.trim() ?? cur.title,
          instructor: dto.instructor?.trim() ?? cur.instructor,
          description: dto.description !== undefined ? dto.description.trim() || null : cur.description,
          location: dto.location?.trim() ?? cur.location,
          startsAt: dto.startsAt ?? cur.starts_at,
          endsAt: dto.endsAt ?? cur.ends_at,
          capacity: dto.capacity ?? cur.capacity,
          status: dto.status ?? cur.status,
        };
        if (new Date(next.endsAt) <= new Date(next.startsAt)) {
          throw new BadRequestException({ message: 'endsAt must be after startsAt', code: 'INVALID_TIME_RANGE' });
        }
        const { rows } = await c.query(`SELECT count(*)::int AS n FROM registrations WHERE workshop_id = $1 AND status = 'ACTIVE'`, [id]);
        if (next.capacity < rows[0].n) {
          throw new ConflictException({
            message: `Capacity cannot be lower than the ${rows[0].n} active registrations`,
            code: 'CAPACITY_BELOW_ACTIVE',
          });
        }
        await c.query(
          `UPDATE workshops SET code=$2, title=$3, instructor=$4, description=$5, location=$6, starts_at=$7, ends_at=$8,
             capacity=$9, status=$10, updated_at=now() WHERE id=$1`,
          [id, next.code, next.title, next.instructor, next.description, next.location, next.startsAt, next.endsAt, next.capacity, next.status],
        );
      });
    } catch (e: any) {
      if (e.code === '23505') throw new ConflictException({ message: 'A workshop with this code already exists', code: 'CODE_TAKEN' });
      throw e;
    }
    return this.get(id);
  }
}
