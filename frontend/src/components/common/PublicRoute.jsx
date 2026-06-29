import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';
import { getRoleHomePath } from '../utils/roles';

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

  const redirectPath = getRoleHomePath(user?.role);

  return <Navigate to={redirectPath} replace />;
};

export default PublicRoute;