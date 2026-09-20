import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import RequireProfile from './components/RequireProfile';
import StartPage from './pages/StartPage';
import HomePage from './pages/HomePage';
import NoticeDetailPage from './pages/NoticeDetailPage';
import OpinionPage from './pages/OpinionPage';
import SubmitPage from './pages/SubmitPage';
import MyVoicePage from './pages/MyVoicePage';
import NotificationsPage from './pages/NotificationsPage';
import AgentLogPage from './pages/AgentLogPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Routes>
      <Route path="/start" element={<StartPage />} />

      {/* 앱 공통 화면 — Navbar는 AppLayout에서 한 번만 렌더링한다. 경로와 가드는 그대로. */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/my"
          element={
            <RequireProfile>
              <MyVoicePage />
            </RequireProfile>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireProfile>
              <NotificationsPage />
            </RequireProfile>
          }
        />
        <Route
          path="/agent"
          element={
            <RequireProfile>
              <AgentLogPage />
            </RequireProfile>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireProfile>
              <SettingsPage />
            </RequireProfile>
          }
        />
      </Route>

      <Route
        path="/notice/:id"
        element={
          <RequireProfile>
            <NoticeDetailPage />
          </RequireProfile>
        }
      />
      <Route
        path="/notice/:id/opinion"
        element={
          <RequireProfile>
            <OpinionPage />
          </RequireProfile>
        }
      />
      <Route
        path="/opinion/:id/submit"
        element={
          <RequireProfile>
            <SubmitPage />
          </RequireProfile>
        }
      />
    </Routes>
  );
}

export default App;
