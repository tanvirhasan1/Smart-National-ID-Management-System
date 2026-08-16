import React, { useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaRedo, FaShieldAlt, FaSpinner, FaTimes } from 'react-icons/fa';

const EMPTY_OTP = ['', '', '', '', '', ''];

const EmailVerificationModal = ({
  open,
  email,
  verifying = false,
  resending = false,
  onVerify,
  onResend,
  onClose
}) => {
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!open) return;

    setOtp(EMPTY_OTP);
    setCountdown(60);
    window.requestAnimationFrame(() => inputRefs.current[0]?.focus());
  }, [open, email]);

  useEffect(() => {
    if (!open || countdown <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, open]);

  if (!open) return null;

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').trim().slice(0, 6);

    if (!/^\d{1,6}$/.test(pasted)) return;

    const nextOtp = pasted.split('').concat(Array(6 - pasted.length).fill(''));
    setOtp(nextOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;

    const verified = await onVerify(code);
    if (!verified) {
      setOtp(EMPTY_OTP);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    const sent = await onResend();
    if (sent) {
      setCountdown(60);
      setOtp(EMPTY_OTP);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
              <FaShieldAlt />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Verify email address</h3>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                Enter the 6-digit code sent to <strong className="font-semibold text-slate-700">{email}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close email verification"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
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
                disabled={verifying}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-50 sm:h-14 sm:w-12"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={verifying || otp.join('').length !== 6}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {verifying ? (
              <>
                <FaSpinner className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <FaCheckCircle />
                Verify code
              </>
            )}
          </button>

          <div className="mt-5 text-center">
            {countdown > 0 ? (
              <p className="text-sm text-slate-500">
                Resend code in <strong>{countdown}s</strong>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
              >
                {resending ? <FaSpinner className="animate-spin" /> : <FaRedo />}
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
