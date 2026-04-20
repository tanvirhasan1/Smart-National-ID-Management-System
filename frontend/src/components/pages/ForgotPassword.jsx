import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaEnvelope,
  FaKey,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner
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
    <div className="forgot-password-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8 flex items-center justify-center">
      <div className="forgot-password-container w-full max-w-[500px]">
        <div className="forgot-password-card-panel rounded-2xl bg-white p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          <div className="forgot-password-header-block mb-8 text-center">
            <div className="forgot-password-logo-wrap mb-4 flex justify-center">
              <img
                src="https://i.ibb.co.com/99gnCXfN/logo.png"
                alt="Logo"
                className="forgot-password-brand-logo h-[60px] w-auto object-contain"
              />
            </div>

            <h1 className="forgot-password-title-text mb-2 text-[1.75rem] font-bold text-[#1F2937]">
              {step === 'request' ? 'Forgot Password' : 'Reset Password'}
            </h1>

            <p className="forgot-password-subtitle-text text-[0.95rem] text-[#6B7280]">
              {step === 'request'
                ? 'Enter your email to receive a reset code'
                : `Enter the code sent to ${identifier}`}
            </p>
          </div>

          {step === 'request' ? (
            <form className="forgot-password-form-wrapper space-y-5" onSubmit={handleSendCode}>
              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                  <FaEnvelope className="text-[#16A34A]" />
                  <span>Email Address</span>
                </label>

                <input
                  type="email"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Enter your email address"
                  className="forgot-password-form-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="forgot-password-submit-button flex w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </button>
            </form>
          ) : (
            <form className="forgot-password-form-wrapper space-y-5" onSubmit={handleResetPassword}>
              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                  <FaKey className="text-[#16A34A]" />
                  <span>Verification Code</span>
                </label>

                <input
                  type="text"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="Enter 6-digit code"
                  className="forgot-password-form-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                />
              </div>

              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                  <FaLock className="text-[#16A34A]" />
                  <span>New Password</span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter new password"
                    className="forgot-password-form-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 pr-12 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                  />

                  <button
                    type="button"
                    className="forgot-password-toggle-button absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#16A34A]"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="forgot-password-form-group">
                <label className="forgot-password-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                  <FaLock className="text-[#16A34A]" />
                  <span>Confirm Password</span>
                </label>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="forgot-password-form-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 pr-12 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
                  />

                  <button
                    type="button"
                    className="forgot-password-toggle-button absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#16A34A]"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="forgot-password-submit-button flex w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="forgot-password-secondary-button w-full rounded-lg border border-[#16A34A] px-6 py-3 text-base font-medium text-[#16A34A] transition hover:bg-[#F0FDF4]"
              >
                Send New Code
              </button>
            </form>
          )}

          <div className="forgot-password-footer-block mt-8 border-t border-[#E5E7EB] pt-6 text-center">
            <p className="forgot-password-footer-text text-[#6B7280]">
              Back to{' '}
              <Link
                to="/login"
                className="forgot-password-back-link font-semibold text-[#16A34A] transition hover:text-[#15803D]"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;