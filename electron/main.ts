import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn, spawnSync } from 'child_process';
import * as path from 'path';
import { runPcScan } from './pcScanner';

let mainWindow: BrowserWindow | null = null;

function isRunningAsAdmin(): boolean {
  if (process.platform !== 'win32') {
    return process.getuid?.() === 0;
  }

  const result = spawnSync('net', ['session'], { stdio: 'ignore' });
  return result.status === 0;
}

function quotePowerShellPath(filePath: string): string {
  return `'${filePath.replace(/'/g, "''")}'`;
}

function relaunchAsAdmin(): void {
  const exePath = process.execPath;
  const args = process.argv
    .slice(1)
    .filter(arg => arg !== '--elevated')
    .concat('--elevated')
    .map(arg => `'${arg.replace(/'/g, "''")}'`)
    .join(', ');

  const command = args
    ? `Start-Process -FilePath ${quotePowerShellPath(exePath)} -ArgumentList ${args} -Verb RunAs`
    : `Start-Process -FilePath ${quotePowerShellPath(exePath)} -Verb RunAs`;

  const elevated = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', command], {
    detached: true,
    stdio: 'ignore',
  });

  elevated.on('error', (error) => {
    dialog.showErrorBox('Administrator privileges required', `PC Checker could not request administrator privileges.\n\n${error.message}`);
  });

  elevated.unref();
}

function enforceAdminPrivileges(): boolean {
  if (process.platform !== 'win32' || !app.isPackaged || isRunningAsAdmin()) {
    return true;
  }

  relaunchAsAdmin();
  app.quit();
  return false;
}

ipcMain.handle('app:is-admin', () => isRunningAsAdmin());
ipcMain.handle('app:get-admin-info', () => ({
  isAdmin: isRunningAsAdmin(),
  isPackaged: app.isPackaged,
  platform: process.platform,
  userDataPath: app.getPath('userData'),
  executablePath: process.execPath,
}));
ipcMain.handle('scan:run-pc-scan', () => runPcScan());

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    // In production, load from built files
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('__dirname:', __dirname);
    console.log('Loading index.html from:', indexPath);
    mainWindow.loadFile(indexPath).then(() => {
      console.log('Index.html loaded successfully');
    }).catch((err) => {
      console.error('Failed to load index.html:', err);
    });
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools();
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (!enforceAdminPrivileges()) {
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
