import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import ViewEvents from './pages/ViewEvents';
import ManageTeams from './pages/ManageTeams';
import EventRound from './pages/EventRound';
import RoundStats from './pages/RoundStats';
import FinalStats from './pages/FinalStats';
import LiveLeaderboard from './pages/LiveLeaderboard';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/leaderboard/:eventId" element={<LiveLeaderboard />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><ViewEvents /></ProtectedRoute>} />
          <Route path="/events/:eventId/teams" element={<ProtectedRoute><ManageTeams /></ProtectedRoute>} />
          <Route path="/events/:eventId/rounds" element={<ProtectedRoute><EventRound /></ProtectedRoute>} />
          <Route path="/events/:eventId/rounds/:roundId/stats" element={<ProtectedRoute><RoundStats /></ProtectedRoute>} />
          <Route path="/events/:eventId/final-stats" element={<ProtectedRoute><FinalStats /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
