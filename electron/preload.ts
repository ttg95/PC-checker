import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  isAdmin: () => ipcRenderer.invoke('app:is-admin'),
  getAdminInfo: () => ipcRenderer.invoke('app:get-admin-info'),
  runPcScan: () => ipcRenderer.invoke('scan:run-pc-scan'),
});
