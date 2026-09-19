import { Route, Routes } from 'react-router-dom';
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
      <Route path="/" element={<HomePage />} />
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
    </Routes>
  );
}

export default App;
