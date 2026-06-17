/// <reference types="vite/client" />

import type { ScanResult } from './types';

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface AdminInfo {
    isAdmin: boolean;
    isPackaged: boolean;
    platform: NodeJS.Platform;
    userDataPath: string;
    executablePath: string;
  }

  interface Window {
    electron?: {
      platform: NodeJS.Platform;
      isAdmin: () => Promise<boolean>;
      getAdminInfo: () => Promise<AdminInfo>;
      runPcScan: () => Promise<ScanResult>;
    };
  }
}

export {};
