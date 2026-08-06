export interface SanitizedUserDto {
  id: number;
  name: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}
