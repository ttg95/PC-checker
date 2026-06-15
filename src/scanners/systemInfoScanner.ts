import type { SystemInfoEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

function makeEntry(partial: Partial<SystemInfoEntry> & { category: SystemInfoEntry['category']; label: string; value: string }): SystemInfoEntry {
  const riskScore = calculateItemRisk({ isSigned: null, path: partial.value, category: partial.category });
  return {
    id: generateId(),
    detail: '',
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanSystemInfo(): SystemInfoEntry[] {
  return [
    // HWID
    makeEntry({ category: 'hwid', label: 'UUID', value: '12345678-1234-1234-1234-123456789ABC', detail: 'wmic csproduct get uuid', riskScore: 0 }),
    makeEntry({ category: 'hwid', label: 'Product Name', value: 'System Product Name (Spoofed?)', detail: 'wmic csproduct get name - Check CPU-Z for board spoof', riskScore: 30 }),
    makeEntry({ category: 'bios_info', label: 'BIOS Version', value: 'American Megatrends Inc. v2.04', detail: 'Check msinfo32 for board spoofs or matching models/serials', riskScore: 10 }),

    // User accounts
    makeEntry({ category: 'user_account', label: 'User: player', value: 'S-1-5-21-1095078193-4270834702-3029300417-1002', detail: 'Standard user account', riskScore: 0 }),
    makeEntry({ category: 'user_account', label: 'User: admin_temp', value: 'S-1-5-21-...-1003', detail: 'Additional user account detected - check for multiple accounts', riskScore: 20 }),
    makeEntry({ category: 'user_account', label: 'User: testuser', value: 'S-1-5-21-...-1004', detail: 'Additional user account detected', riskScore: 20 }),

    // Install date
    makeEntry({ category: 'install_date', label: 'Windows Install Date', value: daysAgo(45).split('T')[0], detail: 'systeminfo | findstr "Original Install Date"', riskScore: 0 }),

    // Defender exclusions
    makeEntry({ category: 'defender_exclusion', label: 'Path Exclusion: C:\\Users\\player\\AppData\\Roaming\\shadow', value: 'Excluded from Windows Defender scanning', detail: 'Windows Security > Virus & threat protection > Exclusions', riskScore: 60 }),
    makeEntry({ category: 'defender_exclusion', label: 'Path Exclusion: C:\\Users\\player\\Downloads', value: 'Excluded from Windows Defender scanning', detail: 'Downloads folder excluded - highly suspicious', riskScore: 55 }),
    makeEntry({ category: 'defender_exclusion', label: 'Process Exclusion: shadow.exe', value: 'Process excluded from real-time protection', detail: 'Process exclusion detected', riskScore: 65 }),

    // Defender history
    makeEntry({ category: 'defender_history', label: 'Quarantined: Trojan:Win32/ShadowOverlay', value: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', detail: 'Check file name of quarantined threats in protection history', riskScore: 50 }),
    makeEntry({ category: 'defender_history', label: 'Quarantined: PUA:Win32/CheatEngine', value: 'C:\\Users\\player\\Downloads\\ce_setup.exe', detail: 'Potentially Unwanted Application detected', riskScore: 30 }),
    makeEntry({ category: 'defender_history', label: 'Quarantined: HackTool:Win32/Injector', value: 'C:\\Users\\player\\Downloads\\injector.exe', detail: 'Hacking tool quarantined', riskScore: 55 }),

    // NVIDIA program settings
    makeEntry({ category: 'nvidia_program', label: 'shadow.exe', value: 'NVIDIA Control Panel > Program Settings entry found', detail: '3D Settings > Program Settings - check for recent .exes', riskScore: 40 }),
    makeEntry({ category: 'nvidia_program', label: 'gameclient.exe', value: 'NVIDIA Control Panel > Program Settings entry found', detail: 'Tournament client - legitimate', riskScore: 0 }),
    makeEntry({ category: 'nvidia_program', label: 'injector.exe', value: 'NVIDIA Control Panel > Program Settings entry found', detail: 'Suspicious .exe found in NVIDIA program list', riskScore: 50 }),

    // Driver list
    makeEntry({ category: 'driver_list', label: 'EagleX64.sys', value: 'C:\\Windows\\System32\\drivers\\EagleX64.sys (Unsigned)', detail: 'driverquery output - unsigned driver', riskScore: 65 }),
    makeEntry({ category: 'driver_list', label: 'WinRing0x64.sys', value: 'C:\\Windows\\Temp\\winring0x64.sys (Unsigned)', detail: 'driverquery output - unsigned driver in Temp folder', riskScore: 70 }),
    makeEntry({ category: 'driver_list', label: 'WdFilter.sys', value: 'C:\\Windows\\System32\\drivers\\WdFilter.sys (Signed)', detail: 'Windows Defender filter driver - legitimate', riskScore: 0 }),
    makeEntry({ category: 'driver_list', label: 'npcap.sys', value: 'C:\\Windows\\System32\\drivers\\npcap.sys (Signed)', detail: 'Npcap packet driver - Wireshark dependency', riskScore: 15 }),
    makeEntry({ category: 'driver_list', label: 'disk.sys', value: 'C:\\Windows\\System32\\drivers\\disk.sys (Signed)', detail: 'Standard disk driver', riskScore: 0 }),

    // Tasklist
    makeEntry({ category: 'tasklist', label: 'shadow.exe (PID: 4832)', value: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', detail: 'Suspicious running process', riskScore: 55 }),
    makeEntry({ category: 'tasklist', label: 'sysmon64.exe (PID: 5104)', value: 'C:\\Windows\\Temp\\sysmon64.exe', detail: 'Suspicious process in Temp folder', riskScore: 50 }),
    makeEntry({ category: 'tasklist', label: 'AutoClicker.exe (PID: 6280)', value: 'C:\\Program Files\\AutoClicker\\AutoClicker.exe', detail: 'Auto-clicker application running', riskScore: 45 }),

    // Disk volumes
    makeEntry({ category: 'disk_volume', label: 'Volume 0: C:', value: 'NTFS - 500GB - System', detail: 'diskpart > list vol', riskScore: 0 }),
    makeEntry({ category: 'disk_volume', label: 'Volume 1: D:', value: 'NTFS - 1TB - Data', detail: 'diskpart > list vol', riskScore: 0 }),
    makeEntry({ category: 'disk_volume', label: 'Volume 2: EFI', value: 'FAT32 - 100MB - EFI System Partition', detail: 'diskpart > list vol - check for unauthorized EFI partitions', riskScore: 0 }),
    makeEntry({ category: 'disk_volume', label: 'Volume 3: E:', value: 'Removable - USB Drive', detail: 'External drive detected - check VolumeInfoCache registry', riskScore: 15 }),

    // Cipher status
    makeEntry({ category: 'cipher_status', label: 'E: Encrypted', value: 'CIPHER /E attribute detected on E: drive', detail: 'cmd: CIPHER - check for encrypted directories', riskScore: 25 }),

    // Restore points
    makeEntry({ category: 'restore_point', label: 'Manual Restore Point', value: 'Created: ' + daysAgo(2).split('T')[0], detail: 'Check for manually created system restore points', riskScore: 15 }),

    // Doskey history
    makeEntry({ category: 'doskey_history', label: 'CMD History', value: 'fsutil usn readjournal c: csv | findstr ...', detail: 'doskey /h output - check for fsutil, cipher, or cheat-related commands', riskScore: 35 }),
  ];
}
