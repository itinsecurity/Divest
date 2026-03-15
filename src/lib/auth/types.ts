export interface AuthProvider {
  getSession(): Promise<{ user: { id: string; name?: string | null } } | null>;
  signIn(provider?: string): Promise<void>;
  signOut(): Promise<void>;
}
