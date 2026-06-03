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
  FaKey,
  FaSignInAlt,
  FaUserPlus
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isInternalUserRole, getRoleHomePath } from '../utils/roles';
import '../styles/Login.css';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
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

      const userRole = result?.user?.role;
      const targetPath = isInternalUserRole(userRole) ? getRoleHomePath(userRole) : from;

      toast.success(t('login.success'));
      navigate(targetPath, { replace: true });
    } catch (error) {
      toast.error(t('login.invalidCredentials'));
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
            <h1 className="login-title-text">{t('login.title')}</h1>

            <p className="login-subtitle-text">
              {t('login.subtitle')}
            </p>
          </div>

          <form className="login-form-wrapper" onSubmit={handleSubmit(onSubmit)}>
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="login-email">
                <FaUser className="login-label-icon" />
                <span>{t('login.emailLabel')}</span>
              </label>

              <input
                id="login-email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                className={`login-form-input ${errors.email ? 'error' : ''}`}
                {...register('email', {
                  required: t('login.emailRequired'),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t('login.emailInvalid')
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
                <span>{t('login.passwordLabel')}</span>
              </label>

              <div className="login-password-field">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  className={`login-form-input login-password-input ${errors.password ? 'error' : ''}`}
                  {...register('password', {
                    required: t('login.passwordRequired')
                  })}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
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
              <Link to="/forgot-password" className="login-action-link login-forgot-link">
                <span className="login-action-icon" aria-hidden="true">
                  <FaKey />
                </span>
                <span className="login-action-text">{t('login.forgotPassword')}</span>
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
                  <span>{t('login.loggingIn')}</span>
                </>
              ) : (
                <span className="login-button-content">
                  <span className="login-action-icon" aria-hidden="true">
                    <FaSignInAlt />
                  </span>
                  <span className="login-action-text">{t('login.loginButton')}</span>
                </span>
              )}
            </button>
          </form>

          <div className="login-footer-block">
            <p className="login-footer-text">
              <span>{t('login.noAccount')}</span>
              <Link to="/register" className="login-action-link login-register-link">
                <span className="login-action-icon" aria-hidden="true">
                  <FaUserPlus />
                </span>
                <span className="login-action-text">{t('login.registerNow')}</span>
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;