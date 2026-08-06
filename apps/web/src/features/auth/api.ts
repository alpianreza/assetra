import { SanitizedUserDto } from './types';
import { apiRequest } from '../../lib/api-helper';

export function login(credentials: { identifier: string; password: string }): Promise<SanitizedUserDto> {
  return apiRequest<SanitizedUserDto>('/auth/login', { method: 'POST', body: credentials });
}

export function fetchMe(): Promise<SanitizedUserDto> {
  return apiRequest<SanitizedUserDto>('/auth/me');
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}
