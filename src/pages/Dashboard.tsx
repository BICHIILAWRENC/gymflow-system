import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import MemberDashboard from './MemberDashboard';
import TrainerDashboard from './TrainerDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center gym-card p-8 max-w-md">
          <h2 className="text-lg font-semibold text-foreground mb-2">No role assigned</h2>
          <p className="text-sm text-muted-foreground">
            Your account doesn't have a role yet. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'trainer':
      return <TrainerDashboard />;
    case 'member':
      return <MemberDashboard />;
    default:
      return <Navigate to="/login" />;
  }
}
