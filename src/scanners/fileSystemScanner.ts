import type { FileSystemEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

function makeEntry(partial: Partial<FileSystemEntry> & { name: string; category: FileSystemEntry['category']; path: string }): FileSystemEntry {
  const riskScore = calculateItemRisk({ isSigned: partial.isSigned, path: partial.path, category: partial.category });
  return {
    id: generateId(),
    timestamp: daysAgo(5),
    size: null,
    isSigned: null,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanFileSystem(): FileSystemEntry[] {
  return [
    // Prefetch files
    makeEntry({ name: 'SHADOW.EXE-ABC123.pf', category: 'prefetch', path: 'C:\\Windows\\Prefetch\\SHADOW.EXE-ABC123.pf', timestamp: hoursAgo(6), size: 102400, isSigned: false }),
    makeEntry({ name: 'INJECTOR.EXE-DEF456.pf', category: 'prefetch', path: 'C:\\Windows\\Prefetch\\INJECTOR.EXE-DEF456.pf', timestamp: daysAgo(1), size: 81920, isSigned: false }),
    makeEntry({ name: 'LOADER.EXE-GHI012.pf', category: 'prefetch', path: 'C:\\Windows\\Prefetch\\LOADER.EXE-GHI012.pf', timestamp: hoursAgo(12), size: 71680, isSigned: false }),
    makeEntry({ name: 'FSUTIL.EXE.pf', category: 'prefetch', path: 'C:\\Windows\\Prefetch\\FSUTIL.EXE.pf', timestamp: daysAgo(2), size: 40960, isSigned: true }),
    makeEntry({ name: 'CMD.EXE.pf', category: 'prefetch', path: 'C:\\Windows\\Prefetch\\CMD.EXE.pf', timestamp: daysAgo(3), size: 51200, isSigned: true }),
    makeEntry({ name: 'DISCORD.EXE.pf', category: 'prefetch', path: 'C:\\Windows\\Prefetch\\DISCORD.EXE.pf', timestamp: hoursAgo(1), size: 102400, isSigned: true }),

    // Recent files
    makeEntry({ name: 'cheat_pack_v2.rar', category: 'recent', path: 'C:\\Users\\player\\Downloads\\cheat_pack_v2.rar', timestamp: daysAgo(3), size: 5242880 }),
    makeEntry({ name: 'aimex_setup.exe', category: 'recent', path: 'C:\\Users\\player\\Downloads\\aimex_setup.exe', timestamp: daysAgo(2), size: 3145728, isSigned: false }),
    makeEntry({ name: 'loader.exe', category: 'recent', path: 'C:\\Users\\player\\AppData\\Local\\Temp\\loader.exe', timestamp: hoursAgo(12), size: 1048576, isSigned: false }),
    makeEntry({ name: 'injector.exe', category: 'recent', path: 'C:\\Users\\player\\Downloads\\injector.exe', timestamp: daysAgo(1), size: 524288, isSigned: false }),
    makeEntry({ name: 'tournament_rules.pdf', category: 'recent', path: 'C:\\Users\\player\\Downloads\\tournament_rules.pdf', timestamp: daysAgo(7), size: 2097152 }),

    // Crash dumps
    makeEntry({ name: 'gameclient.exe.12345.dmp', category: 'crash_dump', path: 'C:\\Users\\player\\AppData\\Local\\CrashDumps\\gameclient.exe.12345.dmp', timestamp: daysAgo(5), size: 104857600 }),
    makeEntry({ name: 'shadow.exe.67890.dmp', category: 'crash_dump', path: 'C:\\Users\\player\\AppData\\Local\\CrashDumps\\shadow.exe.67890.dmp', timestamp: daysAgo(2), size: 52428800, isSigned: false }),

    // Recycle bin
    makeEntry({ name: '$I5J4K2L.exe', category: 'recycle_bin', path: 'C:\\$Recycle.Bin\\S-1-5-21-...\\$I5J4K2L.exe', timestamp: daysAgo(1), size: 2097152, isSigned: false }),
    makeEntry({ name: '$R5J4K2L.exe', category: 'recycle_bin', path: 'C:\\$Recycle.Bin\\S-1-5-21-...\\$R5J4K2L.exe', timestamp: daysAgo(1), size: 2097152, isSigned: false }),

    // PSReadline history
    makeEntry({ name: 'ConsoleHost_history.txt', category: 'psreadline', path: 'C:\\Users\\player\\AppData\\Local\\Microsoft\\Windows\\PowerShell\\ReadLine\\ConsoleHost_history.txt', timestamp: daysAgo(1), size: 4096 }),
    makeEntry({ name: 'Commands.txt', category: 'doskey_history', path: 'C:\\Commands.txt', timestamp: daysAgo(2), size: 8192 }),

    // USN Journal findings
    makeEntry({ name: 'RenamedFiles.txt', category: 'usn_journal', path: 'C:\\RenamedFiles.txt', timestamp: daysAgo(2), size: 16384 }),
    makeEntry({ name: 'Deletedxx.txt', category: 'usn_journal', path: 'C:\\Deletedxx.txt', timestamp: daysAgo(2), size: 8192 }),
    makeEntry({ name: 'pf.txt', category: 'usn_journal', path: 'C:\\pf.txt', timestamp: daysAgo(2), size: 4096 }),
    makeEntry({ name: 'client.txt', category: 'usn_journal', path: 'C:\\client.txt', timestamp: daysAgo(2), size: 12288 }),
    makeEntry({ name: 'journal.txt', category: 'usn_journal', path: 'C:\\journal.txt', timestamp: daysAgo(2), size: 32768 }),

    // EFI partition
    makeEntry({ name: 'EFI System Partition', category: 'efi_partition', path: 'Volume 3 (EFI) - 100MB - FAT32', timestamp: daysAgo(90), size: 104857600 }),

    // Encrypted files check
    makeEntry({ name: 'E: Encrypted', category: 'encrypted', path: 'E:\\ - CIPHER /E detected', timestamp: daysAgo(1), size: null }),

    // DLL OpenWith
    makeEntry({ name: 'injector.exe', category: 'dll_openwith', path: 'HKCU\\...\\FileExts\\.dll\\OpenWithList -> injector.exe', timestamp: hoursAgo(8), isSigned: false }),

    // WinRAR history
    makeEntry({ name: 'cheat_pack_v2.rar', category: 'winrar_history', path: 'HKCU\\Software\\WinRAR\\ArcHistory -> cheat_pack_v2.rar', timestamp: daysAgo(3) }),
    makeEntry({ name: 'aimex_setup.rar', category: 'winrar_history', path: 'HKCU\\SOFTWARE\\WinRAR\\DialogEditHistory\\ArcName -> aimex_setup.rar', timestamp: daysAgo(2) }),

    // Hidden folders
    makeEntry({ name: 'shadow', category: 'hidden_folder', path: 'C:\\Users\\player\\AppData\\Roaming\\shadow (Hidden)', timestamp: daysAgo(3), isSigned: false }),

    // Restore point
    makeEntry({ name: 'Manual Restore Point', category: 'restore_point', path: 'System Restore - Manually created on ' + daysAgo(2), timestamp: daysAgo(2) }),
  ];
}
