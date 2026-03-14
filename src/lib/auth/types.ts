export interface AuthProvider {
  getSession(): Promise<{ user: { id: string; name?: string | null } } | null>;
  signIn(credentials: { username: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
}
