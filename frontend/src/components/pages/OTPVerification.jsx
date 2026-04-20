import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaRedo, FaSpinner, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/OTPVerification.css';

const OTPVerification = () => {
  const { verifyOTP, resendOTP, pendingVerificationKey } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const storedVerification = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(pendingVerificationKey) || '{}');
    } catch (error) {
      return {};
    }
  }, [pendingVerificationKey]);

  const pendingVerification = {
    ...(storedVerification || {}),
    ...(location.state || {})
  };

  const identifier = pendingVerification.email || '';
  const verificationToken = pendingVerification.verificationToken || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!identifier || !verificationToken) {
      navigate('/register', { replace: true });
      return;
    }

    sessionStorage.setItem(
      pendingVerificationKey,
      JSON.stringify({
        email: identifier,
        verificationToken
      })
    );
  }, [identifier, verificationToken, navigate, pendingVerificationKey]);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();

    const pastedValue = event.clipboardData.getData('text').trim().slice(0, 6);

    if (!/^\d+$/.test(pastedValue)) return;

    const pastedOtp = pastedValue
      .split('')
      .concat(Array(6 - pastedValue.length).fill(''));

    setOtp(pastedOtp);

    const focusIndex = Math.min(pastedValue.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      await verifyOTP(otpCode, verificationToken);
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsResending(true);

    try {
      await resendOTP(verificationToken);
      toast.success('Verification code sent again!');
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="otp-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8 flex items-center justify-center">
      <div className="otp-container w-full max-w-[480px]">
        <div className="otp-card-panel rounded-2xl bg-white p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          <div className="otp-header-block mb-8 text-center">
            <div className="otp-icon-wrap mb-4 flex justify-center">
              <div className="otp-icon-badge flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#16A34A] text-[28px] text-white shadow-[0_8px_24px_rgba(22,163,74,0.22)]">
                <FaShieldAlt />
              </div>
            </div>

            <h1 className="otp-title-text mb-2 text-[1.75rem] font-bold text-[#1F2937]">
              Verify Your Email
            </h1>

            <p className="otp-subtitle-text text-[0.95rem] leading-7 text-[#6B7280]">
              We sent a 6-digit verification code to
              <br />
              <span className="otp-phone-text font-semibold text-[#1F2937]">
                {identifier}
              </span>
            </p>
          </div>

          <form
            className="otp-form-wrapper space-y-6"
            onSubmit={handleSubmit}
          >
            <div
              className="otp-inputs-row flex items-center justify-center gap-2 sm:gap-3"
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  disabled={isLoading}
                  className="otp-digit-input h-12 w-12 rounded-xl border border-[#D1D5DB] bg-white text-center text-lg font-semibold text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10 sm:h-14 sm:w-14"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.join('').length !== 6}
              className="otp-submit-button flex w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="otp-spinner animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify Code</span>
              )}
            </button>
          </form>

          <div className="otp-resend-block mt-6 text-center">
            {canResend ? (
              <button
                type="button"
                className="otp-resend-button inline-flex items-center gap-2 text-sm font-medium text-[#16A34A] transition hover:text-[#15803D]"
                onClick={handleResendOtp}
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FaRedo />
                    <span>Resend Code</span>
                  </>
                )}
              </button>
            ) : (
              <p className="otp-countdown-text text-sm text-[#6B7280]">
                Resend code in <strong>{countdown}s</strong>
              </p>
            )}
          </div>

          <div className="otp-help-block mt-8 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-4">
            <p className="otp-help-title mb-2 text-sm font-semibold text-[#374151]">
              Didn&apos;t receive the code?
            </p>

            <ul className="otp-help-list list-inside list-disc space-y-1 text-sm text-[#6B7280]">
              <li>Check your inbox</li>
              <li>Check your spam folder</li>
              <li>Wait for the resend timer to finish</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;