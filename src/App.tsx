import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import BranchDashboard from './pages/BranchDashboard';
import QueueManagement from './pages/QueueManagement';
import RoomManagement from './pages/RoomManagement';
import CustomerBooking from './pages/CustomerBooking';
import StatusDisplay from './pages/StatusDisplay';
import Settings from './pages/Settings';
import BranchLinks from './pages/BranchLinks';
import PasswordManagement from './pages/PasswordManagement';

function App() {
  const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/booking/:branchId?" element={<CustomerBooking />} />
      <Route path="/status/:branchId" element={<StatusDisplay />} />

      {/* Protected admin routes */}
      <Route element={<AuthGuard><Layout /></AuthGuard>}>
        {/* Redirect root to appropriate page based on user type */}
        <Route path="/" element={
          isDeveloper ? <Navigate to="/branch-links" replace /> : <Navigate to="/welcome" replace />
        } />
        <Route path="/branch/:branchId" element={<BranchDashboard />} />
        <Route path="/branch/:branchId/queue" element={<QueueManagement />} />
        <Route path="/branch/:branchId/rooms" element={<RoomManagement />} />
        <Route path="/branch/:branchId/status" element={<StatusDisplay />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/branch-links" element={<BranchLinks />} />
        <Route path="/password" element={<PasswordManagement />} />
      </Route>

      {/* Catch-all route for 404s */}
      <Route path="*" element={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-amiri text-destructive mb-4">الصفحة غير موجودة</h1>
            <p className="text-muted-foreground mb-4">عذراً، الصفحة التي تبحث عنها غير موجودة</p>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default App;