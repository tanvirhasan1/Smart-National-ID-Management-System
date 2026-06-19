import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';
import { getRoleHomePath } from '../utils/roles';

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

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/admin')
      ? '/admin/login'
      : '/login';

    return (
      <Navigate
        to={loginPath}
        state={{ from: location }}
        replace
      />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    const redirectPath = getRoleHomePath(user?.role);

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
