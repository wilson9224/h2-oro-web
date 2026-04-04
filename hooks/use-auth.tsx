'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  permissions: { module: string; action: string }[];
  preferredLang: string;
  preferredCurr: string;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEMO_USER: UserProfile = {
  id: 'demo-admin-id',
  email: 'admin@h2oro.demo',
  firstName: 'Admin',
  lastName: 'Demo',
  phone: null,
  role: 'admin',
  permissions: [],
  preferredLang: 'es',
  preferredCurr: 'COP',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      // Get the Supabase auth user to obtain supabase_auth_id
      const { data: { user: authUser } } = await supabase.auth.getUser(accessToken);
      if (!authUser) throw new Error('No auth user');

      // Query the users table directly via Supabase
      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone,
          preferred_lang,
          preferred_curr,
          roles (
            name,
            role_permissions (
              permissions ( module, action )
            )
          )
        `)
        .eq('supabase_auth_id', authUser.id)
        .is('deleted_at', null)
        .single();

      if (dbError || !dbUser) throw new Error('Profile not found');

      const role = Array.isArray(dbUser.roles) ? dbUser.roles[0] : dbUser.roles;
      const permissions = (role?.role_permissions || []).map((rp: { permissions: { module: string; action: string }[] }) => {
        const perm = Array.isArray(rp.permissions) ? rp.permissions[0] : rp.permissions;
        return { module: perm.module, action: perm.action };
      });

      const profile: UserProfile = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.first_name,
        lastName: dbUser.last_name,
        phone: dbUser.phone,
        role: role?.name || 'client',
        permissions,
        preferredLang: dbUser.preferred_lang,
        preferredCurr: dbUser.preferred_curr,
      };

      setUser(profile);
      setToken(accessToken);
      return profile;
    } catch {
      setUser(null);
      setToken(null);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setToken('demo-token');
      setLoading(false);
      return;
    }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetchProfile(session.access_token);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.access_token) {
          await fetchProfile(session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setToken(null);
        }
      },
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setToken('demo-token');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.access_token) {
      const profile = await fetchProfile(data.session.access_token);
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Usuario no registrado en el sistema. Contacte al administrador.');
      }
    }
  };

  const signUp = async (data: SignUpData) => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setToken('demo-token');
      return;
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('No se pudo crear la cuenta.');

    const supabaseAuthId = authData.user.id;

    // 2. Get the 'client' role ID
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'client')
      .single();
    if (roleError || !role) throw new Error('Error de configuración: rol de cliente no encontrado.');

    // 3. Insert user row in our users table
    const { error: insertError } = await supabase.from('users').insert({
      supabase_auth_id: supabaseAuthId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone || null,
      role_id: role.id,
    });
    if (insertError) throw new Error(insertError.message);

    // 4. Auto sign-in if session is available
    if (authData.session?.access_token) {
      await fetchProfile(authData.session.access_token);
    }
  };

  const signOut = async () => {
    if (!DEMO_MODE) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setToken(null);
    router.push('/');
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetchProfile(session.access_token);
    }
  };

  const hasPermission = (module: string, action: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.some((p) => p.module === module && p.action === action);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, signIn, signUp, signOut, refreshProfile, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
