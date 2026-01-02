export interface AuthResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
  };
  message: string;
  accessToken: string;
  refreshToken?: string; // Solo se incluye en login/register, no en refresh
}
