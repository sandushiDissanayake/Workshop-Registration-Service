import { Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../auth/roles';
import { CurrentUser } from '../auth/current-user';
import { AuthUser } from '../common/types';
import { DbService } from '../db/db.service';

class RegisterDto {
  @IsString() @MinLength(1) @MaxLength(120) attendeeName: string;
  @IsEmail() @MaxLength(254) attendeeEmail: string;
}

class CancelDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

class ListRegistrationsQuery {
  @IsOptional() @IsUUID() workshopId?: string;
  @IsOptional() @IsIn(['ACTIVE', 'CANCELLED']) status?: 'ACTIVE' | 'CANCELLED';
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}

const FROM = `
  FROM registrations r
  JOIN workshops w ON w.id = r.workshop_id
  JOIN users rb ON rb.id = r.registered_by
  LEFT JOIN users cb ON cb.id = r.cancelled_by`;

const SELECT = `SELECT r.*, w.code AS workshop_code, w.title AS workshop_title, w.starts_at AS workshop_starts_at,
  rb.name AS registered_by_name, cb.name AS cancelled_by_name ${FROM}`;

const toRegistration = (r: any) => ({
  id: r.id, workshopId: r.workshop_id, workshopCode: r.workshop_code, workshopTitle: r.workshop_title,
  workshopStartsAt: r.workshop_starts_at, attendeeName: r.attendee_name, attendeeEmail: r.attendee_email,
  status: r.status, registeredAt: r.registered_at, registeredBy: { id: r.registered_by, name: r.registered_by_name },
  cancelledAt: r.cancelled_at, cancelReason: r.cancel_reason,
  cancelledBy: r.cancelled_by ? { id: r.cancelled_by, name: r.cancelled_by_name } : null,
});

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => '\\' + m);

@ApiTags('registrations')
@ApiBearerAuth()
@Roles('MANAGER', 'STAFF')
@Controller()
export class RegistrationsController {
  constructor(private db: DbService) {}

  /** Full history (active + cancelled), newest first. */
  @Get('registrations')
  async history(@Query() q: ListRegistrationsQuery) {
    return this.search(q);
  }

  @Get('workshops/:id/registrations')
  async forWorkshop(@Param('id', ParseUUIDPipe) id: string, @Query() q: ListRegistrationsQuery) {
    return this.search({ ...q, workshopId: id, limit: q.limit ?? 200 });
  }

  private async search(q: ListRegistrationsQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);
    if (q.workshopId) where.push(`r.workshop_id = ${p(q.workshopId)}`);
    if (q.status) where.push(`r.status = ${p(q.status)}`);
    if (q.q) {
      const like = p(`%${escapeLike(q.q.trim())}%`);
      where.push(`(r.attendee_name ILIKE ${like} OR r.attendee_email ILIKE ${like} OR w.code ILIKE ${like} OR w.title ILIKE ${like})`);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = (await this.db.query(`SELECT count(*)::int AS n ${FROM} ${w}`, params)).rows[0].n;
    const limit = p(q.limit ?? 50);
    const offset = p(q.offset ?? 0);
    const { rows } = await this.db.query(`${SELECT} ${w} ORDER BY r.registered_at DESC, r.id LIMIT ${limit} OFFSET ${offset}`, params);
    return { total, items: rows.map(toRegistration) };
  }

  /**
   * Register an attendee. The workshop row is locked (FOR UPDATE) for the whole transaction, so concurrent
   * registrations/cancellations/capacity edits for the same workshop run one at a time. Capacity is checked
   * against the count taken *after* the lock is held, so it can never be exceeded.
   */
  @Post('workshops/:id/registrations')
  async register(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RegisterDto, @CurrentUser() user: AuthUser) {
    const regId = await this.db.tx(async (c) => {
      const w = (await c.query('SELECT id, status, capacity, ends_at FROM workshops WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (!w) throw new NotFoundException('Workshop not found');
      if (w.status !== 'SCHEDULED') {
        throw new ConflictException({ message: `Workshop is ${w.status.toLowerCase()} and not open for registration`, code: 'WORKSHOP_NOT_OPEN' });
      }
      if (new Date(w.ends_at) < new Date()) {
        throw new ConflictException({ message: 'Workshop has already ended', code: 'WORKSHOP_ENDED' });
      }
      const active = (await c.query(`SELECT count(*)::int AS n FROM registrations WHERE workshop_id = $1 AND status = 'ACTIVE'`, [id])).rows[0].n;
      if (active >= w.capacity) {
        throw new ConflictException({ message: 'Workshop is full', code: 'WORKSHOP_FULL' });
      }
      try {
        const { rows } = await c.query(
          'INSERT INTO registrations (workshop_id, attendee_name, attendee_email, registered_by) VALUES ($1,$2,$3,$4) RETURNING id',
          [id, dto.attendeeName.trim(), dto.attendeeEmail.toLowerCase(), user.id],
        );
        return rows[0].id as string;
      } catch (e: any) {
        if (e.code === '23505') {
          throw new ConflictException({ message: 'This email is already registered for the workshop', code: 'ALREADY_REGISTERED' });
        }
        throw e;
      }
    });
    return this.getOne(regId);
  }

  /**
   * Cancel a registration. Takes the same workshop lock as register(), always in the order workshop -> registration,
   * so it cannot deadlock with registrations. The row is kept; status, actor and timestamp are recorded.
   */
  @Post('registrations/:id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelDto, @CurrentUser() user: AuthUser) {
    await this.db.tx(async (c) => {
      const probe = (await c.query('SELECT workshop_id FROM registrations WHERE id = $1', [id])).rows[0];
      if (!probe) throw new NotFoundException('Registration not found');
      await c.query('SELECT id FROM workshops WHERE id = $1 FOR UPDATE', [probe.workshop_id]);
      const reg = (await c.query('SELECT status FROM registrations WHERE id = $1 FOR UPDATE', [id])).rows[0];
      if (reg.status === 'CANCELLED') {
        throw new ConflictException({ message: 'Registration is already cancelled', code: 'ALREADY_CANCELLED' });
      }
      await c.query(
        `UPDATE registrations SET status = 'CANCELLED', cancelled_by = $2, cancelled_at = now(), cancel_reason = $3 WHERE id = $1`,
        [id, user.id, dto.reason?.trim() || null],
      );
    });
    return this.getOne(id);
  }

  private async getOne(id: string) {
    const { rows } = await this.db.query(`${SELECT} WHERE r.id = $1`, [id]);
    return toRegistration(rows[0]);
  }
}
