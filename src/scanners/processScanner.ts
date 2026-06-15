import type { ProcessEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

function makeEntry(partial: Partial<ProcessEntry> & { name: string; pid: number; path: string }): ProcessEntry {
  const riskScore = calculateItemRisk({ isSigned: partial.isSigned, path: partial.path });
  return {
    id: generateId(),
    parentPid: 0,
    parentName: '',
    isSigned: true,
    startTime: daysAgo(5),
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanProcesses(): ProcessEntry[] {
  return [
    makeEntry({ name: 'shadow.exe', pid: 4832, path: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', parentPid: 3124, parentName: 'cmd.exe', isSigned: false, startTime: hoursAgo(6) }),
    makeEntry({ name: 'sysmon64.exe', pid: 5104, path: 'C:\\Windows\\Temp\\sysmon64.exe', parentPid: 4, parentName: 'services.exe', isSigned: false, startTime: hoursAgo(2) }),
    makeEntry({ name: 'AutoClicker.exe', pid: 6280, path: 'C:\\Program Files\\AutoClicker\\AutoClicker.exe', parentPid: 5624, parentName: 'explorer.exe', isSigned: false, startTime: hoursAgo(3) }),
    makeEntry({ name: 'explorer.exe', pid: 5624, path: 'C:\\Windows\\explorer.exe', parentPid: 1020, parentName: 'winlogon.exe', isSigned: true, startTime: daysAgo(30) }),
    makeEntry({ name: 'csrss.exe', pid: 648, path: 'C:\\Windows\\System32\\csrss.exe', parentPid: 512, parentName: 'smss.exe', isSigned: true, startTime: daysAgo(30) }),
    makeEntry({ name: 'services.exe', pid: 812, path: 'C:\\Windows\\System32\\services.exe', parentPid: 648, parentName: 'csrss.exe', isSigned: true, startTime: daysAgo(30) }),
    makeEntry({ name: 'svchost.exe', pid: 1024, path: 'C:\\Windows\\System32\\svchost.exe', parentPid: 812, parentName: 'services.exe', isSigned: true, startTime: daysAgo(30) }),
    makeEntry({ name: 'Discord.exe', pid: 3844, path: 'C:\\Users\\player\\AppData\\Local\\Discord\\Discord.exe', parentPid: 5624, parentName: 'explorer.exe', isSigned: true, startTime: hoursAgo(1) }),
    makeEntry({ name: 'chrome.exe', pid: 2956, path: 'C:\\Program Files\\Google\\Chrome\\chrome.exe', parentPid: 5624, parentName: 'explorer.exe', isSigned: true, startTime: hoursAgo(1) }),
    makeEntry({ name: 'Steam.exe', pid: 4412, path: 'C:\\Program Files (x86)\\Steam\\Steam.exe', parentPid: 5624, parentName: 'explorer.exe', isSigned: true, startTime: hoursAgo(2) }),
    makeEntry({ name: 'gameclient.exe', pid: 5692, path: 'C:\\Program Files\\Tournament\\gameclient.exe', parentPid: 4412, parentName: 'Steam.exe', isSigned: true, startTime: hoursAgo(4) }),
    makeEntry({ name: 'winlogon.exe', pid: 1020, path: 'C:\\Windows\\System32\\winlogon.exe', parentPid: 648, parentName: 'csrss.exe', isSigned: true, startTime: daysAgo(30) }),
    makeEntry({ name: 'lsass.exe', pid: 1080, path: 'C:\\Windows\\System32\\lsass.exe', parentPid: 812, parentName: 'services.exe', isSigned: true, startTime: daysAgo(30) }),
    makeEntry({ name: 'Wireshark.exe', pid: 7132, path: 'C:\\Program Files\\Wireshark\\Wireshark.exe', parentPid: 5624, parentName: 'explorer.exe', isSigned: true, startTime: daysAgo(3) }),
    makeEntry({ name: 'cmd.exe', pid: 3124, path: 'C:\\Windows\\System32\\cmd.exe', parentPid: 5624, parentName: 'explorer.exe', isSigned: true, startTime: daysAgo(3) }),
  ];
}
