import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

export type NavItemId =
  | 'dashboard'
  | 'registry'
  | 'events'
  | 'apphistory'
  | 'services'
  | 'usb'
  | 'dma'
  | 'filesystem'
  | 'systeminfo'
  | 'tasks'
  | 'processes'
  | 'reports'
  | 'accounts'
  | 'tokens'
  | 'master'
  | 'admin';

export interface NavItemConfig {
  id: NavItemId;
  to: string;
  label: string;
  masterOnly?: boolean;
}

interface NavigationContextValue {
  orderedItems: NavItemConfig[];
  navOrder: NavItemId[];
  saveGlobalNavOrder: (order: NavItemId[]) => Promise<void>;
  resetGlobalNavOrder: () => Promise<void>;
}

export const defaultNavItems: NavItemConfig[] = [
  { id: 'dashboard', to: '/', label: 'Dashboard' },
  { id: 'accounts', to: '/accounts', label: 'Sign In' },
  { id: 'tokens', to: '/tokens', label: 'Buy Tokens' },
  { id: 'registry', to: '/registry', label: 'Registry Analysis' },
  { id: 'events', to: '/events', label: 'Event Viewer' },
  { id: 'apphistory', to: '/apphistory', label: 'Application History' },
  { id: 'services', to: '/services', label: 'Services & Drivers' },
  { id: 'usb', to: '/usb', label: 'USB Activity' },
  { id: 'dma', to: '/dma', label: 'DMA / PCIe' },
  { id: 'filesystem', to: '/filesystem', label: 'File System' },
  { id: 'systeminfo', to: '/systeminfo', label: 'System Info' },
  { id: 'tasks', to: '/tasks', label: 'Scheduled Tasks' },
  { id: 'processes', to: '/processes', label: 'Running Processes' },
  { id: 'reports', to: '/reports', label: 'Export Reports' },
  { id: 'master', to: '/master', label: 'Master Settings', masterOnly: true },
  { id: 'admin', to: '/admin', label: 'Admin Panel', masterOnly: true },
];

const STORAGE_KEY = 'pc-checker-nav-order-v1';
const defaultNavOrder = defaultNavItems.map(item => item.id);
const pinnedNavOrder: NavItemId[] = ['dashboard', 'accounts', 'tokens'];
const validNavIds = new Set<NavItemId>(defaultNavOrder);
const NavigationContext = createContext<NavigationContextValue | null>(null);

function loadStoredOrder(): NavItemId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : null;
    return normalizeNavOrder(parsed);
  } catch {
    return defaultNavOrder;
  }
}

function normalizeNavOrder(value: unknown): NavItemId[] {
  if (!Array.isArray(value)) return defaultNavOrder;

  const ordered = value.filter((item): item is NavItemId => (
    typeof item === 'string' &&
    validNavIds.has(item as NavItemId) &&
    !pinnedNavOrder.includes(item as NavItemId)
  ));
  const missing = defaultNavOrder.filter(item => !ordered.includes(item));
  const rest = [...ordered, ...missing].filter(item => !pinnedNavOrder.includes(item));
  return [...pinnedNavOrder, ...rest];
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navOrder, setNavOrder] = useState<NavItemId[]>(loadStoredOrder);

  const refreshGlobalNavOrder = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'nav_order')
      .maybeSingle();

    if (error) return;
    const value = data?.value as { order?: unknown } | unknown[] | null | undefined;
    const nextOrder = Array.isArray(value) ? normalizeNavOrder(value) : normalizeNavOrder(value?.order);
    setNavOrder(nextOrder);
  };

  const saveGlobalNavOrder = async (order: NavItemId[]) => {
    const normalized = normalizeNavOrder(order);
    setNavOrder(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    if (!isSupabaseConfigured || !supabase) return;

    const { error } = await supabase.rpc('set_nav_order', { selected_order: normalized });
    if (error) throw error;
  };

  const resetGlobalNavOrder = async () => {
    await saveGlobalNavOrder(defaultNavOrder);
  };

  useEffect(() => {
    void refreshGlobalNavOrder();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(navOrder));
  }, [navOrder]);

  const orderedItems = useMemo(() => {
    const byId = new Map(defaultNavItems.map(item => [item.id, item]));
    return navOrder.map(id => byId.get(id)).filter((item): item is NavItemConfig => Boolean(item));
  }, [navOrder]);

  const value = useMemo<NavigationContextValue>(() => ({
    orderedItems,
    navOrder,
    saveGlobalNavOrder,
    resetGlobalNavOrder,
  }), [orderedItems, navOrder]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigationOrder() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigationOrder must be used within NavigationProvider');
  return ctx;
}
