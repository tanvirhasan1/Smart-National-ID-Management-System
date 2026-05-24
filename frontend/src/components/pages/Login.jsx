import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaShieldAlt,
  FaCheckCircle,
  FaKey,
  FaSignInAlt,
  FaUserPlus
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

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
      const result = await login(data.email, data.password);

      const isInternalUser = ['admin', 'system_supervisor', 'support_staff'].includes(
        result?.user?.role
      );

      toast.success('Login successful!');
      navigate(isInternalUser ? '/admin/dashboard' : from, { replace: true });
    } catch (error) {
      toast.error('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-bg-orb login-bg-orb-one" aria-hidden="true" />
      <div className="login-bg-orb login-bg-orb-two" aria-hidden="true" />

      <div className="login-container">
        <div className="login-card-panel">
          <div className="login-header-block">
            <Link to="/" className="login-logo-wrap" aria-label="Smart NID home">
              <img
                src="../../../public/logo/logo.webp"
                alt="Smart NID Card Management System"
                className="login-brand-logo"
                width="280"
                height="72"
                loading="eager"
                decoding="async"
              />
            </Link>

            <div className="login-secure-badge">
              <FaShieldAlt />
              <span>Secure citizen access</span>
            </div>

            <h1 className="login-title-text">Welcome Back</h1>

            <p className="login-subtitle-text">
              Login to continue your Smart NID service.
            </p>
          </div>

          <form className="login-form-wrapper" onSubmit={handleSubmit(onSubmit)}>
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="login-email">
                <FaUser className="login-label-icon" />
                <span>Email Address</span>
              </label>

              <input
                id="login-email"
                type="email"
                placeholder="Enter your email address"
                className={`login-form-input ${errors.email ? 'error' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address'
                  }
                })}
                autoComplete="email"
                autoFocus
              />

              {errors.email && (
                <span className="login-form-error">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="login-form-group">
              <label className="login-form-label" htmlFor="login-password">
                <FaLock className="login-label-icon" />
                <span>Password</span>
              </label>

              <div className="login-password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`login-form-input login-password-input ${errors.password ? 'error' : ''}`}
                  {...register('password', {
                    required: 'Password is required'
                  })}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {errors.password && (
                <span className="login-form-error">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="login-form-options">
              <div className="login-helper-text">
                <FaCheckCircle />
                <span>Use your verified citizen account</span>
              </div>

              <Link to="/forgot-password" className="login-action-link login-forgot-link">
                <span className="login-action-icon" aria-hidden="true">
                  <FaKey />
                </span>
                <span className="login-action-text">Forgot Password?</span>
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-button"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="login-spinner" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span className="login-button-content">
                  <span className="login-action-icon" aria-hidden="true">
                    <FaSignInAlt />
                  </span>
                  <span className="login-action-text">Login</span>
                </span>
              )}
            </button>
          </form>

          <div className="login-footer-block">
            <p className="login-footer-text">
              <span>Don&apos;t have an account?</span>
              <Link to="/register" className="login-action-link login-register-link">
                <span className="login-action-icon" aria-hidden="true">
                  <FaUserPlus />
                </span>
                <span className="login-action-text">Register Now</span>
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;