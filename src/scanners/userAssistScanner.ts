import type { AppHistoryEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();


function makeEntry(partial: Partial<AppHistoryEntry> & { programName: string; source: AppHistoryEntry['source']; path: string }): AppHistoryEntry {
  const riskScore = calculateItemRisk({ path: partial.path, firstSeen: partial.firstSeen, isSigned: partial.isSigned });
  return {
    id: generateId(),
    firstSeen: daysAgo(30),
    lastSeen: daysAgo(1),
    executionCount: null,
    isSigned: null,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanAppHistory(): AppHistoryEntry[] {
  return [
    // MuiCache entries (SIGN.MEDIA check)
    makeEntry({ programName: 'shadow.exe', source: 'MuiCache', path: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', firstSeen: hoursAgo(6), lastSeen: hoursAgo(6), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'injector.exe', source: 'MuiCache', path: 'C:\\Users\\player\\Downloads\\injector.exe', firstSeen: daysAgo(1), lastSeen: daysAgo(1), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'loader.exe', source: 'MuiCache', path: 'C:\\Users\\player\\AppData\\Local\\Temp\\loader.exe', firstSeen: hoursAgo(12), lastSeen: hoursAgo(12), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'Discord.exe', source: 'MuiCache', path: 'C:\\Users\\player\\AppData\\Local\\Discord\\Discord.exe', firstSeen: daysAgo(60), lastSeen: hoursAgo(1), executionCount: 156, isSigned: true }),
    makeEntry({ programName: 'Chrome.exe', source: 'MuiCache', path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe', firstSeen: daysAgo(120), lastSeen: hoursAgo(1), executionCount: 342, isSigned: true }),

    // Compatibility Assistant
    makeEntry({ programName: 'shadow.exe', source: 'CompatAssistant', path: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', firstSeen: hoursAgo(6), lastSeen: hoursAgo(6), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'CobaltClient.exe', source: 'CompatAssistant', path: 'C:\\Users\\player\\Downloads\\CobaltClient.exe', firstSeen: daysAgo(2), lastSeen: daysAgo(2), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'ring1_client.exe', source: 'CompatAssistant', path: 'C:\\Users\\player\\Downloads\\ring1_client.exe', firstSeen: daysAgo(1), lastSeen: daysAgo(1), executionCount: 1, isSigned: false }),

    // UserAssist
    makeEntry({ programName: 'shadow.exe', source: 'UserAssist', path: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', firstSeen: hoursAgo(6), lastSeen: hoursAgo(6), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'Steam.exe', source: 'UserAssist', path: 'C:\\Program Files (x86)\\Steam\\Steam.exe', firstSeen: daysAgo(90), lastSeen: hoursAgo(2), executionCount: 210, isSigned: true }),
    makeEntry({ programName: 'gameclient.exe', source: 'UserAssist', path: 'C:\\Program Files\\Tournament\\gameclient.exe', firstSeen: daysAgo(45), lastSeen: hoursAgo(4), executionCount: 89, isSigned: true }),

    // Prefetch
    makeEntry({ programName: 'SHADOW.EXE', source: 'Prefetch', path: 'C:\\Windows\\Prefetch\\SHADOW.EXE-ABC123.pf', firstSeen: hoursAgo(6), lastSeen: hoursAgo(6), executionCount: 1, isSigned: false }),
    makeEntry({ programName: 'INJECTOR.EXE', source: 'Prefetch', path: 'C:\\Windows\\Prefetch\\INJECTOR.EXE-DEF456.pf', firstSeen: daysAgo(1), lastSeen: daysAgo(1), executionCount: 2, isSigned: false }),
    makeEntry({ programName: 'CMD.EXE', source: 'Prefetch', path: 'C:\\Windows\\Prefetch\\CMD.EXE-GHI789.pf', firstSeen: daysAgo(90), lastSeen: daysAgo(3), executionCount: 45, isSigned: true }),
    makeEntry({ programName: 'POWERSHELL.EXE', source: 'Prefetch', path: 'C:\\Windows\\Prefetch\\POWERSHELL.EXE.pf', firstSeen: daysAgo(90), lastSeen: daysAgo(1), executionCount: 32, isSigned: true }),
    makeEntry({ programName: 'FSUTIL.EXE', source: 'Prefetch', path: 'C:\\Windows\\Prefetch\\FSUTIL.EXE.pf', firstSeen: daysAgo(2), lastSeen: daysAgo(2), executionCount: 4, isSigned: true }),

    // RecentDocs
    makeEntry({ programName: 'cheat_pack_v2.rar', source: 'RecentDocs', path: 'C:\\Users\\player\\Downloads\\cheat_pack_v2.rar', firstSeen: daysAgo(3), lastSeen: daysAgo(3), executionCount: null }),
    makeEntry({ programName: 'tournament_rules.pdf', source: 'RecentDocs', path: 'C:\\Users\\player\\Downloads\\tournament_rules.pdf', firstSeen: daysAgo(7), lastSeen: daysAgo(7), executionCount: null }),

    // ArcHistory (WinRAR)
    makeEntry({ programName: 'cheat_pack_v2.rar', source: 'ArcHistory', path: 'C:\\Users\\player\\Downloads\\cheat_pack_v2.rar', firstSeen: daysAgo(3), lastSeen: daysAgo(3), executionCount: null }),
    makeEntry({ programName: 'aimex_setup.rar', source: 'ArcHistory', path: 'C:\\Users\\player\\Downloads\\aimex_setup.rar', firstSeen: daysAgo(2), lastSeen: daysAgo(2), executionCount: null }),

    // TypedPaths
    makeEntry({ programName: 'C:\\Users\\player\\AppData\\Roaming\\shadow', source: 'TypedPaths', path: 'C:\\Users\\player\\AppData\\Roaming\\shadow', firstSeen: daysAgo(1), lastSeen: daysAgo(1), executionCount: null }),

    // FeatureUsage
    makeEntry({ programName: 'ring1_client.exe', source: 'FeatureUsage', path: 'C:\\Users\\player\\Downloads\\ring1_client.exe', firstSeen: daysAgo(1), lastSeen: daysAgo(1), executionCount: 2, isSigned: false }),
    makeEntry({ programName: 'kratos_client.exe', source: 'FeatureUsage', path: 'C:\\Users\\player\\Downloads\\kratos_client.exe', firstSeen: daysAgo(3), lastSeen: daysAgo(3), executionCount: 2, isSigned: false }),

    // DirectInput (DMA devices)
    makeEntry({ programName: 'Vendor_1234_Product_5678', source: 'DInput', path: 'DMA Capture Device', firstSeen: daysAgo(1), lastSeen: daysAgo(1), executionCount: null }),

    // DLL FileExts
    makeEntry({ programName: 'injector.exe', source: 'FileExts', path: 'C:\\Users\\player\\Downloads\\injector.exe', firstSeen: hoursAgo(8), lastSeen: hoursAgo(8), executionCount: null, isSigned: false }),
  ];
}
