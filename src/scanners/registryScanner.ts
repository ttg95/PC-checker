import type { RegistryEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

function makeEntry(partial: Partial<RegistryEntry> & { path: string; keyName: string; category: RegistryEntry['category'] }): RegistryEntry {
  const riskScore = calculateItemRisk({
    isSigned: partial.isSigned,
    lastWriteTime: partial.lastWriteTime,
    category: partial.category,
    path: partial.path,
  });
  return {
    id: generateId(),
    valueData: '',
    lastWriteTime: daysAgo(5),
    isSigned: null,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanRegistry(): RegistryEntry[] {
  return [
    // --- PRIMARY REGISTRY KEYS ---
    // MuiCache - check for SIGN.MEDIA (unsigned executables)
    makeEntry({ path: 'HKCU\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache', keyName: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe.FriendlyAppName', valueData: 'Shadow Overlay', lastWriteTime: hoursAgo(6), isSigned: false, category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache', keyName: 'C:\\Program Files\\Discord\\Discord.exe.FriendlyAppName', valueData: 'Discord', lastWriteTime: daysAgo(30), isSigned: true, category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache', keyName: 'C:\\Users\\player\\Downloads\\injector.exe.FriendlyAppName', valueData: 'Injector Tool', lastWriteTime: daysAgo(1), isSigned: false, category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache', keyName: 'C:\\Users\\player\\AppData\\Local\\Temp\\loader.exe.FriendlyAppName', valueData: 'Loader', lastWriteTime: hoursAgo(12), isSigned: false, category: 'primary' }),

    // Compatibility Assistant Store
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store', keyName: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', valueData: 'RUNASADMIN|ELEVATECREATEPROCESS', lastWriteTime: hoursAgo(6), isSigned: false, category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store', keyName: 'C:\\Users\\player\\Downloads\\CobaltClient.exe', valueData: 'RUNASADMIN', lastWriteTime: daysAgo(2), isSigned: false, category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Persisted', keyName: 'C:\\Users\\player\\AppData\\Local\\Temp\\sysmon64.exe', valueData: '', lastWriteTime: hoursAgo(2), isSigned: false, category: 'primary' }),

    // Defender Exclusions
    makeEntry({ path: 'HKLM\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\TemporaryPaths', keyName: 'C:\\Users\\player\\AppData\\Roaming\\shadow', valueData: '', lastWriteTime: daysAgo(3), category: 'primary' }),

    // BAM (Background Activity Moderator)
    makeEntry({ path: 'HKLM\\SYSTEM\\ControlSet001\\Services\\bam\\State\\UserSettings', keyName: 'S-1-5-21-...-1002\\..\\shadow.exe', valueData: '0x01 0x02...', lastWriteTime: hoursAgo(6), category: 'primary' }),
    makeEntry({ path: 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\bam\\State\\UserSettings', keyName: 'S-1-5-21-...-1002\\..\\Discord.exe', valueData: '0x01', lastWriteTime: hoursAgo(1), category: 'primary' }),

    // FeatureUsage
    makeEntry({ path: 'HKU\\S-1-5-21-...-1002\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FeatureUsage\\AppSwitched', keyName: 'C:\\Users\\player\\Downloads\\ring1_client.exe', valueData: '3', lastWriteTime: daysAgo(1), category: 'primary' }),
    makeEntry({ path: 'HKU\\S-1-5-21-...-1002\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store', keyName: 'C:\\Users\\player\\Downloads\\engineowning.exe', valueData: 'RUNASADMIN', lastWriteTime: daysAgo(4), isSigned: false, category: 'primary' }),

    // DLL OpenWithList
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.dll\\OpenWithList', keyName: 'MRUList', valueData: 'cba', lastWriteTime: hoursAgo(8), category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.dll\\OpenWithList', keyName: 'a', valueData: 'injector.exe', lastWriteTime: hoursAgo(8), category: 'primary' }),

    // WinRAR ArcHistory
    makeEntry({ path: 'HKCU\\Software\\WinRAR\\ArcHistory', keyName: '0', valueData: 'C:\\Users\\player\\Downloads\\cheat_pack_v2.rar', lastWriteTime: daysAgo(3), category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\WinRAR\\DialogEditHistory\\ArcName', keyName: '0', valueData: 'C:\\Users\\player\\Downloads\\aimex_setup.rar', lastWriteTime: daysAgo(2), category: 'primary' }),

    // Uninstall key
    makeEntry({ path: 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', keyName: 'AC Diamond', valueData: 'C:\\Program Files\\ACDiamond\\acd.exe', lastWriteTime: daysAgo(5), isSigned: false, category: 'uninstall' }),

    // ComDlg32
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\LastVisitedPidlMRU', keyName: '0', valueData: 'C:\\Users\\player\\Downloads', lastWriteTime: daysAgo(1), category: 'primary' }),
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\ComDlg32\\OpenSavePidlMRU', keyName: '.exe', valueData: 'C:\\Users\\player\\Downloads\\loader.exe', lastWriteTime: daysAgo(1), category: 'primary' }),

    // ShowJumpView
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FeatureUsage\\ShowJumpView', keyName: 'C:\\Users\\player\\Downloads\\kratos_client.exe', valueData: '2', lastWriteTime: daysAgo(3), isSigned: false, category: 'primary' }),

    // VolumeInfoCache
    makeEntry({ path: 'HKLM\\SOFTWARE\\Microsoft\\Windows Search\\VolumeInfoCache', keyName: 'E:\\', valueData: 'Removable Drive', lastWriteTime: hoursAgo(1), category: 'primary' }),

    // DirectInput
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\DirectInput', keyName: 'Vendor_1234_Product_5678', valueData: 'DMA Device', lastWriteTime: daysAgo(1), category: 'primary' }),

    // HeapLeakDetection
    makeEntry({ path: 'HKLM\\SOFTWARE\\Microsoft\\RADAR\\HeapLeakDetection\\DiagnosedApplications', keyName: 'shadow.exe', valueData: '', lastWriteTime: daysAgo(2), category: 'primary' }),

    // TypedPaths
    makeEntry({ path: 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths', keyName: 'url1', valueData: 'C:\\Users\\player\\AppData\\Roaming\\shadow', lastWriteTime: daysAgo(1), category: 'primary' }),

    // DisallowRun
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer\\DisallowRun', keyName: '1', valueData: 'taskmgr.exe', lastWriteTime: daysAgo(7), category: 'primary' }),

    // --- SECONDARY REGISTRY KEYS ---
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist', keyName: '{CEBFF5CD-ACE2-4F4F-9178-9926F4850E49}', valueData: 'ROT13 Encoded - shadow.exe', lastWriteTime: hoursAgo(6), category: 'secondary' }),
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist', keyName: '{F4E57C4B-2036-45F0-A9AB-443BCFE33D9F}', valueData: 'ROT13 Encoded - chrome.exe', lastWriteTime: hoursAgo(1), category: 'secondary' }),
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\ShellNoRoam', keyName: 'BagMRU', valueData: '', lastWriteTime: daysAgo(2), category: 'secondary' }),
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\Shell', keyName: 'Bags', valueData: '', lastWriteTime: daysAgo(10), category: 'secondary' }),
    makeEntry({ path: 'HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell', keyName: 'BagMRU', valueData: '', lastWriteTime: daysAgo(5), category: 'secondary' }),
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', keyName: 'Phantom Overlay', valueData: 'C:\\Users\\player\\AppData\\Local\\phantom\\overlay.exe', lastWriteTime: daysAgo(3), isSigned: false, category: 'uninstall' }),
    makeEntry({ path: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall', keyName: 'Steam', valueData: 'C:\\Program Files (x86)\\Steam\\steam.exe', lastWriteTime: daysAgo(60), isSigned: true, category: 'uninstall' }),

    // DMA / PCIe
    makeEntry({ path: 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI', keyName: 'VEN_1234&DEV_5678&SUBSYS_0001&REV_01\\4&12345678&0&0010', valueData: 'DMA Capture Device', lastWriteTime: daysAgo(2), category: 'primary' }),
    makeEntry({ path: 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI', keyName: 'VEN_10DE&DEV_2504&SUBSYS_12345678&REV_A1\\4&12345678&0&0019', valueData: 'NVIDIA GeForce RTX 3060', lastWriteTime: daysAgo(90), isSigned: true, category: 'primary' }),
  ];
}
