import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ScanResult, ScanProgress, FlagStatus, DashboardStats, RegistryEntry, EventLogEntry, AppHistoryEntry, ServiceEntry, ProcessEntry, ScheduledTaskEntry, DmaDeviceEntry, FileSystemEntry, SystemInfoEntry } from '../types';
import { scanRegistry, scanEventLogs, scanAppHistory, scanProcesses, scanServicesAndDrivers, scanScheduledTasks, scanDmaDevices, scanFileSystem, scanSystemInfo } from '../scanners';
import { useAccounts, type Exclusion } from './AccountContext';

interface ScanContextValue {
  results: ScanResult;
  progress: ScanProgress[];
  isScanning: boolean;
  activeReview: ReviewScanSession | null;
  startScan: () => void;
  loadReviewScan: (session: ReviewScanSession, results: ScanResult) => void;
  clearReviewScan: () => void;
  updateFlagStatus: (category: string, id: string, status: FlagStatus) => void;
  getStats: () => DashboardStats;
}

export interface ReviewScanSession {
  id: string;
  displayName: string;
  machineName: string;
  submittedBy?: string | null;
  scanTimestamp?: string | null;
}

const emptyResults: ScanResult = {
  registry: [],
  events: [],
  appHistory: [],
  services: [],
  processes: [],
  scheduledTasks: [],
  dmaDevices: [],
  fileSystem: [],
  systemInfo: [],
};

const ScanContext = createContext<ScanContextValue | null>(null);

type ScanItem = RegistryEntry | EventLogEntry | AppHistoryEntry | ServiceEntry | ProcessEntry | ScheduledTaskEntry | DmaDeviceEntry | FileSystemEntry | SystemInfoEntry;

function itemMatchesExclusion(item: ScanItem, exclusions: Exclusion[]): boolean {
  if (exclusions.length === 0) return false;
  const serialized = JSON.stringify(item).toLowerCase();
  return exclusions.some(exclusion => serialized.includes(exclusion.term.toLowerCase()));
}

function applyExclusionsToItems<T extends ScanItem>(items: T[], exclusions: Exclusion[]): T[] {
  if (exclusions.length === 0) return items;
  return items.filter(item => !itemMatchesExclusion(item, exclusions));
}

function applyExclusionsToResults(results: ScanResult, exclusions: Exclusion[]): ScanResult {
  if (exclusions.length === 0) return results;
  return {
    registry: applyExclusionsToItems(results.registry, exclusions),
    events: applyExclusionsToItems(results.events, exclusions),
    appHistory: applyExclusionsToItems(results.appHistory, exclusions),
    services: applyExclusionsToItems(results.services, exclusions),
    processes: applyExclusionsToItems(results.processes, exclusions),
    scheduledTasks: applyExclusionsToItems(results.scheduledTasks, exclusions),
    dmaDevices: applyExclusionsToItems(results.dmaDevices, exclusions),
    fileSystem: applyExclusionsToItems(results.fileSystem, exclusions),
    systemInfo: applyExclusionsToItems(results.systemInfo, exclusions),
  };
}

function getProgressItemCount(results: ScanResult, scannerName: string, currentCount: number): number {
  switch (scannerName) {
    case 'Registry Analysis':
      return results.registry.length;
    case 'Event Viewer':
      return results.events.length;
    case 'Application History':
      return results.appHistory.length;
    case 'Services & Drivers':
      return results.services.length;
    case 'Running Processes':
      return results.processes.length;
    case 'Scheduled Tasks':
      return results.scheduledTasks.length;
    case 'DMA / PCIe Devices':
      return results.dmaDevices.length;
    case 'File System':
      return results.fileSystem.length;
    case 'System Info':
      return results.systemInfo.length;
    default:
      return currentCount;
  }
}

export function ScanProvider({ children }: { children: ReactNode }) {
  const { consumeScanCredit, exclusions } = useAccounts();
  const [results, setResults] = useState<ScanResult>(emptyResults);
  const [progress, setProgress] = useState<ScanProgress[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeReview, setActiveReview] = useState<ReviewScanSession | null>(null);

  useEffect(() => {
    if (exclusions.length === 0) return;
    setResults(prev => applyExclusionsToResults(prev, exclusions));
  }, [exclusions]);

  useEffect(() => {
    setProgress(current => current.map(item => ({
      ...item,
      itemsFound: getProgressItemCount(results, item.scannerName, item.itemsFound),
    })));
  }, [results]);

  const updateProgress = useCallback((name: string, update: Partial<ScanProgress>) => {
    setProgress(prev => {
      const existing = prev.findIndex(p => p.scannerName === name);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], ...update };
        return next;
      }
      return [...prev, { scannerName: name, progress: 0, status: 'idle', itemsFound: 0, ...update }];
    });
  }, []);

  const runScanner = useCallback(async <T extends ScanItem,>(name: string, scanner: () => T[], key: keyof ScanResult): Promise<T[]> => {
    updateProgress(name, { status: 'scanning', progress: 10 });
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    updateProgress(name, { progress: 40 });
    const data = scanner();
    await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
    updateProgress(name, { progress: 80, itemsFound: data.length });
    await new Promise(r => setTimeout(r, 100));
    updateProgress(name, { progress: 100, status: 'complete', itemsFound: data.length });
    const filteredData = applyExclusionsToItems(data, exclusions);
    setResults(prev => ({ ...prev, [key]: filteredData }));
    return data;
  }, [exclusions, updateProgress]);

  const runLivePcScan = useCallback(async () => {
    const scanSteps: [string, keyof ScanResult][] = [
      ['Registry Analysis', 'registry'],
      ['Event Viewer', 'events'],
      ['Application History', 'appHistory'],
      ['Services & Drivers', 'services'],
      ['Running Processes', 'processes'],
      ['Scheduled Tasks', 'scheduledTasks'],
      ['DMA / PCIe Devices', 'dmaDevices'],
      ['File System', 'fileSystem'],
      ['System Info', 'systemInfo'],
    ];

    let simulatedProgress = 0;
    for (const [name] of scanSteps) {
      updateProgress(name, { status: 'scanning', progress: 0 });
    }

    const progressTimer = window.setInterval(() => {
      simulatedProgress = Math.min(92, simulatedProgress + 3);
      for (const [name] of scanSteps) {
        updateProgress(name, { status: 'scanning', progress: simulatedProgress });
      }
    }, 350);

    let filteredResults: ScanResult | null = null;
    try {
      const liveResults = await window.electron!.runPcScan();
      filteredResults = applyExclusionsToResults(liveResults, exclusions);
      setResults(filteredResults);
    } finally {
      window.clearInterval(progressTimer);
    }

    for (const [name, key] of scanSteps) {
      updateProgress(name, {
        status: 'complete',
        progress: 100,
        itemsFound: filteredResults?.[key].length ?? 0,
      });
    }
  }, [exclusions, updateProgress]);

  const startScan = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setActiveReview(null);
    setProgress([]);
    setResults(emptyResults);

    const creditCheck = await consumeScanCredit();
    if (!creditCheck.ok) {
      updateProgress('Account Credits', {
        status: 'error',
        progress: 100,
        error: creditCheck.message,
      });
      setIsScanning(false);
      return;
    }

    if (window.electron?.runPcScan) {
      try {
        await runLivePcScan();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Live PC scan failed';
        updateProgress('Live PC Scan', { status: 'error', progress: 100, error: message });
      } finally {
        setIsScanning(false);
      }
      return;
    }

    const scanners: [string, () => ScanItem[], keyof ScanResult][] = [
      ['Registry Analysis', scanRegistry, 'registry'],
      ['Event Viewer', scanEventLogs, 'events'],
      ['Application History', scanAppHistory, 'appHistory'],
      ['Services & Drivers', scanServicesAndDrivers, 'services'],
      ['Running Processes', scanProcesses, 'processes'],
      ['Scheduled Tasks', scanScheduledTasks, 'scheduledTasks'],
      ['DMA / PCIe Devices', scanDmaDevices, 'dmaDevices'],
      ['File System', scanFileSystem, 'fileSystem'],
      ['System Info', scanSystemInfo, 'systemInfo'],
    ];

    for (const [name, scanner, key] of scanners) {
      await runScanner(name, scanner, key);
    }

    setIsScanning(false);
  }, [consumeScanCredit, isScanning, runLivePcScan, runScanner, updateProgress]);

  const loadReviewScan = useCallback((session: ReviewScanSession, reviewResults: ScanResult) => {
    const filteredResults = applyExclusionsToResults(reviewResults, exclusions);
    const scanSteps: [string, keyof ScanResult][] = [
      ['Registry Analysis', 'registry'],
      ['Event Viewer', 'events'],
      ['Application History', 'appHistory'],
      ['Services & Drivers', 'services'],
      ['Running Processes', 'processes'],
      ['Scheduled Tasks', 'scheduledTasks'],
      ['DMA / PCIe Devices', 'dmaDevices'],
      ['File System', 'fileSystem'],
      ['System Info', 'systemInfo'],
    ];

    setActiveReview(session);
    setIsScanning(false);
    setResults(filteredResults);
    setProgress(scanSteps.map(([scannerName, key]) => ({
      scannerName,
      progress: 100,
      status: 'complete',
      itemsFound: filteredResults[key].length,
    })));
  }, [exclusions]);

  const clearReviewScan = useCallback(() => {
    setActiveReview(null);
    setProgress([]);
    setResults(emptyResults);
  }, []);

  const updateFlagStatus = useCallback((category: string, id: string, status: FlagStatus) => {
    setResults(prev => {
      const key = category as keyof ScanResult;
      const items = prev[key] as (RegistryEntry | EventLogEntry | AppHistoryEntry | ServiceEntry | ProcessEntry | ScheduledTaskEntry | DmaDeviceEntry | FileSystemEntry | SystemInfoEntry)[];
      if (!items) return prev;
      return {
        ...prev,
        [key]: items.map(item => item.id === id ? { ...item, flagStatus: status } : item),
      };
    });
  }, []);

  const getStats = useCallback((): DashboardStats => {
    const allItems = [
      ...results.registry,
      ...results.events,
      ...results.appHistory,
      ...results.services,
      ...results.processes,
      ...results.scheduledTasks,
      ...results.dmaDevices,
      ...results.fileSystem,
      ...results.systemInfo,
    ];
    return {
      totalFindings: allItems.length,
      highRisk: allItems.filter(i => i.riskLevel === 'high').length,
      mediumRisk: allItems.filter(i => i.riskLevel === 'medium').length,
      lowRisk: allItems.filter(i => i.riskLevel === 'low').length,
      flaggedItems: allItems.filter(i => i.flagStatus === 'flagged').length,
      scansComplete: progress.filter(p => p.status === 'complete').length,
      totalScans: 9,
    };
  }, [results, progress]);

  return (
    <ScanContext.Provider value={{ results, progress, isScanning, activeReview, startScan, loadReviewScan, clearReviewScan, updateFlagStatus, getStats }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
