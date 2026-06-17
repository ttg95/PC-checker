import { execFile } from 'child_process';
import * as os from 'os';
import * as path from 'path';

type RiskLevel = 'none' | 'low' | 'medium' | 'high';
type FlagStatus = 'unflagged' | 'flagged' | 'dismissed';

type ScanResult = {
  registry: Record<string, unknown>[];
  events: Record<string, unknown>[];
  appHistory: Record<string, unknown>[];
  services: Record<string, unknown>[];
  processes: Record<string, unknown>[];
  scheduledTasks: Record<string, unknown>[];
  dmaDevices: Record<string, unknown>[];
  fileSystem: Record<string, unknown>[];
  systemInfo: Record<string, unknown>[];
};

const cheatProviders = [
  'shadow',
  'phantom overlay',
  'phantom',
  'engineowning',
  'ac diamond',
  'cobalt',
  "lone's",
  'atomic',
  'aimex',
  'clutch',
  'kratos',
  'ducks',
  'ring-1',
  'ring1',
  'dma',
  'injector',
  'loader',
  'cheat engine',
  'cheatengine',
  'autoclicker',
];

const suspiciousPaths = ['\\appdata\\', '\\temp\\', '\\downloads\\', '\\public\\', '\\tmp\\'];
const suspiciousEventWords = ['exclusion', 'threat', 'quarantine', 'deleted', 'descriptor request failed', 'dma', 'injector', 'loader'];

function id(prefix: string, stable: string): string {
  return `${prefix}-${Buffer.from(stable).toString('base64url').slice(0, 24)}`;
}

function riskLevel(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 10) return 'low';
  return 'none';
}

function isKnownReference(value: string): boolean {
  const lower = value.toLowerCase();
  return cheatProviders.some(provider => lower.includes(provider));
}

function scoreItem(input: {
  text?: string;
  path?: string;
  isSigned?: boolean | null;
  category?: string;
  type?: string;
  eventCategory?: string;
}): number {
  const text = `${input.text || ''} ${input.path || ''}`.toLowerCase();
  let score = 0;

  if (isKnownReference(text)) score += 70;
  if (input.isSigned === false) score += 25;
  if (input.path && suspiciousPaths.some(part => input.path!.toLowerCase().includes(part))) score += 25;
  if (input.type === 'driver' && input.isSigned === false) score += 45;
  if (input.category === 'defender_exclusion') score += 55;
  if (input.category === 'dll_openwith') score += 45;
  if (input.category === 'winrar_history') score += 30;
  if (input.category === 'prefetch' && isKnownReference(text)) score += 35;
  if (input.category === 'hidden_folder') score += 20;
  if (input.category === 'encrypted' || input.category === 'cipher_status') score += 20;
  if (input.category === 'restore_point') score += 15;
  if (input.eventCategory === 'journal_delete') score += 50;
  if (input.eventCategory === 'usb_connect' || input.eventCategory === 'device_delete') score += 35;
  if (input.eventCategory === 'defender_threat' || input.eventCategory === 'defender_exclusion') score += 55;
  if (suspiciousEventWords.some(word => text.includes(word))) score += 15;

  return Math.min(score, 100);
}

function withRisk<T extends Record<string, unknown>>(
  item: T,
  input: Parameters<typeof scoreItem>[0],
): T & { riskScore: number; riskLevel: RiskLevel; flagStatus: FlagStatus } {
  const riskScore = scoreItem(input);
  return {
    ...item,
    riskScore,
    riskLevel: riskLevel(riskScore),
    flagStatus: 'unflagged',
  };
}

function normalizeDate(value: unknown): string {
  if (!value) return new Date().toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function psString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function runPowerShell<T>(script: string, timeoutMs = 30000): Promise<T[]> {
  if (process.platform !== 'win32') return [];

  return new Promise(resolve => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$ErrorActionPreference = 'SilentlyContinue'; $ProgressPreference = 'SilentlyContinue'; & { ${script} } | ConvertTo-Json -Depth 8 -Compress`,
      ],
      {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 30 * 1024 * 1024,
      },
      (_error, stdout) => {
        const trimmed = stdout.trim();
        if (!trimmed) {
          resolve([]);
          return;
        }

        try {
          const parsed = JSON.parse(trimmed);
          resolve(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

async function scanProcesses() {
  const rows = await runPowerShell<{
    Name?: string;
    ProcessId?: number;
    ParentProcessId?: number;
    ParentName?: string;
    ExecutablePath?: string;
    CreationDate?: string;
    IsSigned?: boolean | null;
  }>(`
    $processes = Get-CimInstance Win32_Process | Select-Object -First 500
    $lookup = @{}
    foreach ($p in $processes) { $lookup[[int]$p.ProcessId] = $p.Name }
    foreach ($p in $processes) {
      $signed = $null
      if ($p.ExecutablePath -and (Test-Path -LiteralPath $p.ExecutablePath)) {
        $sig = Get-AuthenticodeSignature -LiteralPath $p.ExecutablePath
        $signed = ($sig.Status -eq 'Valid')
      }
      [pscustomobject]@{
        Name = $p.Name
        ProcessId = [int]$p.ProcessId
        ParentProcessId = [int]$p.ParentProcessId
        ParentName = $lookup[[int]$p.ParentProcessId]
        ExecutablePath = $p.ExecutablePath
        CreationDate = if ($p.CreationDate) { $p.CreationDate.ToString('o') } else { $null }
        IsSigned = $signed
      }
    }
  `);

  return rows.map(row => {
    const filePath = row.ExecutablePath || '';
    return withRisk({
      id: id('process', `${row.ProcessId}-${filePath}`),
      name: row.Name || 'Unknown',
      pid: Number(row.ProcessId || 0),
      parentPid: Number(row.ParentProcessId || 0),
      parentName: row.ParentName || '',
      path: filePath,
      isSigned: row.IsSigned ?? null,
      startTime: normalizeDate(row.CreationDate),
    }, {
      text: row.Name || '',
      path: filePath,
      isSigned: row.IsSigned ?? null,
    });
  });
}

async function scanServicesAndDrivers() {
  const rows = await runPowerShell<{
    Name?: string;
    DisplayName?: string;
    Type?: string;
    State?: string;
    StartMode?: string;
    PathName?: string;
    IsSigned?: boolean | null;
  }>(`
    $services = Get-CimInstance Win32_Service | Select-Object -First 500 | ForEach-Object {
      [pscustomobject]@{ Name=$_.Name; DisplayName=$_.DisplayName; Type='service'; State=$_.State; StartMode=$_.StartMode; PathName=$_.PathName }
    }
    $drivers = Get-CimInstance Win32_SystemDriver | Select-Object -First 500 | ForEach-Object {
      [pscustomobject]@{ Name=$_.Name; DisplayName=$_.DisplayName; Type='driver'; State=$_.State; StartMode=$_.StartMode; PathName=$_.PathName }
    }
    foreach ($item in @($services + $drivers)) {
      $candidate = $item.PathName
      if ($candidate) {
        $candidate = ($candidate -replace '^"', '') -replace '" .*$', ''
        if ($candidate -match '^([^ ]+\\.(exe|sys|dll))') { $candidate = $matches[1] }
      }
      $signed = $null
      if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $sig = Get-AuthenticodeSignature -LiteralPath $candidate
        $signed = ($sig.Status -eq 'Valid')
      }
      [pscustomobject]@{
        Name=$item.Name
        DisplayName=$item.DisplayName
        Type=$item.Type
        State=$item.State
        StartMode=$item.StartMode
        PathName=$item.PathName
        IsSigned=$signed
      }
    }
  `);

  return rows.map(row => {
    const type = row.Type === 'driver' ? 'driver' : 'service';
    const status = String(row.State || '').toLowerCase() === 'running'
      ? 'running'
      : String(row.StartMode || '').toLowerCase() === 'disabled'
        ? 'disabled'
        : 'stopped';
    const startMode = String(row.StartMode || '').toLowerCase();
    const startType = startMode.includes('auto')
      ? 'auto'
      : startMode.includes('disabled')
        ? 'disabled'
        : startMode.includes('boot')
          ? 'boot'
          : startMode.includes('system')
            ? 'system'
            : 'manual';
    const filePath = row.PathName || '';

    return withRisk({
      id: id('service', `${row.Name}-${filePath}`),
      name: row.Name || 'Unknown',
      displayName: row.DisplayName || row.Name || 'Unknown',
      type,
      status,
      path: filePath,
      startType,
      installDate: null,
      isSigned: row.IsSigned ?? null,
    }, {
      text: `${row.Name || ''} ${row.DisplayName || ''}`,
      path: filePath,
      isSigned: row.IsSigned ?? null,
      type,
    });
  });
}

async function scanScheduledTasks() {
  const rows = await runPowerShell<{
    TaskName?: string;
    TaskPath?: string;
    State?: string;
    LastRunTime?: string;
    NextRunTime?: string;
    Created?: string;
    Action?: string;
  }>(`
    Get-ScheduledTask | Select-Object -First 500 | ForEach-Object {
      $info = $_ | Get-ScheduledTaskInfo
      $action = ($_.Actions | ForEach-Object { ($_.Execute + ' ' + $_.Arguments).Trim() }) -join '; '
      [pscustomobject]@{
        TaskName=$_.TaskName
        TaskPath=$_.TaskPath
        State=$_.State.ToString()
        LastRunTime=if ($info.LastRunTime) { $info.LastRunTime.ToString('o') } else { $null }
        NextRunTime=if ($info.NextRunTime) { $info.NextRunTime.ToString('o') } else { $null }
        Created=if ($_.Date) { ([datetime]$_.Date).ToString('o') } else { $null }
        Action=$action
      }
    }
  `);

  return rows.map(row => {
    const state = String(row.State || '').toLowerCase();
    const status = state.includes('running') ? 'running' : state.includes('disabled') ? 'disabled' : state.includes('queued') ? 'queued' : 'ready';
    const executablePath = row.Action || '';

    return withRisk({
      id: id('task', `${row.TaskPath}${row.TaskName}${executablePath}`),
      name: row.TaskName || 'Unknown',
      path: `${row.TaskPath || '\\'}${row.TaskName || ''}`,
      creationDate: normalizeDate(row.Created),
      lastRunTime: row.LastRunTime ? normalizeDate(row.LastRunTime) : null,
      nextRunTime: row.NextRunTime ? normalizeDate(row.NextRunTime) : null,
      status,
      executablePath,
    }, {
      text: `${row.TaskName || ''} ${executablePath}`,
      path: executablePath,
    });
  });
}

async function scanRegistry() {
  const registryPaths = [
    'HKCU:\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\MuiCache',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Store',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Compatibility Assistant\\Persisted',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.dll\\OpenWithList',
    'HKCU:\\Software\\WinRAR\\ArcHistory',
    'HKCU:\\SOFTWARE\\WinRAR\\DialogEditHistory\\ArcName',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\TypedPaths',
    'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer\\DisallowRun',
    'HKLM:\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Paths',
    'HKLM:\\SOFTWARE\\Microsoft\\Windows Defender\\Exclusions\\Processes',
    'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\PCI',
    'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USB',
  ];

  const rows = await runPowerShell<{
    Path?: string;
    KeyName?: string;
    ValueData?: string;
    Category?: string;
    IsSigned?: boolean | null;
  }>(`
    $paths = @(${registryPaths.map(psString).join(',')})
    foreach ($path in $paths) {
      if (Test-Path $path) {
        Get-ItemProperty -Path $path -ErrorAction SilentlyContinue | ForEach-Object {
          $base = $_.PSPath -replace '^Microsoft.PowerShell.Core\\\\Registry::', ''
          $_.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
            $value = [string]$_.Value
            $name = [string]$_.Name
            $signed = $null
            $candidate = if ($name -match '^[A-Za-z]:\\\\') { $name -replace '\\\\.FriendlyAppName$', '' } elseif ($value -match '^[A-Za-z]:\\\\') { $value } else { $null }
            if ($candidate -and (Test-Path -LiteralPath $candidate)) {
              $sig = Get-AuthenticodeSignature -LiteralPath $candidate
              $signed = ($sig.Status -eq 'Valid')
            }
            [pscustomobject]@{
              Path=$base
              KeyName=$name
              ValueData=$value
              Category=if ($base -match 'Uninstall') { 'uninstall' } elseif ($base -match 'Run|Startup') { 'startup' } elseif ($base -match 'MuiCache') { 'sign_media' } else { 'primary' }
              IsSigned=$signed
            }
          }
        }
      }
    }
  `);

  return rows
    .filter(row => `${row.KeyName || ''} ${row.ValueData || ''}`.trim())
    .map(row => {
      const category = ['primary', 'secondary', 'startup', 'uninstall', 'sign_media'].includes(String(row.Category))
        ? String(row.Category)
        : 'primary';
      return withRisk({
        id: id('registry', `${row.Path}-${row.KeyName}-${row.ValueData}`),
        path: row.Path || '',
        keyName: row.KeyName || '',
        valueData: row.ValueData || '',
        lastWriteTime: new Date().toISOString(),
        category,
        isSigned: row.IsSigned ?? null,
      }, {
        text: `${row.KeyName || ''} ${row.ValueData || ''}`,
        path: `${row.Path || ''} ${row.ValueData || ''}`,
        isSigned: row.IsSigned ?? null,
        category: String(row.Category),
      });
    });
}

async function scanEventLogs() {
  const rows = await runPowerShell<{
    LogName?: string;
    Id?: number;
    TimeCreated?: string;
    ProviderName?: string;
    Message?: string;
  }>(`
    $queries = @(
      @{ LogName='System'; Id=@(20001,20003,20004,219,410,420,7045) },
      @{ LogName='Application'; Id=@(1000,11707,3079) },
      @{ LogName='Microsoft-Windows-Windows Defender/Operational'; Id=@(1116,1117,5007) },
      @{ LogName='Microsoft-Windows-Kernel-PnP/Configuration'; Id=@(410,420) },
      @{ LogName='Microsoft-Windows-Partition/Diagnostic'; Id=@(1000,1001) },
      @{ LogName='Microsoft-Windows-DriverFrameworks-UserMode/Operational'; Id=@(2003,2004,2100,2101,2102) }
    )
    foreach ($query in $queries) {
      Get-WinEvent -FilterHashtable @{ LogName=$query.LogName; Id=$query.Id; StartTime=(Get-Date).AddDays(-45) } -MaxEvents 100 -ErrorAction SilentlyContinue |
        ForEach-Object {
          [pscustomobject]@{
            LogName=$_.LogName
            Id=$_.Id
            TimeCreated=$_.TimeCreated.ToString('o')
            ProviderName=$_.ProviderName
            Message=$_.Message
          }
        }
    }
  `, 45000);

  return rows.map(row => {
    const text = `${row.ProviderName || ''} ${row.Message || ''}`;
    const lower = text.toLowerCase();
    const idValue = Number(row.Id || 0);
    const isDisconnect = [1001, 20003, 20004, 2004, 2102].includes(idValue)
      || lower.includes('removed')
      || lower.includes('disconnect')
      || lower.includes('unplug')
      || lower.includes('surprise removal');
    const isConnect = [1000, 20001, 2003, 2100, 2101].includes(idValue)
      || lower.includes('connected')
      || lower.includes('started')
      || lower.includes('arrived')
      || lower.includes('configured');
    const eventCategory = idValue === 420
      ? 'device_delete'
      : isDisconnect
        ? 'usb_disconnect'
        : idValue === 410 || isConnect || lower.includes('usb')
          ? 'usb_connect'
        : row.Id === 1116 || row.Id === 1117
          ? 'defender_threat'
          : row.Id === 5007
            ? 'defender_exclusion'
            : row.Id === 1000
              ? 'app_crash'
              : row.Id === 3079
                ? 'journal_delete'
                : row.Id === 7045
                  ? 'service_event'
                  : 'other';

    return withRisk({
      id: id('event', `${row.LogName}-${row.Id}-${row.TimeCreated}-${row.Message}`),
      logChannel: row.LogName || '',
      eventId: Number(row.Id || 0),
      eventCategory,
      timestamp: normalizeDate(row.TimeCreated),
      message: row.Message || '',
      source: row.ProviderName || '',
    }, {
      text,
      eventCategory,
    });
  });
}

async function scanFileSystem() {
  const home = os.homedir();
  const paths = [
    { category: 'prefetch', value: 'C:\\Windows\\Prefetch', filter: '*.pf' },
    { category: 'recent', value: path.join(home, 'AppData\\Roaming\\Microsoft\\Windows\\Recent'), filter: '*' },
    { category: 'crash_dump', value: path.join(home, 'AppData\\Local\\CrashDumps'), filter: '*' },
    { category: 'psreadline', value: path.join(home, 'AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine'), filter: '*.txt' },
    { category: 'recycle_bin', value: 'C:\\$Recycle.Bin', filter: '*' },
  ];

  const rows = await runPowerShell<{
    Name?: string;
    FullName?: string;
    Length?: number | null;
    LastWriteTime?: string;
    Category?: string;
    IsSigned?: boolean | null;
  }>(`
    $targets = @(
      ${paths.map(item => `[pscustomobject]@{ Category=${psString(item.category)}; Path=${psString(item.value)}; Filter=${psString(item.filter)} }`).join('\n      ')}
    )
    foreach ($target in $targets) {
      if (Test-Path -LiteralPath $target.Path) {
        Get-ChildItem -LiteralPath $target.Path -Filter $target.Filter -Force -Recurse -ErrorAction SilentlyContinue |
          Select-Object -First 300 |
          ForEach-Object {
            $signed = $null
            if ($_.Extension -match '\\.(exe|dll|sys)$') {
              $sig = Get-AuthenticodeSignature -LiteralPath $_.FullName
              $signed = ($sig.Status -eq 'Valid')
            }
            [pscustomobject]@{
              Name=$_.Name
              FullName=$_.FullName
              Length=if ($_.PSIsContainer) { $null } else { $_.Length }
              LastWriteTime=$_.LastWriteTime.ToString('o')
              Category=$target.Category
              IsSigned=$signed
            }
          }
      }
    }
    Get-ChildItem -LiteralPath ${psString(home)} -Directory -Force -Recurse -Depth 3 -ErrorAction SilentlyContinue |
      Where-Object { $_.Attributes -band [IO.FileAttributes]::Hidden } |
      Select-Object -First 100 |
      ForEach-Object {
        [pscustomobject]@{ Name=$_.Name; FullName=$_.FullName; Length=$null; LastWriteTime=$_.LastWriteTime.ToString('o'); Category='hidden_folder'; IsSigned=$null }
      }
  `, 45000);

  return rows.map(row => {
    const category = String(row.Category || 'recent');
    return withRisk({
      id: id('file', `${row.FullName}-${row.LastWriteTime}`),
      name: row.Name || 'Unknown',
      category,
      path: row.FullName || '',
      timestamp: normalizeDate(row.LastWriteTime),
      size: row.Length ?? null,
      isSigned: row.IsSigned ?? null,
    }, {
      text: row.Name || '',
      path: row.FullName || '',
      isSigned: row.IsSigned ?? null,
      category,
    });
  });
}

async function scanDmaDevices() {
  const rows = await runPowerShell<{
    DeviceId?: string;
    Name?: string;
    Manufacturer?: string;
    Status?: string;
    PNPClass?: string;
  }>(`
    Get-CimInstance Win32_PnPEntity |
      Where-Object { $_.PNPDeviceID -match '^(PCI|USB|THUNDERBOLT|ROOT)' } |
      Select-Object -First 500 |
      ForEach-Object {
        [pscustomobject]@{
          DeviceId=$_.PNPDeviceID
          Name=$_.Name
          Manufacturer=$_.Manufacturer
          Status=$_.Status
          PNPClass=$_.PNPClass
        }
      }
  `);

  return rows.map(row => {
    const deviceId = row.DeviceId || '';
    const busType = deviceId.startsWith('PCI') ? 'PCIe' : deviceId.startsWith('USB') ? 'USB' : deviceId.toLowerCase().includes('thunderbolt') ? 'Thunderbolt' : 'Unknown';
    const vendorId = deviceId.match(/VEN_([A-Fa-f0-9]+)/)?.[1] || deviceId.match(/VID_([A-Fa-f0-9]+)/)?.[1] || 'Unknown';
    const deviceCode = deviceId.match(/DEV_([A-Fa-f0-9]+)/)?.[1] || deviceId.match(/PID_([A-Fa-f0-9]+)/)?.[1] || 'Unknown';

    return withRisk({
      id: id('device', deviceId),
      deviceId: deviceCode,
      vendorId,
      deviceName: row.Name || 'Unknown device',
      location: deviceId,
      busType,
      driverInstalled: String(row.Status || '').toUpperCase() === 'OK',
      isHidden: false,
      isSigned: null,
    }, {
      text: `${row.Name || ''} ${row.Manufacturer || ''} ${deviceId}`,
      path: deviceId,
      category: busType === 'PCIe' || busType === 'Thunderbolt' ? 'dma' : undefined,
    });
  });
}

async function scanSystemInfo(processes: Record<string, unknown>[], services: Record<string, unknown>[]) {
  const rows = await runPowerShell<{
    Category?: string;
    Label?: string;
    Value?: string;
    Detail?: string;
  }>(`
    $cs = Get-CimInstance Win32_ComputerSystemProduct
    $bios = Get-CimInstance Win32_BIOS
    $os = Get-CimInstance Win32_OperatingSystem
    [pscustomobject]@{ Category='hwid'; Label='UUID'; Value=$cs.UUID; Detail='Win32_ComputerSystemProduct.UUID' }
    [pscustomobject]@{ Category='hwid'; Label='Product Name'; Value=$cs.Name; Detail='Win32_ComputerSystemProduct.Name' }
    [pscustomobject]@{ Category='bios_info'; Label='BIOS Serial'; Value=$bios.SerialNumber; Detail='Win32_BIOS.SerialNumber' }
    [pscustomobject]@{ Category='install_date'; Label='Windows Install Date'; Value=$os.InstallDate.ToString('o'); Detail='Win32_OperatingSystem.InstallDate' }
    Get-LocalUser | Select-Object -First 100 | ForEach-Object {
      [pscustomobject]@{ Category='user_account'; Label=('User: ' + $_.Name); Value=$_.SID.Value; Detail=('Enabled=' + $_.Enabled) }
    }
    $pref = Get-MpPreference
    foreach ($path in @($pref.ExclusionPath)) { [pscustomobject]@{ Category='defender_exclusion'; Label=('Path Exclusion: ' + $path); Value=$path; Detail='Get-MpPreference.ExclusionPath' } }
    foreach ($proc in @($pref.ExclusionProcess)) { [pscustomobject]@{ Category='defender_exclusion'; Label=('Process Exclusion: ' + $proc); Value=$proc; Detail='Get-MpPreference.ExclusionProcess' } }
    Get-Volume | Select-Object -First 50 | ForEach-Object {
      [pscustomobject]@{ Category='disk_volume'; Label=('Volume ' + $_.DriveLetter); Value=($_.FileSystem + ' ' + $_.SizeRemaining + '/' + $_.Size); Detail=$_.Path }
    }
    Get-ComputerRestorePoint -ErrorAction SilentlyContinue | Select-Object -First 50 | ForEach-Object {
      [pscustomobject]@{ Category='restore_point'; Label=$_.Description; Value=$_.CreationTime; Detail=$_.RestorePointType }
    }
  `, 45000);

  const baseRows = rows.map(row => {
    const category = String(row.Category || 'tasklist');
    return withRisk({
      id: id('system', `${row.Category}-${row.Label}-${row.Value}`),
      category,
      label: row.Label || 'Unknown',
      value: row.Value || '',
      detail: row.Detail || '',
    }, {
      text: `${row.Label || ''} ${row.Value || ''} ${row.Detail || ''}`,
      path: row.Value || '',
      category,
    });
  });

  const tasklistRows = processes.slice(0, 100).map(process => withRisk({
    id: id('system-task', `${process.pid}-${process.path}`),
    category: 'tasklist',
    label: `${process.name || 'Unknown'} (PID: ${process.pid || 0})`,
    value: String(process.path || ''),
    detail: `Parent: ${process.parentName || ''}`,
  }, {
    text: String(process.name || ''),
    path: String(process.path || ''),
    isSigned: process.isSigned as boolean | null,
    category: 'tasklist',
  }));

  const driverRows = services
    .filter(service => service.type === 'driver')
    .slice(0, 100)
    .map(service => withRisk({
      id: id('system-driver', `${service.name}-${service.path}`),
      category: 'driver_list',
      label: String(service.displayName || service.name || 'Unknown'),
      value: String(service.path || ''),
      detail: `Status: ${service.status || ''}; Start: ${service.startType || ''}`,
    }, {
      text: String(service.displayName || service.name || ''),
      path: String(service.path || ''),
      isSigned: service.isSigned as boolean | null,
      category: 'driver_list',
      type: 'driver',
    }));

  return [...baseRows, ...tasklistRows, ...driverRows];
}

async function scanAppHistory(registry: Record<string, unknown>[], fileSystem: Record<string, unknown>[]) {
  const registryRows = registry
    .filter(item => {
      const text = `${item.keyName || ''} ${item.valueData || ''}`;
      return /\\|\.exe|\.dll|\.sys/i.test(text);
    })
    .slice(0, 300)
    .map(item => {
      const candidate = String(item.keyName || item.valueData || '');
      return withRisk({
        id: id('apphistory-reg', `${item.path}-${candidate}`),
        programName: path.basename(candidate.replace(/\.FriendlyAppName$/i, '')) || candidate,
        source: String(item.path || '').includes('MuiCache') ? 'MuiCache' : String(item.path || '').includes('AppCompatFlags') ? 'CompatAssistant' : 'FeatureUsage',
        firstSeen: String(item.lastWriteTime || new Date().toISOString()),
        lastSeen: String(item.lastWriteTime || new Date().toISOString()),
        executionCount: null,
        path: candidate,
        isSigned: item.isSigned ?? null,
      }, {
        text: candidate,
        path: candidate,
        isSigned: item.isSigned as boolean | null,
      });
    });

  const prefetchRows = fileSystem
    .filter(item => item.category === 'prefetch')
    .slice(0, 200)
    .map(item => withRisk({
      id: id('apphistory-prefetch', String(item.path || item.name || '')),
      programName: String(item.name || '').replace(/-[A-F0-9]+\.pf$/i, '').replace(/\.pf$/i, ''),
      source: 'Prefetch',
      firstSeen: String(item.timestamp || new Date().toISOString()),
      lastSeen: String(item.timestamp || new Date().toISOString()),
      executionCount: null,
      path: String(item.path || ''),
      isSigned: item.isSigned ?? null,
    }, {
      text: String(item.name || ''),
      path: String(item.path || ''),
      isSigned: item.isSigned as boolean | null,
      category: 'prefetch',
    }));

  return [...registryRows, ...prefetchRows];
}

export async function runPcScan(): Promise<ScanResult> {
  const [processes, services, scheduledTasks, registry, events, fileSystem, dmaDevices] = await Promise.all([
    scanProcesses(),
    scanServicesAndDrivers(),
    scanScheduledTasks(),
    scanRegistry(),
    scanEventLogs(),
    scanFileSystem(),
    scanDmaDevices(),
  ]);

  const [systemInfo, appHistory] = await Promise.all([
    scanSystemInfo(processes, services),
    scanAppHistory(registry, fileSystem),
  ]);

  return {
    registry,
    events,
    appHistory,
    services,
    processes,
    scheduledTasks,
    dmaDevices,
    fileSystem,
    systemInfo,
  };
}
