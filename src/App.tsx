import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastHost } from './components/ui/ToastHost';
import { AppShell } from './components/layout/AppShell';
import { BoardEditorPage } from './pages/BoardEditorPage';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetBuilderPage } from './pages/DatasetBuilderPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { GamePage } from './pages/GamePage';
import { MyBoardsPage } from './pages/MyBoardsPage';
import { RecentlyPlayedPage } from './pages/RecentlyPlayedPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PreviewPage } from './pages/PreviewPage';

export default function App() {
  return (
    <>
      <ToastHost />
      <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="boards" element={<MyBoardsPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="datasets/:id" element={<DatasetBuilderPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="recent" element={<RecentlyPlayedPage />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" description="App preferences" />} />
      </Route>
      <Route
        path="boards/:id/edit"
        element={
          <div className="app-shell">
            <Sidebar />
            <BoardEditorPage />
          </div>
        }
      />
      <Route path="boards/:id/preview" element={<PreviewPage />} />
      <Route path="boards/:id/game" element={<GamePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
