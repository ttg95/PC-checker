import { HashRouter, Routes, Route } from 'react-router-dom';
import { ScanProvider } from './utils/ScanContext';
import { AccountProvider } from './utils/AccountContext';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import RegistryAnalysis from './components/registry/RegistryAnalysis';
import EventViewerAnalysis from './components/events/EventViewerAnalysis';
import ApplicationHistory from './components/apphistory/ApplicationHistory';
import ServicesDrivers from './components/services/ServicesDrivers';
import ScheduledTasks from './components/tasks/ScheduledTasks';
import RunningProcesses from './components/processes/RunningProcesses';
import DmaDevices from './components/dma/DmaDevices';
import UsbActivity from './components/usb/UsbActivity';
import FileSystemCheck from './components/filesystem/FileSystemCheck';
import SystemInfoPage from './components/systeminfo/SystemInfo';
import ExportReports from './components/reports/ExportReports';
import AdminPanel from './components/admin/AdminPanel';
import Accounts from './components/accounts/Accounts';

function App() {
  console.log('App component rendering');
  return (
    <AccountProvider>
      <ScanProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/registry" element={<RegistryAnalysis />} />
              <Route path="/events" element={<EventViewerAnalysis />} />
              <Route path="/apphistory" element={<ApplicationHistory />} />
              <Route path="/services" element={<ServicesDrivers />} />
              <Route path="/usb" element={<UsbActivity />} />
              <Route path="/dma" element={<DmaDevices />} />
              <Route path="/filesystem" element={<FileSystemCheck />} />
              <Route path="/systeminfo" element={<SystemInfoPage />} />
              <Route path="/tasks" element={<ScheduledTasks />} />
              <Route path="/processes" element={<RunningProcesses />} />
              <Route path="/reports" element={<ExportReports />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Routes>
        </HashRouter>
      </ScanProvider>
    </AccountProvider>
  );
}

export default App;
