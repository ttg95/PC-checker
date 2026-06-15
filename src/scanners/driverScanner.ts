import type { ServiceEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

function makeEntry(partial: Partial<ServiceEntry> & { name: string; displayName: string; type: ServiceEntry['type']; status: ServiceEntry['status']; path: string; startType: ServiceEntry['startType'] }): ServiceEntry {
  const riskScore = calculateItemRisk({
    type: partial.type,
    isSigned: partial.isSigned,
    installDate: partial.installDate,
    status: partial.status,
    path: partial.path,
  });
  return {
    id: generateId(),
    installDate: null,
    isSigned: true,
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanServicesAndDrivers(): ServiceEntry[] {
  return [
    makeEntry({ name: 'SysMonitor64', displayName: 'System Monitor 64', type: 'service', status: 'running', path: 'C:\\Windows\\Temp\\sysmon64.exe', startType: 'auto', installDate: daysAgo(2), isSigned: false }),
    makeEntry({ name: 'WinRing0x64', displayName: 'WinRing0x64 Driver', type: 'driver', status: 'running', path: 'C:\\Windows\\Temp\\winring0x64.sys', startType: 'manual', installDate: daysAgo(1), isSigned: false }),
    makeEntry({ name: 'EagleX64', displayName: 'Eagle Security Driver', type: 'driver', status: 'running', path: 'C:\\Windows\\System32\\drivers\\EagleX64.sys', startType: 'system', installDate: daysAgo(2), isSigned: false }),
    makeEntry({ name: 'NPCAP', displayName: 'Npcap Packet Driver', type: 'driver', status: 'running', path: 'C:\\Windows\\System32\\drivers\\npcap.sys', startType: 'manual', installDate: daysAgo(14), isSigned: true }),
    makeEntry({ name: 'WinDefend', displayName: 'Windows Defender Antivirus Service', type: 'service', status: 'running', path: 'C:\\ProgramData\\Microsoft\\Windows Defender\\platform\\4.18\\MsMpEng.exe', startType: 'auto', isSigned: true }),
    makeEntry({ name: 'WdFilter', displayName: 'Windows Defender Filter Driver', type: 'driver', status: 'running', path: 'C:\\Windows\\System32\\drivers\\WdFilter.sys', startType: 'system', isSigned: true }),
    makeEntry({ name: 'wuauserv', displayName: 'Windows Update', type: 'service', status: 'stopped', path: 'C:\\Windows\\System32\\svchost.exe -k netsvcs', startType: 'manual', isSigned: true }),
    makeEntry({ name: 'Bits', displayName: 'Background Intelligent Transfer Service', type: 'service', status: 'running', path: 'C:\\Windows\\System32\\svchost.exe -k netsvcs', startType: 'auto', isSigned: true }),
    makeEntry({ name: 'Schedule', displayName: 'Task Scheduler', type: 'service', status: 'running', path: 'C:\\Windows\\System32\\svchost.exe -k netsvcs', startType: 'auto', isSigned: true }),
    makeEntry({ name: 'EventLog', displayName: 'Windows Event Log', type: 'service', status: 'running', path: 'C:\\Windows\\System32\\svchost.exe -k LocalService', startType: 'auto', isSigned: true }),
    makeEntry({ name: 'DisabledSvc', displayName: 'Disabled Test Service', type: 'service', status: 'disabled', path: 'C:\\Windows\\System32\\test_svc.exe', startType: 'disabled', isSigned: null }),
    makeEntry({ name: 'NdisVirtualBus', displayName: 'NDIS Virtual Bus Driver', type: 'driver', status: 'running', path: 'C:\\Windows\\System32\\drivers\\NdisVirtualBus.sys', startType: 'manual', isSigned: true }),
    makeEntry({ name: 'disk', displayName: 'Disk Driver', type: 'driver', status: 'running', path: 'C:\\Windows\\System32\\drivers\\disk.sys', startType: 'boot', isSigned: true }),
    makeEntry({ name: 'partmgr', displayName: 'Partition Manager', type: 'driver', status: 'running', path: 'C:\\Windows\\System32\\drivers\\partmgr.sys', startType: 'boot', isSigned: true }),
    makeEntry({ name: 'HTTPScanner', displayName: 'HTTP Network Scanner', type: 'service', status: 'stopped', path: 'C:\\Program Files\\HTTPScanner\\scanner.exe', startType: 'manual', installDate: daysAgo(5), isSigned: false }),
  ];
}
