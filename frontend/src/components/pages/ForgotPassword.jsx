import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaEnvelope,
  FaKey,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaArrowLeft,
  FaPaperPlane,
  FaRedoAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ForgotPassword.css';


const ForgotPassword = () => {
  const { forgotPassword, resetPassword, passwordResetKey } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const storedResetData = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(passwordResetKey) || '{}');
    } catch (error) {
      return {};
    }
  }, [passwordResetKey]);

  const [step, setStep] = useState(storedResetData?.resetToken ? 'reset' : 'request');
  const [identifier, setIdentifier] = useState(storedResetData?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const latestResetData = () => {
    try {
      return JSON.parse(sessionStorage.getItem(passwordResetKey) || '{}');
    } catch (error) {
      return {};
    }
  };

  const handleSendCode = async (event) => {
    event.preventDefault();

    if (!identifier.trim()) {
      toast.error(t('forgotPasswordPage.enterEmail'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await forgotPassword(identifier.trim());
      setIdentifier(result?.recipientEmail || identifier.trim());
      setStep('reset');
      toast.success(t('forgotPasswordPage.codeSentSuccess'));
    } catch (error) {
      toast.error(error.message || t('forgotPasswordPage.sendFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (otp.trim().length !== 6) {
      toast.error(t('forgotPasswordPage.enterCode'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('forgotPasswordPage.passwordMin'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('forgotPasswordPage.passwordsDoNotMatch'));
      return;
    }

    const storedData = latestResetData();
    const resetToken = storedData?.resetToken;

    if (!resetToken) {
      toast.error(t('forgotPasswordPage.sessionExpired'));
      setStep('request');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        otp: otp.trim(),
        password,
        resetToken
      });

      toast.success(t('forgotPasswordPage.resetSuccess'));
      navigate('/login');
    } catch (error) {
      toast.error(error.message || t('forgotPasswordPage.resetFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-password-page-wrapper">
      <div className="forgot-password-container">
        <div className="forgot-password-card-panel">
          <div className="forgot-password-header-block">
            <h1 className="forgot-password-title-text">
              {step === 'request' ? t('forgotPasswordPage.requestTitle') : t('forgotPasswordPage.resetTitle')}
            </h1>

            <p className="forgot-password-subtitle-text">
              {step === 'request'
                ? t('forgotPasswordPage.requestSubtitle')
                : t('forgotPasswordPage.resetSubtitle', { email: identifier })}
            </p>

            {step === 'reset' && (
              <div className="forgot-password-code-note">
                <FaCheckCircle />
                <span>{t('forgotPasswordPage.codeSentNote')}</span>
              </div>
            )}
          </div>

          {step === 'request' ? (
            <form className="forgot-password-form-wrapper" onSubmit={handleSendCode}>
              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="forgot-email">
                  <FaEnvelope />
                  <span>{t('forgotPasswordPage.emailLabel')}</span>
                </label>

                <input
                  id="forgot-email"
                  type="email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder={t('forgotPasswordPage.emailPlaceholder')}
                  className="forgot-password-form-input"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="forgot-password-submit-button"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="forgot-password-spinner" />
                    <span>{t('forgotPasswordPage.sending')}</span>
                  </>
                ) : (
                  <span className="forgot-password-button-content">
                    <span className="forgot-password-action-icon" aria-hidden="true">
                      <FaPaperPlane />
                    </span>
                    <span className="forgot-password-action-text">{t('forgotPasswordPage.sendResetCode')}</span>
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form className="forgot-password-form-wrapper" onSubmit={handleResetPassword}>
              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="forgot-otp">
                  <FaKey />
                  <span>{t('forgotPasswordPage.verificationCodeLabel')}</span>
                </label>

                <input
                  id="forgot-otp"
                  type="text"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder={t('forgotPasswordPage.verificationCodePlaceholder')}
                  className="forgot-password-form-input forgot-password-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="new-password">
                  <FaLock />
                  <span>{t('forgotPasswordPage.newPasswordLabel')}</span>
                </label>

                <div className="forgot-password-password-field">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('forgotPasswordPage.newPasswordPlaceholder')}
                    className="forgot-password-form-input forgot-password-password-input"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="forgot-password-toggle-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t('forgotPasswordPage.hidePassword') : t('forgotPasswordPage.showPassword')}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="confirm-new-password">
                  <FaLock />
                  <span>{t('forgotPasswordPage.confirmPasswordLabel')}</span>
                </label>

                <div className="forgot-password-password-field">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t('forgotPasswordPage.confirmPasswordPlaceholder')}
                    className="forgot-password-form-input forgot-password-password-input"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="forgot-password-toggle-button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? t('forgotPasswordPage.hidePassword') : t('forgotPasswordPage.showPassword')}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="forgot-password-submit-button"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="forgot-password-spinner" />
                    <span>{t('forgotPasswordPage.resetting')}</span>
                  </>
                ) : (
                  <span className="forgot-password-button-content">
                    <span className="forgot-password-action-icon" aria-hidden="true">
                      <FaKey />
                    </span>
                    <span className="forgot-password-action-text">{t('forgotPasswordPage.resetPassword')}</span>
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="forgot-password-secondary-button"
              >
                <span className="forgot-password-button-content">
                  <span className="forgot-password-action-icon" aria-hidden="true">
                    <FaRedoAlt />
                  </span>
                  <span className="forgot-password-action-text">{t('forgotPasswordPage.sendNewCode')}</span>
                </span>
              </button>
            </form>
          )}

          <div className="forgot-password-footer-block">
            <p className="forgot-password-footer-text">
              <span>{t('forgotPasswordPage.rememberPassword')}</span>

              <Link to="/login" className="forgot-password-action-link forgot-password-back-link">
                <span className="forgot-password-action-icon" aria-hidden="true">
                  <FaArrowLeft />
                </span>
                <span className="forgot-password-action-text">{t('forgotPasswordPage.backToLogin')}</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;