import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaCheck, FaExclamationTriangle, FaIdCard, FaSpinner } from 'react-icons/fa';
import api from '../api/axios';
import LivenessVerificationModal from './LivenessVerificationModal';
import '../styles/LivenessVerification.css';

const FACE_FAILURE_MESSAGE =
  'Face verification failed. Please upload a recent passport-size photo and try again.';
const BIOMETRIC_ERROR_MESSAGES = {
  BIOMETRIC_TOO_MANY_ATTEMPTS:
    'Too many face verification attempts. Please restart verification and try again.',
  BIOMETRIC_TOO_MANY_QR_OPENS:
    'This face verification link has been opened too many times. Please restart verification.',
  BIOMETRIC_SESSION_EXPIRED:
    'Face verification session expired. Please try again.',
  BIOMETRIC_CHALLENGE_SEQUENCE_INVALID:
    'Challenge sequence is invalid. Please restart verification.',
  FACE_VERIFICATION_QUALITY_FAILED:
    'Face verification failed. Please ensure your face is clear and try again.',
  FACE_MATCH_FAILED: FACE_FAILURE_MESSAGE,
  LIVENESS_FAILED:
    'Face verification failed. Please ensure your face is clear and try again.',
  MODEL_FILE_MISSING:
    'Face verification service is not ready. Please try again later.',
  FACE_VERIFICATION_SERVICE_UNAVAILABLE:
    'Face verification service is not ready. Please try again later.'
};

const mobileLinkValidationRequests = new Map();

const validateMobileLinkRequest = ({ sessionId, mobileToken }) => {
  const cacheKey = `${sessionId}:${mobileToken}`;

  if (!mobileLinkValidationRequests.has(cacheKey)) {
    const request = api
      .get(`/biometric/sessions/${sessionId}/mobile-open`, {
        params: {
          token: mobileToken
        }
      })
      .finally(() => {
        setTimeout(() => {
          mobileLinkValidationRequests.delete(cacheKey);
        }, 5000);
      });

    mobileLinkValidationRequests.set(cacheKey, request);
  }

  return mobileLinkValidationRequests.get(cacheKey);
};

const MobileLivenessPage = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  const [challengeSequence, setChallengeSequence] = useState([]);

  const mobileToken = searchParams.get('token') || '';

  const session = useMemo(
    () => ({
      sessionId,
      mobileToken,
      challengeSequence
    }),
    [sessionId, mobileToken, challengeSequence]
  );

  const renderShell = (children) => (
    <div className="mobile-liveness-page">
      <header className="mobile-liveness-topbar">
        <div className="mobile-liveness-brand">
          <FaIdCard />
          <div>
            <strong>Smart NID</strong>
            <span>Face verification</span>
          </div>
        </div>
      </header>

      <main className="mobile-liveness-content">{children}</main>

      <footer className="mobile-liveness-footer">
        Smart NID &bull; Face verification
      </footer>
    </div>
  );

  useEffect(() => {
    let isMounted = true;

    const checkMobileLink = async () => {
      if (!sessionId || !mobileToken) {
        setIsCheckingLink(false);
        return;
      }

      try {
        const response = await validateMobileLinkRequest({
          sessionId,
          mobileToken
        });

        if (!isMounted) {
          return;
        }

        if (response?.data?.status === 'passed') {
          setResult('passed');
        } else if (['failed', 'expired', 'used'].includes(response?.data?.status)) {
          setMessage(
            BIOMETRIC_ERROR_MESSAGES[response?.data?.code] ||
              response?.data?.message ||
              FACE_FAILURE_MESSAGE
          );
          setResult('failed');
        } else {
          setChallengeSequence(response?.data?.challengeSequence || []);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessage(
          BIOMETRIC_ERROR_MESSAGES[error?.response?.data?.code] ||
            error?.response?.data?.message ||
            (error?.request
              ? 'Could not reach the face verification server. Please check the mobile network and backend URL.'
              : '') ||
            'Face verification link is invalid or expired'
        );
        setResult('failed');
      } finally {
        if (isMounted) {
          setIsCheckingLink(false);
        }
      }
    };

    checkMobileLink();

    return () => {
      isMounted = false;
    };
  }, [sessionId, mobileToken]);

  if (!sessionId || !mobileToken) {
    return renderShell(
        <div className="mobile-liveness-result failed">
          <FaExclamationTriangle />
          <h1>Face verification link is invalid</h1>
          <p>Please return to the application form and create a new QR code.</p>
        </div>
    );
  }

  if (result === 'passed') {
    return renderShell(
        <div className="mobile-liveness-result passed">
          <FaCheck />
          <h1>Face verification completed.</h1>
          <p>You can return to the desktop application form.</p>
        </div>
    );
  }

  if (result === 'failed') {
    return renderShell(
        <div className="mobile-liveness-result failed">
          <FaExclamationTriangle />
          <h1>Face verification failed</h1>
          <p>{message || FACE_FAILURE_MESSAGE}</p>
        </div>
    );
  }

  if (isCheckingLink) {
    return renderShell(
        <div className="mobile-liveness-result">
          <FaSpinner className="liveness-spin" />
          <h1>Checking face verification link</h1>
          <p>Please wait while this secure liveness link is validated.</p>
        </div>
    );
  }

  return renderShell(
      <LivenessVerificationModal
        embedded
        session={session}
        onVerified={() => setResult('passed')}
        onFailed={(failureMessage) => {
          setMessage(failureMessage || FACE_FAILURE_MESSAGE);
          setResult('failed');
        }}
        onCancel={() => {
          setMessage('Face verification was cancelled. Please scan the QR code again.');
          setResult('failed');
        }}
      />
  );
};

export default MobileLivenessPage;
