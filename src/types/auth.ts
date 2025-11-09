// src/types/auth.ts

export interface User {
    id: string;
    email: string;
    fullName?: string;
    roles?: string[];
  }
  
  export interface AuthResponse {
    token: string;
    user: User;
  }
  
  export interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => void;
  }
  