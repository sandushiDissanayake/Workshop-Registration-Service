import { SetMetadata } from '@nestjs/common';
import { Role } from '../common/types';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC = 'isPublic';
/** Every non-public route must declare the roles allowed; undeclared routes are denied. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(IS_PUBLIC, true);
