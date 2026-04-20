import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUserShield,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaEnvelope
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      await adminLogin(data.email, data.password);
      toast.success('Admin login successful!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.message || 'Admin login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8 flex items-center justify-center">
      <div className="admin-login-container w-full max-w-[480px]">
        <div className="admin-login-card-panel rounded-2xl bg-white p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          <div className="admin-login-header-block mb-8 text-center">
            <div className="admin-login-logo-wrap mb-4 flex justify-center">
              <div className="admin-login-logo-icon flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#16A34A] text-[28px] text-white shadow-[0_8px_24px_rgba(22,163,74,0.22)]">
                <FaUserShield />
              </div>
            </div>

            <h1 className="admin-login-title-text mb-2 text-[1.75rem] font-bold text-[#1F2937]">
              Admin Portal
            </h1>

            <p className="admin-login-subtitle-text text-[0.95rem] text-[#6B7280]">
              Smart NID Management System
            </p>
          </div>

          <form
            className="admin-login-form-wrapper space-y-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="admin-login-form-group">
              <label className="admin-login-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                <FaEnvelope className="admin-login-label-icon text-[#16A34A]" />
                <span>Admin Email</span>
              </label>

              <input
                type="email"
                placeholder="Enter admin email"
                className={`admin-login-form-input w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${
                  errors.email
                    ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
                    : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
                }`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address'
                  }
                })}
              />

              {errors.email && (
                <span className="admin-login-form-error mt-2 block text-sm text-red-600">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="admin-login-form-group">
              <label className="admin-login-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                <FaLock className="admin-login-label-icon text-[#16A34A]" />
                <span>Password</span>
              </label>

              <div className="admin-login-password-field relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  className={`admin-login-form-input admin-login-password-input w-full rounded-lg border bg-white px-4 py-3 pr-12 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${
                    errors.password
                      ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
                      : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
                  }`}
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />

                <button
                  type="button"
                  className="admin-login-password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#16A34A]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {errors.password && (
                <span className="admin-login-form-error mt-2 block text-sm text-red-600">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="admin-login-submit-button flex w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="admin-login-spinner animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Login to Admin Panel'
              )}
            </button>
          </form>

          <div className="admin-login-footer-block mt-8 border-t border-[#E5E7EB] pt-6 text-center">
            <Link
              to="/login"
              className="admin-login-back-link font-medium text-[#16A34A] transition hover:text-[#15803D]"
            >
              ← Back to Citizen Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;