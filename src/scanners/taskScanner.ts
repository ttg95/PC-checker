import type { ScheduledTaskEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

function makeEntry(partial: Partial<ScheduledTaskEntry> & { name: string; executablePath: string }): ScheduledTaskEntry {
  const riskScore = calculateItemRisk({ creationDate: partial.creationDate, path: partial.executablePath });
  return {
    id: generateId(),
    path: `\\${partial.name}`,
    creationDate: daysAgo(30),
    lastRunTime: daysAgo(1),
    nextRunTime: null,
    status: 'ready',
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanScheduledTasks(): ScheduledTaskEntry[] {
  return [
    makeEntry({ name: 'ShadowHelper Task', executablePath: 'C:\\Users\\player\\AppData\\Roaming\\shadow.exe', creationDate: hoursAgo(6), lastRunTime: hoursAgo(6), status: 'ready' }),
    makeEntry({ name: 'SysMonitor Update', executablePath: 'C:\\Windows\\Temp\\sysmon64.exe', creationDate: hoursAgo(2), lastRunTime: null, nextRunTime: null, status: 'ready' }),
    makeEntry({ name: 'GoogleUpdateTaskMachineCore', executablePath: 'C:\\Program Files\\Google\\Update\\GoogleUpdate.exe', creationDate: daysAgo(120), lastRunTime: daysAgo(1), status: 'ready' }),
    makeEntry({ name: 'GoogleUpdateTaskMachineUA', executablePath: 'C:\\Program Files\\Google\\Update\\GoogleUpdate.exe', creationDate: daysAgo(120), lastRunTime: daysAgo(1), status: 'ready' }),
    makeEntry({ name: 'OneDrive Reporting Task', executablePath: 'C:\\Windows\\System32\\OneDriveSettingSyncProvider.exe', creationDate: daysAgo(90), lastRunTime: daysAgo(2), status: 'ready' }),
    makeEntry({ name: 'MicrosoftEdgeUpdateTaskMachineCore', executablePath: 'C:\\Program Files\\Microsoft\\EdgeUpdate\\MicrosoftEdgeUpdate.exe', creationDate: daysAgo(60), lastRunTime: daysAgo(3), status: 'ready' }),
    makeEntry({ name: 'DiskCleanup', executablePath: 'C:\\Windows\\System32\\cleanmgr.exe', creationDate: daysAgo(90), lastRunTime: daysAgo(30), status: 'ready' }),
    makeEntry({ name: 'Windows Defender Scheduled Scan', executablePath: 'C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18\\MpCmdRun.exe', creationDate: daysAgo(90), lastRunTime: daysAgo(1), status: 'ready' }),
    makeEntry({ name: 'AutoClicker Scheduler', executablePath: 'C:\\Program Files\\AutoClicker\\AutoClicker.exe', creationDate: daysAgo(1), lastRunTime: daysAgo(1), status: 'ready' }),
    makeEntry({ name: 'NetworkMonitor', executablePath: 'C:\\Program Files\\Wireshark\\Wireshark.exe', creationDate: daysAgo(14), lastRunTime: daysAgo(3), status: 'disabled' }),
    makeEntry({ name: 'UserTask', executablePath: 'C:\\Windows\\System32\\taskhostw.exe', creationDate: daysAgo(90), lastRunTime: hoursAgo(1), status: 'ready' }),
    makeEntry({ name: 'SysSleep', executablePath: 'C:\\Windows\\System32\\rundll32.exe powrprof.dll,SetSuspendState', creationDate: daysAgo(90), lastRunTime: daysAgo(7), status: 'ready' }),
  ];
}
