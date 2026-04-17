import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const PublicRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <Loader />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return children;
  }

  const redirectPath =
    ['admin', 'system_supervisor', 'support_staff'].includes(user?.role)
      ? '/admin/dashboard'
      : '/dashboard';

  return <Navigate to={redirectPath} replace />;
};

export default PublicRoute;