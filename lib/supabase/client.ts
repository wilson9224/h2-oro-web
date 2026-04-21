import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
  );
}

// Cliente con permisos de servicio para operaciones administrativas
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY no está configurado. Usando cliente anónimo.');
    return createClient();
  }

  return createBrowserClient(
    supabaseUrl,
    serviceRoleKey,
  );
}
