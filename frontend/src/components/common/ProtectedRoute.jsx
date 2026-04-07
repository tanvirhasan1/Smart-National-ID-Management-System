import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loader">
        <Loader />
        <p>Loading...</p>
      </div>
    );
  }

  const isAdminArea =
    allowedRoles.includes('admin') || allowedRoles.includes('super_admin');

  if (!isAuthenticated) {
    return (
      <Navigate
        to={isAdminArea ? '/admin/login' : '/login'}
        state={{ from: location }}
        replace
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const redirectPath =
      user?.role === 'admin' || user?.role === 'super_admin'
        ? '/admin/dashboard'
        : '/dashboard';

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;