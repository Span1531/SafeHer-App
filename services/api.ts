// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// use your computer's LAN IP (not localhost!)
const DEFAULT_BASE = "http://192.168.0.111:5000";
export const API_BASE = (process.env.BACKEND_URL as string) || DEFAULT_BASE;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ? (options.headers as Record<string, string>) : {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}