export interface User {
  id: string;
  phoneNumber: string;
  isVerified: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OTPResult {
  success: boolean;
  verificationId?: string;
  error?: string;
}