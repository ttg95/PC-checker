import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase, supabaseProjectUrl, type ExclusionRow, type ProfileRow } from './supabase';

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'master' | 'standard';
  credits: number | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Exclusion {
  id: string;
  term: string;
  createdAt: string;
  createdBy: string;
}

interface CreateAccountInput {
  email: string;
  password: string;
  initialCredits?: number;
}

interface AccountContextValue {
  accounts: Account[];
  activeAccount: Account | null;
  exclusions: Exclusion[];
  isAccountLoading: boolean;
  isSupabaseBacked: boolean;
  supabaseProjectUrl: string;
  refreshAccountLink: () => Promise<void>;
  createAccount: (input: CreateAccountInput) => Promise<Account>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  addCredits: (accountId: string, amount: number) => Promise<void>;
  setCredits: (accountId: string, amount: number) => Promise<void>;
  addExclusion: (term: string) => Promise<void>;
  removeExclusion: (id: string) => Promise<void>;
  consumeScanCredit: () => Promise<{ ok: boolean; message?: string }>;
  canRunScan: boolean;
  creditLabel: string;
}

const STORAGE_KEY = 'pc-checker-accounts-v1';
const ACTIVE_KEY = 'pc-checker-active-account-v1';
const EXCLUSIONS_KEY = 'pc-checker-exclusions-v1';

const AccountContext = createContext<AccountContextValue | null>(null);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const source = `${salt}:${password}`;
  if (crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }

  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = Math.imul(31, hash) + source.charCodeAt(i) | 0;
  }
  return String(hash);
}

function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Account[] : [];
  } catch {
    return [];
  }
}

function loadExclusions(): Exclusion[] {
  try {
    const raw = localStorage.getItem(EXCLUSIONS_KEY);
    return raw ? JSON.parse(raw) as Exclusion[] : [];
  } catch {
    return [];
  }
}

function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function fromProfile(row: ProfileRow): Account {
  return {
    id: row.id,
    email: row.email,
    passwordHash: '',
    salt: '',
    role: row.role,
    credits: row.credits,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function fromExclusion(row: ExclusionRow): Exclusion {
  return {
    id: row.id,
    term: row.term,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccountsState] = useState<Account[]>(() => isSupabaseConfigured ? [] : loadAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => isSupabaseConfigured ? null : loadActiveId());
  const [exclusions, setExclusionsState] = useState<Exclusion[]>(() => isSupabaseConfigured ? [] : loadExclusions());
  const [isAccountLoading, setIsAccountLoading] = useState(isSupabaseConfigured);

  const persistLocalAccounts = (next: Account[]) => {
    setAccountsState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setActiveId = (id: string | null) => {
    setActiveAccountId(id);
    if (!isSupabaseConfigured) {
      if (id) {
        localStorage.setItem(ACTIVE_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    }
  };

  const persistLocalExclusions = (next: Exclusion[]) => {
    setExclusionsState(next);
    localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(next));
  };

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === activeAccountId) || null,
    [accounts, activeAccountId],
  );

  const refreshSupabaseState = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;

    setIsAccountLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setAccountsState([]);
        setActiveId(null);
        setExclusionsState([]);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (profileError || !profile) {
        setAccountsState([]);
        setActiveId(null);
        setExclusionsState([]);
        return;
      }

      const activeProfile = fromProfile(profile as ProfileRow);
      if (activeProfile.role === 'master') {
        const { data: profileRows, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });
        if (profilesError) throw profilesError;
        setAccountsState((profileRows as ProfileRow[]).map(fromProfile));
      } else {
        setAccountsState([activeProfile]);
      }

      const { data: exclusionRows, error: exclusionsError } = await supabase
        .from('account_exclusions')
        .select('*')
        .order('created_at', { ascending: false });
      if (exclusionsError) throw exclusionsError;

      setExclusionsState((exclusionRows as ExclusionRow[]).map(fromExclusion));
      setActiveId(activeProfile.id);
    } finally {
      setIsAccountLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    void refreshSupabaseState();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshSupabaseState();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [refreshSupabaseState]);

  const createLocalAccount = async ({ email, password, initialCredits = 0 }: CreateAccountInput) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    if (accounts.some(account => account.email === normalizedEmail)) {
      throw new Error('An account with this email already exists.');
    }
    if (accounts.length > 0 && activeAccount?.role !== 'master') {
      throw new Error('Only the master account can create additional accounts.');
    }

    const isMaster = accounts.length === 0;
    const salt = generateSalt();
    const account: Account = {
      id: generateId(),
      email: normalizedEmail,
      passwordHash: await hashPassword(password, salt),
      salt,
      role: isMaster ? 'master' : 'standard',
      credits: isMaster ? null : Math.max(0, Math.floor(initialCredits)),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    persistLocalAccounts([...accounts, account]);
    setActiveId(account.id);
    return account;
  };

  const createAccount = async (input: CreateAccountInput) => {
    if (!isSupabaseConfigured || !supabase) {
      return createLocalAccount(input);
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }
    if (input.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    if (activeAccount?.role === 'master') {
      const { data, error } = await supabase.functions.invoke('create-account', {
        body: {
          email: normalizedEmail,
          password: input.password,
          initialCredits: Math.max(0, Math.floor(input.initialCredits ?? 0)),
        },
      });
      if (error) throw error;
      await refreshSupabaseState();
      return fromProfile(data.account as ProfileRow);
    }

    if (activeAccount) {
      throw new Error('Only the master account can create additional accounts.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: input.password,
    });
    if (error) throw error;
    if (!data.user) {
      throw new Error('Account signup did not return a user.');
    }

    await refreshSupabaseState();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();
    const fallbackAccount: Account = {
      id: data.user.id,
      email: normalizedEmail,
      passwordHash: '',
      salt: '',
      role: 'master',
      credits: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    return profile ? fromProfile(profile as ProfileRow) : fallbackAccount;
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }
      await refreshSupabaseState();
      return;
    }

    const account = accounts.find(item => item.email === normalizedEmail);
    if (!account) {
      throw new Error('Account not found.');
    }

    const passwordHash = await hashPassword(password, account.salt);
    if (passwordHash !== account.passwordHash) {
      throw new Error('Incorrect password.');
    }

    const next = accounts.map(item => item.id === account.id ? { ...item, lastLoginAt: new Date().toISOString() } : item);
    persistLocalAccounts(next);
    setActiveId(account.id);
  };

  const logout = () => {
    if (isSupabaseConfigured && supabase) {
      void supabase.auth.signOut().then(() => {
        setAccountsState([]);
        setActiveId(null);
        setExclusionsState([]);
      });
      return;
    }
    setActiveId(null);
  };

  const addCredits = async (accountId: string, amount: number) => {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) return;

    if (isSupabaseConfigured && supabase) {
      const target = accounts.find(account => account.id === accountId);
      if (!target || target.credits === null) return;
      await setCredits(accountId, target.credits + safeAmount);
      return;
    }

    persistLocalAccounts(accounts.map(account => {
      if (account.id !== accountId || account.credits === null) return account;
      return { ...account, credits: account.credits + safeAmount };
    }));
  };

  const setCredits = async (accountId: string, amount: number) => {
    const nextCredits = Math.max(0, Math.floor(amount));

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: nextCredits })
        .eq('id', accountId)
        .not('credits', 'is', null);
      if (error) throw error;
      await refreshSupabaseState();
      return;
    }

    persistLocalAccounts(accounts.map(account => {
      if (account.id !== accountId || account.credits === null) return account;
      return { ...account, credits: nextCredits };
    }));
  };

  const requireMaster = () => {
    if (activeAccount?.role !== 'master') {
      throw new Error('Only the master account can edit exclusions.');
    }
  };

  const addExclusion = async (term: string) => {
    requireMaster();
    const normalized = term.trim();
    if (normalized.length < 2) {
      throw new Error('Exclusion must be at least 2 characters.');
    }
    if (exclusions.some(item => item.term.toLowerCase() === normalized.toLowerCase())) {
      throw new Error('That exclusion already exists.');
    }

    if (isSupabaseConfigured && supabase && activeAccount) {
      const { error } = await supabase
        .from('account_exclusions')
        .insert({ term: normalized, created_by: activeAccount.id });
      if (error) throw error;
      await refreshSupabaseState();
      return;
    }

    persistLocalExclusions([
      ...exclusions,
      {
        id: generateId(),
        term: normalized,
        createdAt: new Date().toISOString(),
        createdBy: activeAccount?.id ?? 'master',
      },
    ]);
  };

  const removeExclusion = async (id: string) => {
    requireMaster();

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('account_exclusions').delete().eq('id', id);
      if (error) throw error;
      await refreshSupabaseState();
      return;
    }

    persistLocalExclusions(exclusions.filter(item => item.id !== id));
  };

  const consumeScanCredit = async () => {
    if (!activeAccount) {
      return { ok: false, message: 'Create or sign in to an account before scanning.' };
    }
    if (activeAccount.credits === null) {
      return { ok: true };
    }
    if (activeAccount.credits <= 0) {
      return { ok: false, message: 'This account has no scan credits remaining.' };
    }

    const nextCredits = activeAccount.credits - 1;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('consume_scan_credit');
      if (error) {
        return { ok: false, message: error.message };
      }
      const response = data as { ok?: boolean; message?: string };
      if (!response.ok) {
        return { ok: false, message: response.message || 'This account has no scan credits remaining.' };
      }
      await refreshSupabaseState();
      return { ok: true };
    }

    persistLocalAccounts(accounts.map(account => (
      account.id === activeAccount.id && account.credits !== null
        ? { ...account, credits: nextCredits }
        : account
    )));
    return { ok: true };
  };

  const creditLabel = activeAccount
    ? activeAccount.credits === null ? 'Unlimited credits' : `${activeAccount.credits} credit${activeAccount.credits === 1 ? '' : 's'}`
    : 'No active account';

  return (
    <AccountContext.Provider value={{
      accounts,
      activeAccount,
      exclusions,
      isAccountLoading,
      isSupabaseBacked: isSupabaseConfigured,
      supabaseProjectUrl,
      refreshAccountLink: refreshSupabaseState,
      createAccount,
      login,
      logout,
      addCredits,
      setCredits,
      addExclusion,
      removeExclusion,
      consumeScanCredit,
      canRunScan: !isAccountLoading && !!activeAccount && (activeAccount.credits === null || activeAccount.credits > 0),
      creditLabel: isAccountLoading ? 'Loading account...' : creditLabel,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccounts must be used within AccountProvider');
  return ctx;
}
