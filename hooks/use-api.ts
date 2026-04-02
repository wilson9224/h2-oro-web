'use client';

import { useAuth } from './use-auth';
import { resolveDemoData } from '@/lib/demo-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function useApi() {
  const { token } = useAuth();

  const headers = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const get = async <T>(endpoint: string): Promise<T> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return resolveDemoData(endpoint) as T;
    }
    const res = await fetch(`${API_URL}${endpoint}`, { headers: headers() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const post = async <T>(endpoint: string, body?: unknown): Promise<T> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return {} as T;
    }
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const patch = async <T>(endpoint: string, body: unknown): Promise<T> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return {} as T;
    }
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const del = async <T>(endpoint: string): Promise<T> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return {} as T;
    }
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const getBlob = async (endpoint: string): Promise<Blob> => {
    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 300));
      return new Blob(['Demo report'], { type: 'application/octet-stream' });
    }
    const res = await fetch(`${API_URL}${endpoint}`, { headers: headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
  };

  return { get, post, patch, del, getBlob };
}
