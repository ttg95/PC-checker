export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type ScanStatus = 'idle' | 'scanning' | 'complete' | 'error';
export type FlagStatus = 'unflagged' | 'flagged' | 'dismissed';

export interface RegistryEntry {
  id: string;
  path: string;
  keyName: string;
  valueData: string;
  lastWriteTime: string;
  riskScore: number;
  riskLevel: RiskLevel;
  category: 'primary' | 'secondary' | 'startup' | 'uninstall' | 'sign_media';
  isSigned: boolean | null;
  flagStatus: FlagStatus;
}

export interface EventLogEntry {
  id: string;
  logChannel: string;
  eventId: number;
  eventCategory: 'usb_connect' | 'usb_disconnect' | 'device_config' | 'device_delete' | 'defender_threat' | 'defender_exclusion' | 'app_crash' | 'journal_delete' | 'service_event' | 'other';
  timestamp: string;
  message: string;
  source: string;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface AppHistoryEntry {
  id: string;
  programName: string;
  source: 'UserAssist' | 'MuiCache' | 'CompatAssistant' | 'Prefetch' | 'RecentDocs' | 'ArcHistory' | 'TypedPaths' | 'FeatureUsage' | 'DInput' | 'FileExts';
  firstSeen: string;
  lastSeen: string;
  executionCount: number | null;
  path: string;
  isSigned: boolean | null;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface ServiceEntry {
  id: string;
  name: string;
  displayName: string;
  type: 'service' | 'driver';
  status: 'running' | 'stopped' | 'disabled';
  path: string;
  startType: 'auto' | 'manual' | 'disabled' | 'boot' | 'system';
  installDate: string | null;
  isSigned: boolean | null;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface ProcessEntry {
  id: string;
  name: string;
  pid: number;
  parentPid: number;
  parentName: string;
  path: string;
  isSigned: boolean | null;
  startTime: string;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface ScheduledTaskEntry {
  id: string;
  name: string;
  path: string;
  creationDate: string;
  lastRunTime: string | null;
  nextRunTime: string | null;
  status: 'ready' | 'running' | 'disabled' | 'queued';
  executablePath: string;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface DmaDeviceEntry {
  id: string;
  deviceId: string;
  vendorId: string;
  deviceName: string;
  location: string;
  busType: 'PCIe' | 'USB' | 'Thunderbolt' | 'Unknown';
  driverInstalled: boolean;
  isHidden: boolean;
  isSigned: boolean | null;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface FileSystemEntry {
  id: string;
  name: string;
  category: 'prefetch' | 'recent' | 'crash_dump' | 'recycle_bin' | 'psreadline' | 'usn_journal' | 'encrypted' | 'efi_partition' | 'dll_openwith' | 'winrar_history' | 'hidden_folder' | 'restore_point' | 'doskey_history';
  path: string;
  timestamp: string;
  size: number | null;
  isSigned: boolean | null;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface SystemInfoEntry {
  id: string;
  category: 'hwid' | 'user_account' | 'install_date' | 'defender_exclusion' | 'defender_history' | 'nvidia_program' | 'driver_list' | 'tasklist' | 'bios_info' | 'disk_volume' | 'cipher_status' | 'restore_point' | 'doskey_history';
  label: string;
  value: string;
  detail: string;
  riskScore: number;
  riskLevel: RiskLevel;
  flagStatus: FlagStatus;
}

export interface ScanProgress {
  scannerName: string;
  progress: number;
  status: ScanStatus;
  itemsFound: number;
  error?: string;
}

export interface ScanResult {
  registry: RegistryEntry[];
  events: EventLogEntry[];
  appHistory: AppHistoryEntry[];
  services: ServiceEntry[];
  processes: ProcessEntry[];
  scheduledTasks: ScheduledTaskEntry[];
  dmaDevices: DmaDeviceEntry[];
  fileSystem: FileSystemEntry[];
  systemInfo: SystemInfoEntry[];
}

export interface RiskRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  riskLevel: RiskLevel;
  enabled: boolean;
  weight: number;
}

export interface TriggerConfig {
  rules: RiskRule[];
  cheatProviders: string[];
  nonStandardPaths: string[];
}

export interface ReportConfig {
  machineName: string;
  scanTimestamp: string;
  includeRegistry: boolean;
  includeEvents: boolean;
  includeAppHistory: boolean;
  includeServices: boolean;
  includeProcesses: boolean;
  includeScheduledTasks: boolean;
  includeDma: boolean;
  includeFileSystem: boolean;
  includeSystemInfo: boolean;
  flaggedOnly: boolean;
}

export interface DashboardStats {
  totalFindings: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  flaggedItems: number;
  scansComplete: number;
  totalScans: number;
}
