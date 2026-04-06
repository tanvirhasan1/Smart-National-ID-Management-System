import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      await login(data.email, data.password);
      toast.success('Login successful!');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8 flex items-center justify-center">
      <div className="login-container w-full max-w-[480px]">
        <div className="login-card-panel rounded-2xl bg-white p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          {/* Header */}
          <div className="login-header-block mb-8 text-center">
            <div className="login-logo-wrap mb-4 flex justify-center">
              <img
                src="https://i.ibb.co.com/99gnCXfN/logo.png"
                alt="Logo"
                className="login-brand-logo h-[60px] w-auto object-contain"
              />
            </div>

            <h1 className="login-title-text mb-2 text-[1.75rem] font-bold text-[#1F2937]">
              Welcome Back
            </h1>

            <p className="login-subtitle-text text-[0.95rem] text-[#6B7280]">
              Login to your Smart NID account
            </p>
          </div>

          {/* Form */}
          <form
            className="login-form-wrapper space-y-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Email Address */}
            <div className="login-form-group">
              <label className="login-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                <FaUser className="login-label-icon text-[#16A34A]" />
                <span>Email Address</span>
              </label>

              <input
                type="email"
                placeholder="Enter your email address"
                className={`login-form-input form-input ${errors.email ? 'error' : ''
                  } w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address'
                  }
                })}
                autoFocus />

              {errors.email && (
                <span className="login-form-error form-error mt-2 block text-sm text-red-600">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="login-form-group">
              <label className="login-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                <FaLock className="login-label-icon text-[#16A34A]" />
                <span>Password</span>
              </label>

              <div className="login-password-field password-input-wrapper relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`login-form-input login-password-input form-input ${errors.password ? 'error' : ''
                    } w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 pr-12 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10`}
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />

                <button
                  type="button"
                  className="login-password-toggle password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#16A34A]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {errors.password && (
                <span className="login-form-error form-error mt-2 block text-sm text-red-600">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Forgot Password */}
            <div className="login-form-options flex justify-end">
              <Link
                to="/forgot-password"
                className="login-forgot-link text-sm font-medium text-[#16A34A] transition hover:text-[#15803D]"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-button flex w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="login-spinner spinner animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer-block mt-8 border-t border-[#E5E7EB] pt-6 text-center">
            <p className="login-footer-text text-[#6B7280]">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="login-register-link font-semibold text-[#16A34A] transition hover:text-[#15803D]"
              >
                Register Now
              </Link>
            </p>

            <p className="login-admin-link mt-4 text-sm">
              <Link
                to="/admin/login"
                className="text-[#6B7280] transition hover:text-[#16A34A]"
              >
                Admin Login →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;