import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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
  createAccount: (input: CreateAccountInput) => Promise<Account>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  addCredits: (accountId: string, amount: number) => void;
  setCredits: (accountId: string, amount: number) => void;
  addExclusion: (term: string) => void;
  removeExclusion: (id: string) => void;
  consumeScanCredit: () => { ok: boolean; message?: string };
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

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccountsState] = useState<Account[]>(loadAccounts);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(loadActiveId);
  const [exclusions, setExclusionsState] = useState<Exclusion[]>(loadExclusions);

  const setAccounts = (next: Account[]) => {
    setAccountsState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setActiveId = (id: string | null) => {
    setActiveAccountId(id);
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const setExclusions = (next: Exclusion[]) => {
    setExclusionsState(next);
    localStorage.setItem(EXCLUSIONS_KEY, JSON.stringify(next));
  };

  const activeAccount = useMemo(
    () => accounts.find(account => account.id === activeAccountId) || null,
    [accounts, activeAccountId],
  );

  const createAccount = async ({ email, password, initialCredits = 0 }: CreateAccountInput) => {
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

    setAccounts([...accounts, account]);
    setActiveId(account.id);
    return account;
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const account = accounts.find(item => item.email === normalizedEmail);
    if (!account) {
      throw new Error('Account not found.');
    }

    const passwordHash = await hashPassword(password, account.salt);
    if (passwordHash !== account.passwordHash) {
      throw new Error('Incorrect password.');
    }

    const next = accounts.map(item => item.id === account.id ? { ...item, lastLoginAt: new Date().toISOString() } : item);
    setAccounts(next);
    setActiveId(account.id);
  };

  const logout = () => setActiveId(null);

  const addCredits = (accountId: string, amount: number) => {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (safeAmount === 0) return;
    setAccounts(accounts.map(account => {
      if (account.id !== accountId || account.credits === null) return account;
      return { ...account, credits: account.credits + safeAmount };
    }));
  };

  const setCredits = (accountId: string, amount: number) => {
    setAccounts(accounts.map(account => {
      if (account.id !== accountId || account.credits === null) return account;
      return { ...account, credits: Math.max(0, Math.floor(amount)) };
    }));
  };

  const requireMaster = () => {
    if (activeAccount?.role !== 'master') {
      throw new Error('Only the master account can edit exclusions.');
    }
  };

  const addExclusion = (term: string) => {
    requireMaster();
    const normalized = term.trim();
    if (normalized.length < 2) {
      throw new Error('Exclusion must be at least 2 characters.');
    }
    if (exclusions.some(item => item.term.toLowerCase() === normalized.toLowerCase())) {
      throw new Error('That exclusion already exists.');
    }
    setExclusions([
      ...exclusions,
      {
        id: generateId(),
        term: normalized,
        createdAt: new Date().toISOString(),
        createdBy: activeAccount?.id ?? 'master',
      },
    ]);
  };

  const removeExclusion = (id: string) => {
    requireMaster();
    setExclusions(exclusions.filter(item => item.id !== id));
  };

  const consumeScanCredit = () => {
    if (!activeAccount) {
      return { ok: false, message: 'Create or sign in to an account before scanning.' };
    }
    if (activeAccount.credits === null) {
      return { ok: true };
    }
    if (activeAccount.credits <= 0) {
      return { ok: false, message: 'This account has no scan credits remaining.' };
    }

    setAccounts(accounts.map(account => (
      account.id === activeAccount.id && account.credits !== null
        ? { ...account, credits: account.credits - 1 }
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
      createAccount,
      login,
      logout,
      addCredits,
      setCredits,
      addExclusion,
      removeExclusion,
      consumeScanCredit,
      canRunScan: !!activeAccount && (activeAccount.credits === null || activeAccount.credits > 0),
      creditLabel,
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
