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
  FaShieldAlt,
  FaArrowLeft,
  FaPaperPlane,
  FaRedoAlt,
  FaCheckCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/ForgotPassword.css';

const ForgotPassword = () => {
  const { forgotPassword, resetPassword, passwordResetKey } = useAuth();
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
      toast.error('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await forgotPassword(identifier.trim());
      setIdentifier(result?.recipientEmail || identifier.trim());
      setStep('reset');
      toast.success('Password reset code sent to your email');
    } catch (error) {
      toast.error(error.message || 'Failed to send reset code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (otp.trim().length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const storedData = latestResetData();
    const resetToken = storedData?.resetToken;

    if (!resetToken) {
      toast.error('Reset session expired. Please request a new code.');
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

      toast.success('Password reset successful. Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="forgot-password-page-wrapper">
      <div className="forgot-password-bg-orb forgot-password-bg-orb-one" aria-hidden="true" />
      <div className="forgot-password-bg-orb forgot-password-bg-orb-two" aria-hidden="true" />

      <div className="forgot-password-container">
        <div className="forgot-password-card-panel">
          <div className="forgot-password-header-block">
            <Link to="/" className="forgot-password-logo-wrap" aria-label="Smart NID home">
              <img
                src="/logo/logo.png"
                alt="Smart NID Card Management System"
                className="forgot-password-brand-logo"
                width="280"
                height="72"
                loading="eager"
                decoding="async"
              />
            </Link>

            <div className="forgot-password-secure-badge">
              <FaShieldAlt />
              <span>Secure password recovery</span>
            </div>

            <h1 className="forgot-password-title-text">
              {step === 'request' ? 'Forgot Password' : 'Reset Password'}
            </h1>

            <p className="forgot-password-subtitle-text">
              {step === 'request'
                ? 'Enter your verified email to receive a reset code.'
                : `Enter the 6-digit code sent to ${identifier}.`}
            </p>

            {step === 'reset' && (
              <div className="forgot-password-code-note">
                <FaCheckCircle />
                <span>Reset code sent successfully. Check your inbox.</span>
              </div>
            )}
          </div>

          {step === 'request' ? (
            <form className="forgot-password-form-wrapper" onSubmit={handleSendCode}>
              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="forgot-email">
                  <FaEnvelope />
                  <span>Email Address</span>
                </label>

                <input
                  id="forgot-email"
                  type="email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Enter your email address"
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
                    <span>Sending...</span>
                  </>
                ) : (
                  <span className="forgot-password-button-content">
                    <span className="forgot-password-action-icon" aria-hidden="true">
                      <FaPaperPlane />
                    </span>
                    <span className="forgot-password-action-text">Send Reset Code</span>
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form className="forgot-password-form-wrapper" onSubmit={handleResetPassword}>
              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="forgot-otp">
                  <FaKey />
                  <span>Verification Code</span>
                </label>

                <input
                  id="forgot-otp"
                  type="text"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="Enter 6-digit code"
                  className="forgot-password-form-input forgot-password-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="new-password">
                  <FaLock />
                  <span>New Password</span>
                </label>

                <div className="forgot-password-password-field">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter new password"
                    className="forgot-password-form-input forgot-password-password-input"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="forgot-password-toggle-button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label" htmlFor="confirm-new-password">
                  <FaLock />
                  <span>Confirm Password</span>
                </label>

                <div className="forgot-password-password-field">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="forgot-password-form-input forgot-password-password-input"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="forgot-password-toggle-button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span className="forgot-password-button-content">
                    <span className="forgot-password-action-icon" aria-hidden="true">
                      <FaKey />
                    </span>
                    <span className="forgot-password-action-text">Reset Password</span>
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
                  <span className="forgot-password-action-text">Send New Code</span>
                </span>
              </button>
            </form>
          )}

          <div className="forgot-password-footer-block">
            <p className="forgot-password-footer-text">
              <span>Remember your password?</span>

              <Link to="/login" className="forgot-password-action-link forgot-password-back-link">
                <span className="forgot-password-action-icon" aria-hidden="true">
                  <FaArrowLeft />
                </span>
                <span className="forgot-password-action-text">Back to Login</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;