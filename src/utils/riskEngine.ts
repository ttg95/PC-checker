import type { RiskRule } from '../types';

export const cheatProviders = ['shadow', 'phantom overlay', 'phantom', 'engineowning', 'ac diamond', 'cobalt', "lone's", 'atomic', 'aimex', 'clutch', 'kratos', 'ducks', 'ring-1', 'ring1', 'dma', 'injector', 'loader', 'cheat engine', 'cheatengine'];

export const nonStandardPaths = ['\\AppData\\', '\\Temp\\', '\\Downloads\\', '\\Public\\', '\\tmp\\'];

export function isKnownCheatProvider(name: string): boolean {
  const lower = name.toLowerCase();
  return cheatProviders.some(p => lower.includes(p));
}

export const defaultRules: RiskRule[] = [
  {
    id: 'rule-unsigned-driver-recent',
    name: 'Recently Installed Unsigned Driver',
    description: 'Kernel driver installed within 7 days without valid digital signature',
    condition: 'driver AND unsigned AND installedWithin(7)',
    riskLevel: 'high',
    enabled: true,
    weight: 80,
  },
  {
    id: 'rule-unsigned-service-recent',
    name: 'Recently Installed Unsigned Service',
    description: 'Service installed within 7 days without valid digital signature',
    riskLevel: 'high',
    condition: 'service AND unsigned AND installedWithin(7)',
    enabled: true,
    weight: 75,
  },
  {
    id: 'rule-sign-media-unsigned',
    name: 'SIGN.MEDIA Check - Unsigned Executable in MuiCache',
    description: 'MuiCache entry found without valid digital signature (SIGN.MEDIA check)',
    condition: 'registry.muiCache AND unsigned',
    riskLevel: 'high',
    enabled: true,
    weight: 70,
  },
  {
    id: 'rule-cheat-provider-name',
    name: 'Known Cheat Provider Name Detected',
    description: 'File or registry entry matches known cheat provider names (Phantom Overlay, EngineOwning, AC Diamond, Cobalt, etc.)',
    condition: 'name MATCHES cheatProviders',
    riskLevel: 'high',
    enabled: true,
    weight: 85,
  },
  {
    id: 'rule-defender-exclusion-suspicious',
    name: 'Suspicious Defender Exclusion',
    description: 'Windows Defender exclusion added for suspicious paths (AppData, Temp, Downloads)',
    riskLevel: 'high',
    condition: 'defender.exclusion AND suspiciousPath',
    enabled: true,
    weight: 65,
  },
  {
    id: 'rule-dma-device-unknown',
    name: 'Unknown PCIe/USB DMA Device',
    description: 'Unknown DMA capture device or USB descriptor failure on PCIe/USB bus',
    riskLevel: 'high',
    condition: 'dma.unknown OR dma.descriptorFailure',
    enabled: true,
    weight: 75,
  },
  {
    id: 'rule-startup-persistence-new',
    name: 'New Startup Persistence Entry',
    description: 'New entry in auto-start registry locations within 7 days',
    riskLevel: 'medium',
    condition: 'registry.startup AND createdWithin(7)',
    enabled: true,
    weight: 55,
  },
  {
    id: 'rule-dll-openwith',
    name: 'DLL OpenWithList Entry',
    description: 'Executable registered in .dll OpenWithList - may indicate DLL injection tool',
    riskLevel: 'medium',
    condition: 'registry.dllOpenWith',
    enabled: true,
    weight: 50,
  },
  {
    id: 'rule-disallow-run',
    name: 'DisallowRun Policy Detected',
    description: 'Programs blocked via DisallowRun policy - may hide tools from Task Manager',
    riskLevel: 'medium',
    condition: 'registry.disallowRun',
    enabled: true,
    weight: 45,
  },
  {
    id: 'rule-usb-device-history',
    name: 'USB Device Connection/Deletion',
    description: 'USB devices connected or deleted - check for DMA hardware or USB drives',
    riskLevel: 'medium',
    condition: 'event.usbConnect OR event.usbDelete',
    enabled: true,
    weight: 40,
  },
  {
    id: 'rule-journal-delete',
    name: 'USN Journal Activity Deleted',
    description: 'Application event ID 3079 indicates USN readjournal was deleted',
    riskLevel: 'medium',
    condition: 'event.journalDelete',
    enabled: true,
    weight: 50,
  },
  {
    id: 'rule-prefetch-suspicious',
    name: 'Suspicious Prefetch Entry',
    description: 'Prefetch file for suspicious executable (injector, loader, unsigned)',
    riskLevel: 'medium',
    condition: 'prefetch AND suspiciousName',
    enabled: true,
    weight: 45,
  },
  {
    id: 'rule-hwid-spoof',
    name: 'Potential HWID Spoof',
    description: 'System product name or BIOS info may indicate HWID spoofing',
    riskLevel: 'medium',
    condition: 'hwid.spoofed',
    enabled: true,
    weight: 50,
  },
  {
    id: 'rule-winrar-suspicious',
    name: 'Suspicious WinRAR History',
    description: 'WinRAR archive history contains suspicious filenames (cheat, hack, aim, etc.)',
    riskLevel: 'medium',
    condition: 'winrar.suspiciousName',
    enabled: true,
    weight: 40,
  },
  {
    id: 'rule-nvidia-suspicious-program',
    name: 'Suspicious NVIDIA Program Setting',
    description: 'Unknown .exe found in NVIDIA Control Panel program settings',
    riskLevel: 'medium',
    condition: 'nvidia.suspiciousProgram',
    enabled: true,
    weight: 40,
  },
  {
    id: 'rule-multiple-user-accounts',
    name: 'Multiple User Accounts',
    description: 'Multiple user accounts on system - may indicate alternate accounts',
    riskLevel: 'low',
    condition: 'users.count > 1',
    enabled: true,
    weight: 20,
  },
  {
    id: 'rule-encrypted-drive',
    name: 'Encrypted Volume Detected',
    description: 'CIPHER /E attribute found on volume - may hide evidence',
    riskLevel: 'low',
    condition: 'cipher.encrypted',
    enabled: true,
    weight: 20,
  },
  {
    id: 'rule-manual-restore-point',
    name: 'Manually Created Restore Point',
    description: 'System restore point was manually created - may be used to rollback after cheating',
    riskLevel: 'low',
    condition: 'restorePoint.manual',
    enabled: true,
    weight: 15,
  },
  {
    id: 'rule-prefetch-in-temp',
    name: 'Executable Run from Temp/AppData',
    description: 'Executable run from non-standard path (Temp, AppData, Downloads)',
    riskLevel: 'medium',
    condition: 'path MATCHES nonStandardPaths',
    enabled: true,
    weight: 35,
  },
  {
    id: 'rule-process-unsigned',
    name: 'Unsigned Running Process',
    description: 'Currently running process without valid digital signature',
    riskLevel: 'low',
    condition: 'process AND unsigned',
    enabled: true,
    weight: 30,
  },
];

export function calculateItemRisk(
  item: {
    isSigned?: boolean | null;
    installDate?: string | null;
    creationDate?: string | null;
    lastWriteTime?: string | null;
    firstSeen?: string | null;
    category?: string;
    path?: string;
    name?: string;
    status?: string;
    type?: string;
    eventCategory?: string;
  },
  rules: RiskRule[] = defaultRules
): number {
  let score = 0;
  const now = new Date();
  const pathOrName = `${item.path || ''} ${item.name || ''}`.toLowerCase();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.id) {
      case 'rule-unsigned-driver-recent':
        if (item.type === 'driver' && item.isSigned === false && item.installDate) {
          const days = Math.floor((now.getTime() - new Date(item.installDate).getTime()) / 86400000);
          if (days <= 7) score += rule.weight;
        }
        break;
      case 'rule-unsigned-service-recent':
        if (item.type === 'service' && item.isSigned === false && item.installDate) {
          const days = Math.floor((now.getTime() - new Date(item.installDate).getTime()) / 86400000);
          if (days <= 7) score += rule.weight;
        }
        break;
      case 'rule-sign-media-unsigned':
        if (item.isSigned === false && (item.category === 'primary' || item.category === 'MuiCache')) score += rule.weight;
        break;
      case 'rule-cheat-provider-name':
        if (isKnownCheatProvider(pathOrName)) score += rule.weight;
        break;
      case 'rule-defender-exclusion-suspicious':
        if (item.category === 'defender_exclusion' && item.path && nonStandardPaths.some(p => item.path!.includes(p))) score += rule.weight;
        break;
      case 'rule-dma-device-unknown':
        if (item.category === 'dma' || (pathOrName.includes('dma') && pathOrName.includes('capture'))) score += rule.weight;
        break;
      case 'rule-startup-persistence-new':
        if (item.category === 'startup_persistence' && item.lastWriteTime) {
          const days = Math.floor((now.getTime() - new Date(item.lastWriteTime).getTime()) / 86400000);
          if (days <= 7) score += rule.weight;
        }
        break;
      case 'rule-dll-openwith':
        if (item.category === 'dll_openwith' || (item.path?.includes('.dll\\OpenWithList'))) score += rule.weight;
        break;
      case 'rule-disallow-run':
        if (item.category === 'primary' && item.path?.includes('DisallowRun')) score += rule.weight;
        break;
      case 'rule-usb-device-history':
        if (item.eventCategory === 'usb_connect' || item.eventCategory === 'usb_disconnect' || item.eventCategory === 'device_delete') score += rule.weight;
        break;
      case 'rule-journal-delete':
        if (item.eventCategory === 'journal_delete' || item.category === 'usn_journal') score += rule.weight;
        break;
      case 'rule-prefetch-suspicious':
        if (item.category === 'prefetch' && (isKnownCheatProvider(pathOrName) || item.isSigned === false)) score += rule.weight;
        break;
      case 'rule-hwid-spoof':
        if (item.category === 'hwid' && pathOrName.includes('spoof')) score += rule.weight;
        break;
      case 'rule-winrar-suspicious':
        if ((item.category === 'winrar_history' || item.category === 'ArcHistory') && (isKnownCheatProvider(pathOrName) || pathOrName.includes('cheat') || pathOrName.includes('hack'))) score += rule.weight;
        break;
      case 'rule-nvidia-suspicious-program':
        if (item.category === 'nvidia_program' && item.isSigned === false) score += rule.weight;
        break;
      case 'rule-multiple-user-accounts':
        if (item.category === 'user_account') score += rule.weight;
        break;
      case 'rule-encrypted-drive':
        if (item.category === 'encrypted' || item.category === 'cipher_status') score += rule.weight;
        break;
      case 'rule-manual-restore-point':
        if (item.category === 'restore_point') score += rule.weight;
        break;
      case 'rule-prefetch-in-temp':
        if (item.path && nonStandardPaths.some(p => item.path!.includes(p)) && item.firstSeen) {
          const days = Math.floor((now.getTime() - new Date(item.firstSeen).getTime()) / 86400000);
          if (days <= 7) score += rule.weight;
        }
        break;
      case 'rule-process-unsigned':
        if (item.isSigned === false) score += rule.weight;
        break;
    }
  }

  return Math.min(score, 100);
}
