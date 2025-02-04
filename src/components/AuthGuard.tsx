import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useParams } from 'react-router-dom';

type AuthGuardProps = {
  children: React.ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams<{ branchId?: string }>();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const isDeveloper = sessionStorage.getItem('developerAuth') === 'true';
      const isBranchAuth = sessionStorage.getItem('branchAuth') === 'true';
      const authorizedBranchId = sessionStorage.getItem('branchId');

      // Developer has access to everything
      if (isDeveloper) {
        setAuthorized(true);
        return;
      }

      // Branch manager authentication
      if (isBranchAuth) {
        // Allow access to password management page
        if (location.pathname === '/password') {
          setAuthorized(true);
          return;
        }

        // For branch-specific routes, check if the branch ID matches
        if (branchId && authorizedBranchId === branchId) {
          setAuthorized(true);
          return;
        }
      }

      // If not authorized, redirect to welcome page
      navigate('/welcome', { state: { from: location } });
    };

    checkAuth();
  }, [navigate, location, branchId]);

  return authorized ? <>{children}</> : null;
}