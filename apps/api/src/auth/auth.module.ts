import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../config';
import { AuthController } from './auth.controller';
import { JwtAuthGuard, RolesGuard } from './guards';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (c: AppConfig) => ({ secret: c.jwtSecret, signOptions: { expiresIn: c.jwtExpiresIn as any, algorithm: 'HS256' } }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
