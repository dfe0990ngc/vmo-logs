import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';



// Route wrapper component for protected routes
interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('Admin' | 'Member' | 'Staff' | 'Tracker' | 'Uploader')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};