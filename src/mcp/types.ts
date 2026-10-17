export type UserRole = 'admin' | 'telefonista' | 'venditore';

export interface McpUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  services: string[];
}

export interface McpOAuthClient {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  client_name: string;
  createdAt: string;
}

export interface McpOAuthCode {
  code: string;
  client_id: string;
  colleagueId: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  expiresAt: string;
  usedAt?: string | null;
}

export interface McpOAuthToken {
  token: string;
  refreshToken: string;
  client_id: string;
  colleagueId: string;
  scope: string;
  createdAt: string;
  expiresAt: string;
}

