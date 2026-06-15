import type { EventLogEntry } from '../types';
import { generateId, calculateRiskLevel } from '../utils/id';
import { calculateItemRisk } from '../utils/riskEngine';

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

function makeEntry(partial: Partial<EventLogEntry> & { logChannel: string; eventId: number; eventCategory: EventLogEntry['eventCategory']; message: string; source: string }): EventLogEntry {
  const riskScore = calculateItemRisk({ eventCategory: partial.eventCategory });
  return {
    id: generateId(),
    timestamp: daysAgo(5),
    riskScore,
    riskLevel: calculateRiskLevel(riskScore),
    flagStatus: 'unflagged',
    ...partial,
  };
}

export function scanEventLogs(): EventLogEntry[] {
  return [
    // Microsoft-Windows-Partition/Diagnostic (USB plugged in)
    makeEntry({ logChannel: 'Microsoft-Windows-Partition/Diagnostic', eventId: 1000, eventCategory: 'usb_connect', message: 'USB Mass Storage Device connected - E:\\', source: 'Microsoft-Windows-Partition', timestamp: hoursAgo(1) }),
    makeEntry({ logChannel: 'Microsoft-Windows-Partition/Diagnostic', eventId: 1000, eventCategory: 'usb_connect', message: 'USB Device connected - DMA Capture Module', source: 'Microsoft-Windows-Partition', timestamp: daysAgo(2) }),
    makeEntry({ logChannel: 'Microsoft-Windows-Partition/Diagnostic', eventId: 1001, eventCategory: 'usb_disconnect', message: 'USB Mass Storage Device removed - E:\\', source: 'Microsoft-Windows-Partition', timestamp: minsAgo(30) }),

    // Microsoft-Windows-Kernel-PnP/Device Configuration (USB ID 410, delete ID 420)
    makeEntry({ logChannel: 'Microsoft-Windows-Kernel-PnP/Configuration', eventId: 410, eventCategory: 'usb_connect', message: 'USB device installed: USB\\VID_1234&PID_5678\\123456 [Descriptor Failure]', source: 'Microsoft-Windows-Kernel-PnP', timestamp: daysAgo(1) }),
    makeEntry({ logChannel: 'Microsoft-Windows-Kernel-PnP/Configuration', eventId: 410, eventCategory: 'device_config', message: 'PCI Device configured: PCI\\VEN_1234&DEV_5678 - DMA Capture Device', source: 'Microsoft-Windows-Kernel-PnP', timestamp: daysAgo(2) }),
    makeEntry({ logChannel: 'Microsoft-Windows-Kernel-PnP/Configuration', eventId: 420, eventCategory: 'device_delete', message: 'Device deleted: USB\\VID_ABCD&PID_EF01 (USB Ethernet Adapter)', source: 'Microsoft-Windows-Kernel-PnP', timestamp: hoursAgo(3) }),
    makeEntry({ logChannel: 'Microsoft-Windows-Kernel-PnP/Configuration', eventId: 420, eventCategory: 'device_delete', message: 'Device deleted: HID\\VID_1234&PID_5678 (Unknown HID Device)', source: 'Microsoft-Windows-Kernel-PnP', timestamp: daysAgo(1) }),
    makeEntry({ logChannel: 'Microsoft-Windows-Kernel-PnP/Configuration', eventId: 410, eventCategory: 'usb_connect', message: 'Unknown USB Device (Device Descriptor Request Failed)', source: 'Microsoft-Windows-Kernel-PnP', timestamp: daysAgo(2) }),

    // StorageSpaces-Driver
    makeEntry({ logChannel: 'Microsoft-Windows-StorageSpaces-Driver/Operational', eventId: 200, eventCategory: 'other', message: 'Storage pool configuration changed', source: 'Microsoft-Windows-StorageSpaces', timestamp: daysAgo(5) }),

    // VolumeSnapshot-Driver
    makeEntry({ logChannel: 'Microsoft-Windows-VolumeSnapshot-Driver/Operational', eventId: 1, eventCategory: 'other', message: 'Volume snapshot created on C:', source: 'Microsoft-Windows-VolumeSnapshot', timestamp: daysAgo(3) }),

    // Windows Defender Operational
    makeEntry({ logChannel: 'Microsoft-Windows-WindowsDefender/Operational', eventId: 1116, eventCategory: 'defender_threat', message: 'Threat detected: Trojan:Win32/ShadowOverlay (C:\\Users\\player\\AppData\\Roaming\\shadow.exe)', source: 'Microsoft-Windows-WindowsDefender', timestamp: daysAgo(3) }),
    makeEntry({ logChannel: 'Microsoft-Windows-WindowsDefender/Operational', eventId: 1117, eventCategory: 'defender_threat', message: 'Threat quarantined: Trojan:Win32/ShadowOverlay', source: 'Microsoft-Windows-WindowsDefender', timestamp: daysAgo(3) }),
    makeEntry({ logChannel: 'Microsoft-Windows-WindowsDefender/Operational', eventId: 5007, eventCategory: 'defender_exclusion', message: 'Exclusion added: C:\\Users\\player\\AppData\\Roaming\\shadow', source: 'Microsoft-Windows-WindowsDefender', timestamp: daysAgo(4) }),
    makeEntry({ logChannel: 'Microsoft-Windows-WindowsDefender/Operational', eventId: 5007, eventCategory: 'defender_exclusion', message: 'Exclusion added: C:\\Users\\player\\Downloads', source: 'Microsoft-Windows-WindowsDefender', timestamp: daysAgo(4) }),

    // Application Log - ID 3079 (readjournal deleted)
    makeEntry({ logChannel: 'Windows Logs/Application', eventId: 3079, eventCategory: 'journal_delete', message: 'USN Journal read/delete activity detected - fsutil usn readjournal', source: 'Application', timestamp: daysAgo(2) }),
    makeEntry({ logChannel: 'Windows Logs/Application', eventId: 1000, eventCategory: 'app_crash', message: 'Application crash: gameclient.exe (Tournament Client)', source: 'Application Error', timestamp: daysAgo(5) }),
    makeEntry({ logChannel: 'Windows Logs/Application', eventId: 11707, eventCategory: 'other', message: 'Product: Wireshark 4.2 -- Installation completed', source: 'MsiInstaller', timestamp: daysAgo(14) }),

    // System
    makeEntry({ logChannel: 'Windows Logs/System', eventId: 7045, eventCategory: 'service_event', message: 'A new service was installed: EagleX64 (Kernel Driver)', source: 'Service Control Manager', timestamp: daysAgo(2) }),
    makeEntry({ logChannel: 'Windows Logs/System', eventId: 7045, eventCategory: 'service_event', message: 'A new service was installed: WinRing0x64 (Kernel Driver)', source: 'Service Control Manager', timestamp: daysAgo(1) }),

    // Security - process creation
    makeEntry({ logChannel: 'Windows Logs/Security', eventId: 4688, eventCategory: 'other', message: 'Process created: C:\\Users\\player\\AppData\\Roaming\\shadow.exe', source: 'Microsoft-Windows-Security-Auditing', timestamp: hoursAgo(6) }),
    makeEntry({ logChannel: 'Windows Logs/Security', eventId: 4688, eventCategory: 'other', message: 'Process created: C:\\Windows\\System32\\cmd.exe', source: 'Microsoft-Windows-Security-Auditing', timestamp: daysAgo(3) }),
  ];
}
