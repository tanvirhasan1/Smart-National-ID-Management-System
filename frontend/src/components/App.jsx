import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from './context/AuthContext';

// Common Components
import ProtectedRoute from './common/ProtectedRoute';
import Navbar from './common/Navbar';
import Footer from './common/Footer';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerification from './pages/OTPVerification';
import ForgotPassword from './pages/ForgotPassword';
import AdminLogin from './admin/AdminLogin';
import NotFound from './pages/NotFound';

// Citizen Pages
import CitizenDashboard from './citizen/Dashboard';
import Profile from './pages/Profile';
import ApplicationForm from './citizen/ApplicationForm';
import AppointmentBooking from './citizen/AppointmentBooking';
import ApplicationTracker from './citizen/ApplicationTracker';
import DigitalNID from './citizen/DigitalNID';
import SupportTicket from './citizen/SupportTicket';

// Admin Pages
import AdminDashboard from './admin/AdminDashboard';
import ApplicationReview from './admin/ApplicationReview';
import AppointmentManagement from './admin/AppointmentManagement';
import PrintingQueue from './admin/PrintingQueue';
import DeliveryTracking from './admin/DeliveryTracking';
import SupportManagement from './admin/SupportManagement';
import AuditLogs from './admin/AuditLogs';

const AppShell = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="app">
      {!isAdminRoute && <Navbar />}

      <main className={isAdminRoute ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['citizen', 'admin', 'super_admin']}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <ApplicationForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-appointment/:applicationId"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <AppointmentBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/track-application"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <ApplicationTracker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/digital-nid/:id"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <DigitalNID />
              </ProtectedRoute>
            }
          />
          <Route
            path="/support"
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <SupportTicket />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <ApplicationReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AppointmentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/printing"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <PrintingQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <DeliveryTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <SupportManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isAdminRoute && <Footer />}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;