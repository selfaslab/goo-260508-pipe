import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { PaperDetailPage } from './pages/PaperDetailPage';
import { PapersPage } from './pages/PapersPage';
import { ScriptGeneratorPage } from './pages/ScriptGeneratorPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/papers" element={<PapersPage />} />
        <Route path="/papers/:paperId" element={<PaperDetailPage />} />
        <Route path="/script" element={<ScriptGeneratorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
