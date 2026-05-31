import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth context
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// Shared components
import ProtectedRoute from './common/ProtectedRoute';
import PublicRoute from './common/PublicRoute';
import Navbar from './common/Navbar';
import Footer from './common/Footer';

// Public pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OTPVerification from './pages/OTPVerification';
import ForgotPassword from './pages/ForgotPassword';
import AdminLogin from './admin/AdminLogin';
import NotFound from './pages/NotFound';

// Citizen pages
import CitizenDashboard from './citizen/Dashboard';
import Profile from './pages/Profile';
import ApplicationForm from './citizen/ApplicationForm';
import MobileLivenessPage from './citizen/MobileLivenessPage';
import AppointmentBooking from './citizen/AppointmentBooking';
import ApplicationTracker from './citizen/ApplicationTracker';
import DigitalNID from './citizen/DigitalNID';
import SupportTicket from './citizen/SupportTicket';

// Admin pages
import AdminDashboard from './admin/AdminDashboard';
import AdminUsers from './admin/AdminUsers';
import ApplicationReview from './admin/ApplicationReview';
import ApplicationReviewDetails from './admin/ApplicationReviewDetails';
import AppointmentManagement from './admin/AppointmentManagement';
import PrintingQueue from './admin/PrintingQueue';
import DeliveryTracking from './admin/DeliveryTracking';
import SupportManagement from './admin/SupportManagement';
import AuditLogs from './admin/AuditLogs';
import { USER_ROLES, ADMIN_MENU_ACCESS, INTERNAL_USER_ROLES } from './utils/roles';

const AppShell = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLivenessRoute = location.pathname.startsWith('/liveness/mobile/');

  return (
    <div className="app">
      {!isAdminRoute && !isLivenessRoute && <Navbar />}

      <main
        className={
          isAdminRoute ? '' : isLivenessRoute ? 'liveness-only-main' : 'main-content'
        }
      >
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          <Route
            path="/verify-otp"
            element={
              <PublicRoute>
                <OTPVerification />
              </PublicRoute>
            }
          />

          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/admin/login"
            element={
              <PublicRoute>
                <AdminLogin />
              </PublicRoute>
            }
          />

          <Route path="/liveness/mobile/:sessionId" element={<MobileLivenessPage />} />

          {/* Citizen routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.CITIZEN]}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute
                allowedRoles={[USER_ROLES.CITIZEN, ...INTERNAL_USER_ROLES]}
              >
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/apply"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.CITIZEN]}>
                <ApplicationForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/book-appointment/:applicationId"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.CITIZEN]}>
                <AppointmentBooking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/track-application"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.CITIZEN]}>
                <ApplicationTracker />
              </ProtectedRoute>
            }
          />

          <Route
            path="/digital-nid/:id"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.CITIZEN]}>
                <DigitalNID />
              </ProtectedRoute>
            }
          />

          <Route
            path="/support"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.CITIZEN]}>
                <SupportTicket />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={ADMIN_MENU_ACCESS.dashboard}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <ApplicationReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/applications/review/:id"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <ApplicationReviewDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/appointments"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <AppointmentManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/printing"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <PrintingQueue />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/delivery"
            element={
              <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                <DeliveryTracking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/support"
            element={
              <ProtectedRoute allowedRoles={ADMIN_MENU_ACCESS.support}>
                <SupportManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={ADMIN_MENU_ACCESS.auditLogs}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isAdminRoute && !isLivenessRoute && <Footer />}

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
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppShell />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
