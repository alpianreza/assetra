import { SanitizedUserDto } from '../auth/types';

export interface UserListResponse {
  items: SanitizedUserDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserRole {
  id: number;
  name: string;
}

export interface SanitizedUser {
  id: number;
  name: string;
  username: string;
  email: string;
  status: string;
  roles: UserRole[];
  createdAt: string;
}
