import { useState } from 'react';
import { useScan } from '../../utils/ScanContext';
import type { ReportConfig } from '../../types';
import { getMachineName, formatTimestamp } from '../../utils/id';
import { FileDown, FileJson, FileSpreadsheet, Shield, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export default function ExportReports() {
  const { results, getStats } = useScan();
  const stats = getStats();
  const hasResults = Object.values(results).some(arr => arr.length > 0);

  const [config, setConfig] = useState<ReportConfig>({
    machineName: getMachineName(),
    scanTimestamp: new Date().toISOString(),
    includeRegistry: true,
    includeEvents: true,
    includeAppHistory: true,
    includeServices: true,
    includeProcesses: true,
    includeScheduledTasks: true,
    includeDma: true,
    includeFileSystem: true,
    includeSystemInfo: true,
    flaggedOnly: false,
  });

  const toggle = (key: keyof ReportConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getAllFindings = () => {
    const items: Record<string, unknown>[] = [];
    if (config.includeRegistry) {
      (config.flaggedOnly ? results.registry.filter(i => i.flagStatus === 'flagged') : results.registry)
        .forEach(i => items.push({ category: 'Registry', name: i.keyName, path: i.path, risk: i.riskLevel, score: i.riskScore, timestamp: i.lastWriteTime, flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeEvents) {
      (config.flaggedOnly ? results.events.filter(i => i.flagStatus === 'flagged') : results.events)
        .forEach(i => items.push({ category: 'Event Log', name: i.source, path: i.message, risk: i.riskLevel, score: i.riskScore, timestamp: i.timestamp, flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeAppHistory) {
      (config.flaggedOnly ? results.appHistory.filter(i => i.flagStatus === 'flagged') : results.appHistory)
        .forEach(i => items.push({ category: 'App History', name: i.programName, path: i.path, risk: i.riskLevel, score: i.riskScore, timestamp: i.lastSeen, flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeServices) {
      (config.flaggedOnly ? results.services.filter(i => i.flagStatus === 'flagged') : results.services)
        .forEach(i => items.push({ category: 'Service/Driver', name: i.displayName, path: i.path, risk: i.riskLevel, score: i.riskScore, timestamp: i.installDate || '', flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeProcesses) {
      (config.flaggedOnly ? results.processes.filter(i => i.flagStatus === 'flagged') : results.processes)
        .forEach(i => items.push({ category: 'Process', name: i.name, path: i.path, risk: i.riskLevel, score: i.riskScore, timestamp: i.startTime, flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeScheduledTasks) {
      (config.flaggedOnly ? results.scheduledTasks.filter(i => i.flagStatus === 'flagged') : results.scheduledTasks)
        .forEach(i => items.push({ category: 'Scheduled Task', name: i.name, path: i.executablePath, risk: i.riskLevel, score: i.riskScore, timestamp: i.creationDate, flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeDma) {
      (config.flaggedOnly ? results.dmaDevices.filter(i => i.flagStatus === 'flagged') : results.dmaDevices)
        .forEach(i => items.push({ category: 'DMA/PCIe', name: i.deviceName, path: `${i.vendorId}&${i.deviceId} - ${i.location}`, risk: i.riskLevel, score: i.riskScore, timestamp: '', flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeFileSystem) {
      (config.flaggedOnly ? results.fileSystem.filter(i => i.flagStatus === 'flagged') : results.fileSystem)
        .forEach(i => items.push({ category: 'File System', name: i.name, path: i.path, risk: i.riskLevel, score: i.riskScore, timestamp: i.timestamp, flagged: i.flagStatus === 'flagged' }));
    }
    if (config.includeSystemInfo) {
      (config.flaggedOnly ? results.systemInfo.filter(i => i.flagStatus === 'flagged') : results.systemInfo)
        .forEach(i => items.push({ category: 'System Info', name: i.label, path: i.value, risk: i.riskLevel, score: i.riskScore, timestamp: '', flagged: i.flagStatus === 'flagged' }));
    }
    return items;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const findings = getAllFindings();
    const report = {
      reportHeader: {
        tool: 'PC Checker',
        version: '1.0.0',
        machineName: config.machineName,
        scanTimestamp: config.scanTimestamp,
        summary: stats,
        disclaimer: 'Risk scores indicate "Requires Review" only. This tool never automatically labels software as cheating.',
      },
      findings,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `integrity-audit-${Date.now()}.json`);
  };

  const exportCSV = () => {
    const findings = getAllFindings();
    const csv = Papa.unparse(findings);
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `integrity-audit-${Date.now()}.csv`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(34, 211, 238);
    doc.setFontSize(22);
    doc.text('PC Checker', 14, 22);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(10);
    doc.text('Post-Match Forensic Audit Report', 14, 30);
    doc.text(`Machine: ${config.machineName}`, 14, 38);
    doc.text(`Scan Date: ${formatTimestamp(config.scanTimestamp)}`, 14, 44);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('Risk Summary', 14, 62);
    doc.setFontSize(10);
    doc.text(`Total Findings: ${stats.totalFindings}`, 14, 70);
    doc.text(`High Risk: ${stats.highRisk}`, 14, 76);
    doc.text(`Medium Risk: ${stats.mediumRisk}`, 14, 82);
    doc.text(`Low Risk: ${stats.lowRisk}`, 14, 88);
    doc.text(`Flagged Items: ${stats.flaggedItems}`, 14, 94);

    const findings = getAllFindings();
    if (findings.length > 0) {
      autoTable(doc, {
        startY: 102,
        head: [['Category', 'Name', 'Path', 'Risk', 'Score', 'Flagged']],
        body: findings.map(f => [String(f.category), String(f.name), String(f.path).substring(0, 60), String(f.risk), Number(f.score), f.flagged ? 'Yes' : 'No'] as (string | number)[]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 95] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('DISCLAIMER: Risk scores indicate "Requires Review" only. This tool never automatically labels software as cheating.', 14, finalY + 10);
    doc.text('All analysis is read-only. No modifications were made to the system.', 14, finalY + 15);
    doc.save(`integrity-audit-${Date.now()}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <FileDown className="w-6 h-6 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Export Reports</h1>
          <p className="text-sm text-slate-400">Generate PDF, JSON, and CSV forensic audit reports</p>
        </div>
      </div>

      {!hasResults && (
        <div className="bg-slate-900/60 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-400" />
          <p className="text-sm text-amber-300">No scan data available. Run a scan from the Dashboard first.</p>
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Report Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Machine Name</label>
            <input type="text" value={config.machineName} onChange={e => setConfig(prev => ({ ...prev, machineName: e.target.value }))} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Scan Timestamp</label>
            <input type="text" value={formatTimestamp(config.scanTimestamp)} readOnly className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {([['includeRegistry', 'Registry Analysis'], ['includeEvents', 'Event Viewer'], ['includeAppHistory', 'Application History'], ['includeServices', 'Services & Drivers'], ['includeProcesses', 'Running Processes'], ['includeScheduledTasks', 'Scheduled Tasks'], ['includeDma', 'DMA / PCIe'], ['includeFileSystem', 'File System'], ['includeSystemInfo', 'System Info']] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-pointer hover:border-cyan-500/30 transition-colors">
              <input type="checkbox" checked={config[key] as boolean} onChange={() => toggle(key)} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500/20" />
              <span className="text-sm text-slate-300">{label}</span>
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={config.flaggedOnly} onChange={() => toggle('flaggedOnly')} className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500/20" />
          <span className="text-sm text-slate-300">Export flagged items only</span>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button onClick={exportPDF} disabled={!hasResults} className="flex flex-col items-center gap-3 p-6 bg-slate-900/60 border border-slate-700/50 rounded-xl hover:border-red-500/30 hover:bg-red-500/5 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
          <FileDown className="w-8 h-8 text-red-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-slate-200">PDF Report</span>
          <span className="text-xs text-slate-500">Formatted document</span>
          <Download className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors" />
        </button>
        <button onClick={exportJSON} disabled={!hasResults} className="flex flex-col items-center gap-3 p-6 bg-slate-900/60 border border-slate-700/50 rounded-xl hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
          <FileJson className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-slate-200">JSON Report</span>
          <span className="text-xs text-slate-500">Machine-readable data</span>
          <Download className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
        </button>
        <button onClick={exportCSV} disabled={!hasResults} className="flex flex-col items-center gap-3 p-6 bg-slate-900/60 border border-slate-700/50 rounded-xl hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group disabled:opacity-40 disabled:cursor-not-allowed">
          <FileSpreadsheet className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-slate-200">CSV Report</span>
          <span className="text-xs text-slate-500">Spreadsheet-compatible</span>
          <Download className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors" />
        </button>
      </div>

      {hasResults && (
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Report Preview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><p className="text-2xl font-bold text-white">{getAllFindings().length}</p><p className="text-xs text-slate-400">Items in Report</p></div>
            <div><p className="text-2xl font-bold text-red-400">{getAllFindings().filter(f => f.risk === 'high').length}</p><p className="text-xs text-slate-400">High Risk</p></div>
            <div><p className="text-2xl font-bold text-amber-400">{getAllFindings().filter(f => f.risk === 'medium').length}</p><p className="text-xs text-slate-400">Medium Risk</p></div>
            <div><p className="text-2xl font-bold text-cyan-400">{getAllFindings().filter(f => f.flagged).length}</p><p className="text-xs text-slate-400">Flagged for Review</p></div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4">
        <p className="text-xs text-slate-500 italic">
          DISCLAIMER: All risk scores indicate "Requires Review" status only. This tool never automatically labels
          software as cheating. Findings should be reviewed by qualified anti-cheat staff before any determination is made.
          All analysis is strictly read-only — no modifications are made to the audited system.
        </p>
      </div>
    </div>
  );
}
