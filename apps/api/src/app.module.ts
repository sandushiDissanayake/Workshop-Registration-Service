import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DbModule } from './db/db.module';
import { RegistrationsController } from './registrations/registrations.controller';
import { UsersController } from './users/users.controller';
import { WorkshopsController } from './workshops/workshops.controller';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [UsersController, WorkshopsController, RegistrationsController],
})
export class AppModule {}
