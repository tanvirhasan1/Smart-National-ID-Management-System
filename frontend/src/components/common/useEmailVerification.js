import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../api/axios';

export const EMAIL_PATTERN = /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

export const normalizeVerificationEmail = (value = '') =>
  String(value || '').trim().toLowerCase();

const getVerificationErrorMessage = (error) => {
  const apiMessage =
    error?.response?.data?.message ||
    error?.safeMessage ||
    error?.message ||
    'Unable to verify this email address. Please try again.';

  return /could not be verified/i.test(apiMessage)
    ? 'This email address is not valid.'
    : apiMessage;
};

const useEmailVerification = ({ purpose, recipientName = '' }) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [emailVerificationToken, setEmailVerificationToken] = useState('');

  const isVerified = useCallback(
    (email) =>
      Boolean(emailVerificationToken) &&
      normalizeVerificationEmail(email) === verifiedEmail,
    [emailVerificationToken, verifiedEmail]
  );

  const reset = useCallback(() => {
    setIsStarting(false);
    setIsVerifyingOtp(false);
    setIsResending(false);
    setModalOpen(false);
    setTargetEmail('');
    setVerificationToken('');
    setVerifiedEmail('');
    setEmailVerificationToken('');
  }, []);

  const startVerification = useCallback(
    async (email, nameOverride = '') => {
      const normalizedEmail = normalizeVerificationEmail(email);

      if (!EMAIL_PATTERN.test(normalizedEmail)) {
        toast.error('Please enter a valid email address.');
        return false;
      }

      if (isVerified(normalizedEmail)) {
        toast.success('Email is already verified.');
        return true;
      }

      // Re-open the active OTP dialog without another validator API call.
      if (
        verificationToken &&
        targetEmail === normalizedEmail &&
        !emailVerificationToken
      ) {
        setModalOpen(true);
        return true;
      }

      setIsStarting(true);

      try {
        const response = await api.post('/auth/email-verification/start', {
          email: normalizedEmail,
          purpose,
          recipientName: nameOverride || recipientName || undefined
        });

        setTargetEmail(normalizedEmail);
        setVerificationToken(response.data?.verificationToken || '');
        setVerifiedEmail('');
        setEmailVerificationToken('');
        setModalOpen(true);
        toast.success(response.data?.message || 'Verification code sent.');
        return true;
      } catch (error) {
        toast.error(getVerificationErrorMessage(error));
        return false;
      } finally {
        setIsStarting(false);
      }
    }, [
      emailVerificationToken,
      isVerified,
      purpose,
      recipientName,
      targetEmail,
      verificationToken
    ]
  );

  const verifyOtp = useCallback(
    async (otp) => {
      if (!verificationToken || !targetEmail) {
        toast.error('Email verification session is missing. Please start again.');
        return false;
      }

      setIsVerifyingOtp(true);

      try {
        const response = await api.post('/auth/email-verification/verify', {
          otp,
          verificationToken
        });
        const proofToken = response.data?.emailVerificationToken || '';

        if (!proofToken) {
          throw new Error('Email verification token was not returned.');
        }

        setVerifiedEmail(normalizeVerificationEmail(response.data?.email || targetEmail));
        setEmailVerificationToken(proofToken);
        setModalOpen(false);
        toast.success(response.data?.message || 'Email verified successfully.');
        return true;
      } catch (error) {
        toast.error(getVerificationErrorMessage(error));
        return false;
      } finally {
        setIsVerifyingOtp(false);
      }
    }, [targetEmail, verificationToken]
  );

  const resendOtp = useCallback(async () => {
    if (!verificationToken) {
      toast.error('Email verification session is missing. Please start again.');
      return false;
    }

    setIsResending(true);

    try {
      const response = await api.post('/auth/email-verification/resend', {
        verificationToken
      });
      toast.success(response.data?.message || 'Verification code sent again.');
      return true;
    } catch (error) {
      toast.error(getVerificationErrorMessage(error));
      return false;
    } finally {
      setIsResending(false);
    }
  }, [verificationToken]);

  const getProofToken = useCallback(
    (email) => (isVerified(email) ? emailVerificationToken : ''),
    [emailVerificationToken, isVerified]
  );

  return {
    isStarting,
    isVerifyingOtp,
    isResending,
    modalOpen,
    targetEmail,
    startVerification,
    verifyOtp,
    resendOtp,
    closeModal: () => setModalOpen(false),
    isVerified,
    getProofToken,
    reset
  };
};

export default useEmailVerification;
