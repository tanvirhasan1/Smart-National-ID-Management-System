import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCamera, FaCheck, FaSpinner, FaTimes } from 'react-icons/fa';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import api from '../api/axios';
import '../styles/LivenessVerification.css';

const CHALLENGE_LABELS = {
  blink: 'Blink',
  turn_left: 'Turn left',
  turn_right: 'Turn right',
  smile: 'Smile'
};

const CHALLENGE_INSTRUCTIONS = {
  blink: 'Blink both eyes',
  turn_left: 'Turn your head left',
  turn_right: 'Turn your head right',
  smile: 'Smile clearly'
};

const CHALLENGE_GUIDES = {
  blink: {
    src: '/liveness-gifs/blink.gif',
    alt: 'Blink instruction animation'
  },
  turn_left: {
    src: '/liveness-gifs/turn-left.gif',
    alt: 'Turn left instruction animation'
  },
  turn_right: {
    src: '/liveness-gifs/turn-right.gif',
    alt: 'Turn right instruction animation'
  },
  smile: {
    src: '/liveness-gifs/smile.gif',
    alt: 'Smile instruction animation'
  }
};

const CHALLENGE_POOL = ['blink', 'turn_left', 'turn_right', 'smile'];
const FACE_MATCH_CANDIDATE_KEY = 'face_match_candidate';
const MAX_CHALLENGE_FRAMES = 20;
const DEFAULT_CHALLENGE_TIMEOUT_SECONDS = 60;
const DETECTOR_START_MESSAGE =
  'Liveness detector could not start. Please refresh and try again.';
const TIMEOUT_MESSAGE =
  'Liveness verification timed out. Please restart verification.';
const CAMERA_PERMISSION_MESSAGE =
  'Camera permission is required for liveness verification. Please allow camera access and try again.';
const CAMERA_BLOCKED_MESSAGE =
  'Camera could not start. Please close other camera apps or tabs, allow camera access for this site, and try again.';
const CAMERA_SECURE_CONTEXT_MESSAGE =
  'Camera access requires HTTPS or localhost. Please open the secure liveness link and try again.';
const CAMERA_NOT_FOUND_MESSAGE =
  'No camera was found on this device. Please try again from a phone with a working camera.';
const FACE_FAILURE_MESSAGE =
  'Face verification failed. Please upload a recent passport-size photo and try again.';

const MEDIAPIPE_WASM_URL =
  import.meta.env.VITE_MEDIAPIPE_WASM_URL ||
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_LANDMARKER_MODEL_URL =
  import.meta.env.VITE_FACE_LANDMARKER_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

const BIOMETRIC_ERROR_MESSAGES = {
  BIOMETRIC_TOO_MANY_ATTEMPTS:
    'Too many face verification attempts. Please restart verification and try again.',
  BIOMETRIC_TOO_MANY_QR_OPENS:
    'This face verification link has been opened too many times. Please restart verification.',
  BIOMETRIC_SESSION_EXPIRED:
    'Face verification session expired. Please try again.',
  BIOMETRIC_VERIFICATION_IN_PROGRESS:
    'Face verification is already in progress. Please wait and try again.',
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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getChallengeTimeoutMs = () => {
  const configuredSeconds = Number(import.meta.env.VITE_LIVENESS_CHALLENGE_TIMEOUT_SECONDS);
  const timeoutSeconds = Number.isFinite(configuredSeconds)
    ? Math.max(8, Math.min(configuredSeconds, 60))
    : DEFAULT_CHALLENGE_TIMEOUT_SECONDS;

  return timeoutSeconds * 1000;
};

const getCameraPermissionState = async () => {
  if (!navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    return permission?.state || 'unknown';
  } catch (error) {
    return 'unknown';
  }
};

const isPermissionDeniedError = (error, permissionState) =>
  permissionState === 'denied' ||
  error?.name === 'PermissionDeniedError' ||
  (error?.name === 'NotAllowedError' && permissionState !== 'granted');

const getCameraErrorMessage = (error, permissionState) => {
  if (isPermissionDeniedError(error, permissionState)) {
    return CAMERA_PERMISSION_MESSAGE;
  }

  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return CAMERA_NOT_FOUND_MESSAGE;
  }

  if (error?.name === 'SecurityError' || window.isSecureContext === false) {
    return CAMERA_SECURE_CONTEXT_MESSAGE;
  }

  if (
    error?.name === 'NotReadableError' ||
    error?.name === 'TrackStartError' ||
    error?.name === 'AbortError' ||
    error?.name === 'NotAllowedError'
  ) {
    return CAMERA_BLOCKED_MESSAGE;
  }

  return error?.message || CAMERA_BLOCKED_MESSAGE;
};

const getBiometricErrorMessage = (error) => {
  const code = error?.response?.data?.code;

  return (
    BIOMETRIC_ERROR_MESSAGES[code] ||
    error?.response?.data?.message ||
    error?.message ||
    FACE_FAILURE_MESSAGE
  );
};

const getCameraStream = async () => {
  const cameraOptions = [
    {
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 960 },
        height: { ideal: 720 }
      }
    },
    {
      audio: false,
      video: {
        facingMode: 'user'
      }
    },
    {
      audio: false,
      video: true
    }
  ];

  let lastError = null;

  for (const constraints of cameraOptions) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;

      if (
        error?.name === 'NotAllowedError' ||
        error?.name === 'PermissionDeniedError' ||
        error?.name === 'SecurityError'
      ) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Camera is not available on this browser.');
};

const attachStreamToVideo = async (video, stream) => {
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.srcObject = stream;

  await new Promise((resolve) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }

    video.onloadedmetadata = () => resolve();
  });

  await video.play();

  const startedAt = Date.now();
  while (
    video.readyState < 2 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    if (Date.now() - startedAt > 5000) {
      throw new Error('Camera started but no video frame was received. Please try again.');
    }

    await wait(100);
  }
};

const createFaceLandmarker = async () => {
  try {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_LANDMARKER_MODEL_URL
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });
  } catch (error) {
    throw new Error(DETECTOR_START_MESSAGE);
  }
};

const getBlendshapeScore = (result, categoryName) => {
  const categories = result?.faceBlendshapes?.[0]?.categories || [];
  const category = categories.find((item) => item.categoryName === categoryName);
  return category?.score || 0;
};

const getYawDegrees = (result) => {
  const matrix = result?.facialTransformationMatrixes?.[0]?.data;

  if ((Array.isArray(matrix) || ArrayBuffer.isView(matrix)) && matrix.length >= 16) {
    return Math.atan2(matrix[8], matrix[10]) * (180 / Math.PI);
  }

  const landmarks = result?.faceLandmarks?.[0];
  const nose = landmarks?.[1];
  const leftCheek = landmarks?.[234];
  const rightCheek = landmarks?.[454];

  if (!nose || !leftCheek || !rightCheek) {
    return 0;
  }

  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.max(0.001, Math.abs(rightCheek.x - leftCheek.x));
  return ((nose.x - faceCenterX) / faceWidth) * 45;
};

const createChallengeState = () => ({
  blinkOpenSeen: false,
  blinkClosedSeen: false,
  sustainedFrames: 0
});

const hasOneFace = (result) => result?.faceLandmarks?.length === 1;

const getFaceFrameMetrics = (result) => {
  if (!hasOneFace(result)) {
    return {
      hasOneFace: false,
      yawDegrees: 0,
      centerScore: 0,
      faceSizeScore: 0,
      frontalScore: 0
    };
  }

  const landmarks = result.faceLandmarks[0];
  const xValues = landmarks.map((landmark) => landmark.x);
  const yValues = landmarks.map((landmark) => landmark.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerDistance = Math.hypot(centerX - 0.5, centerY - 0.5);
  const yawDegrees = getYawDegrees(result);

  return {
    hasOneFace: true,
    yawDegrees,
    centerScore: Math.max(0, 1 - centerDistance / 0.35),
    faceSizeScore: Math.min(1, Math.max(0, (maxX - minX) * (maxY - minY) * 5)),
    frontalScore: Math.max(0, 1 - Math.abs(yawDegrees) / 18)
  };
};

const detectChallengeCompletion = ({ challengeKey, result, state }) => {
  if (!hasOneFace(result)) {
    state.sustainedFrames = 0;
    return false;
  }

  if (challengeKey === 'blink') {
    const blinkScore =
      (getBlendshapeScore(result, 'eyeBlinkLeft') +
        getBlendshapeScore(result, 'eyeBlinkRight')) /
      2;

    if (blinkScore < 0.2) {
      state.blinkOpenSeen = true;
    }

    if (state.blinkOpenSeen && blinkScore > 0.45) {
      state.blinkClosedSeen = true;
    }

    return state.blinkOpenSeen && state.blinkClosedSeen && blinkScore < 0.25;
  }

  if (challengeKey === 'smile') {
    const smileScore =
      (getBlendshapeScore(result, 'mouthSmileLeft') +
        getBlendshapeScore(result, 'mouthSmileRight')) /
      2;

    state.sustainedFrames = smileScore > 0.45 ? state.sustainedFrames + 1 : 0;
    return state.sustainedFrames >= 3;
  }

  if (challengeKey === 'turn_left' || challengeKey === 'turn_right') {
    const yawDegrees = getYawDegrees(result);
    const isDetected =
      challengeKey === 'turn_left' ? yawDegrees < -12 : yawDegrees > 12;

    state.sustainedFrames = isDetected ? state.sustainedFrames + 1 : 0;
    return state.sustainedFrames >= 3;
  }

  return false;
};

const getFrameQuality = (canvas) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  let luminanceSum = 0;
  let edgeSum = 0;
  const step = 16;

  for (let i = 0; i < pixels.length; i += step) {
    const luminance =
      0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    luminanceSum += luminance;

    if (i >= step) {
      const previous =
        0.2126 * pixels[i - step] +
        0.7152 * pixels[i - step + 1] +
        0.0722 * pixels[i - step + 2];
      edgeSum += Math.abs(luminance - previous);
    }
  }

  const sampleCount = Math.max(1, pixels.length / step);
  const averageLuminance = luminanceSum / sampleCount;
  const exposurePenalty = Math.abs(averageLuminance - 128) / 128;
  const sharpnessScore = edgeSum / sampleCount;

  return sharpnessScore * (1 - Math.min(exposurePenalty, 0.85));
};

const getLiveFrameSuitability = (frame) => {
  const challengeBonus =
    frame.challengeKey === FACE_MATCH_CANDIDATE_KEY
      ? 55
      : ['blink', 'smile'].includes(frame.challengeKey)
        ? 25
        : -30;

  return (
    frame.quality +
    (frame.frontalScore || 0) * 90 +
    (frame.centerScore || 0) * 25 +
    (frame.faceSizeScore || 0) * 20 +
    challengeBonus
  );
};

const normalizeChallengeSequence = (sequence) =>
  Array.isArray(sequence)
    ? sequence.filter((challenge) => CHALLENGE_POOL.includes(challenge))
    : [];

const LivenessVerificationModal = ({
  session,
  onVerified,
  onFailed,
  onCancel,
  onSwitchToQr,
  allowQrFallback = false,
  embedded = false
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const isMountedRef = useRef(true);

  const challengeSequence = useMemo(
    () => normalizeChallengeSequence(session?.challengeSequence),
    [session?.challengeSequence]
  );

  const [status, setStatus] = useState('idle');
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [completedChallengeKeys, setCompletedChallengeKeys] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const stopDetector = () => {
    detectorRef.current?.close?.();
    detectorRef.current = null;
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      stopDetector();
      stopCamera();
    };
  }, []);

  const captureFrame = async ({ challengeKey, frameIndex, result = null }) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, width, height);

    const quality = getFrameQuality(canvas);
    const metrics = getFaceFrameMetrics(result);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );

    if (!blob || blob.size === 0) {
      return null;
    }

    return {
      blob,
      quality,
      challengeKey,
      frameIndex,
      mimeType: blob.type || 'image/jpeg',
      ...metrics,
      capturedAt: new Date().toISOString()
    };
  };

  const submitFrames = async ({ liveCapturedFrame, challengeFrames, metadata }) => {
    const formData = new FormData();

    formData.append(
      'live_captured_frame',
      liveCapturedFrame.blob,
      'live_captured_frame.jpg'
    );
    challengeFrames.forEach((frame, index) => {
      formData.append(
        'challenge_frames',
        frame.blob,
        `challenge_${index}.jpg`
      );
    });
    formData.append('challenge_metadata', JSON.stringify(metadata));

    if (session?.mobileToken) {
      formData.append('mobileToken', session.mobileToken);
    }

    await api.post(`/biometric/sessions/${session.sessionId}/complete`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  };

  const maybeCaptureChallengeFrame = async ({
    challengeFrames,
    challengeKey,
    frameIndex,
    result
  }) => {
    if (challengeFrames.length >= MAX_CHALLENGE_FRAMES) {
      return null;
    }

    const capturedFrame = await captureFrame({
      challengeKey,
      frameIndex,
      result
    });

    if (capturedFrame) {
      challengeFrames.push(capturedFrame);
    }

    return capturedFrame;
  };

  const captureFaceMatchCandidates = async ({ detector, video, startFrameIndex }) => {
    const candidateFrames = [];
    const startedAt = Date.now();
    let frameIndex = startFrameIndex;

    while (
      isMountedRef.current &&
      Date.now() - startedAt < 2500 &&
      candidateFrames.length < 6
    ) {
      const result = detector.detectForVideo(video, performance.now());
      const metrics = getFaceFrameMetrics(result);

      if (metrics.hasOneFace && Math.abs(metrics.yawDegrees) <= 12) {
        const frame = await captureFrame({
          challengeKey: FACE_MATCH_CANDIDATE_KEY,
          frameIndex,
          result
        });

        if (frame) {
          candidateFrames.push(frame);
          frameIndex += 1;
        }
      }

      await wait(250);
    }

    return candidateFrames;
  };

  const runChallenges = async () => {
    if (challengeSequence.length !== CHALLENGE_POOL.length) {
      throw new Error(DETECTOR_START_MESSAGE);
    }

    const detector = detectorRef.current;
    const video = videoRef.current;

    if (!detector || !video) {
      throw new Error(DETECTOR_START_MESSAGE);
    }

    const challengeFrames = [];
    const completedChallenges = [];
    const challengeTimeoutMs = getChallengeTimeoutMs();
    let lastCaptureAt = 0;
    let frameIndex = 0;

    for (let index = 0; index < challengeSequence.length; index += 1) {
      if (!isMountedRef.current) {
        return;
      }

      const challengeKey = challengeSequence[index];
      const challengeState = createChallengeState();
      const startedAt = Date.now();
      let detected = false;

      setActiveChallengeIndex(index);

      while (isMountedRef.current && Date.now() - startedAt < challengeTimeoutMs) {
        const now = Date.now();
        const result = detector.detectForVideo(video, performance.now());

        if (now - lastCaptureAt >= 900) {
          await maybeCaptureChallengeFrame({
            challengeFrames,
            challengeKey,
            frameIndex,
            result
          });
          frameIndex += 1;
          lastCaptureAt = now;
        }

        if (detectChallengeCompletion({ challengeKey, result, state: challengeState })) {
          await maybeCaptureChallengeFrame({
            challengeFrames,
            challengeKey,
            frameIndex,
            result
          });
          frameIndex += 1;

          const completedAt = new Date().toISOString();
          completedChallenges.push({
            key: challengeKey,
            completedAt,
            frameCount: challengeFrames.filter(
              (frame) => frame.challengeKey === challengeKey
            ).length
          });
          setCompletedChallengeKeys((previousKeys) => [
            ...previousKeys,
            challengeKey
          ]);
          detected = true;
          break;
        }

        await wait(120);
      }

      if (!detected) {
        stopDetector();
        stopCamera();
        setErrorMessage(TIMEOUT_MESSAGE);
        setStatus('error');
        return;
      }

      await wait(350);
    }

    if (challengeFrames.length < challengeSequence.length) {
      throw new Error('Could not capture liveness frames. Please try again.');
    }

    setStatus('capturing');

    const faceMatchCandidateFrames = await captureFaceMatchCandidates({
      detector,
      video,
      startFrameIndex: frameIndex
    });
    const liveFrameCandidates = [
      ...faceMatchCandidateFrames,
      ...challengeFrames
    ];
    const liveCapturedFrame = liveFrameCandidates.reduce((bestFrame, currentFrame) =>
      getLiveFrameSuitability(currentFrame) > getLiveFrameSuitability(bestFrame)
        ? currentFrame
        : bestFrame
    );

    const metadata = {
      challenges: challengeSequence,
      challengeSequence,
      completedChallengeSequence: completedChallenges.map(
        (challenge) => challenge.key
      ),
      completedChallenges,
      capturedFrameCount: challengeFrames.length,
      detector: 'mediapipe_face_landmarker',
      challengeTimeoutSeconds: challengeTimeoutMs / 1000,
      bestLiveCapturedFrame: {
        challenge: liveCapturedFrame.challengeKey,
        capturedAt: liveCapturedFrame.capturedAt,
        yawDegrees: Number(liveCapturedFrame.yawDegrees || 0).toFixed(2)
      },
      faceMatchCandidateFrameCount: faceMatchCandidateFrames.length,
      completedAt: new Date().toISOString()
    };

    if (import.meta.env.DEV) {
      console.info('Face verification frame debug:', {
        liveFrameBlobSize: liveCapturedFrame.blob.size,
        liveFrameMimeType: liveCapturedFrame.blob.type,
        challengeFrameCount: challengeFrames.length,
        faceMatchCandidateFrameCount: faceMatchCandidateFrames.length,
        selectedChallengeName: liveCapturedFrame.challengeKey,
        selectedYawDegrees: Number(liveCapturedFrame.yawDegrees || 0).toFixed(2),
        selectedFrontalScore: Number(liveCapturedFrame.frontalScore || 0).toFixed(3)
      });
    }

    setStatus('submitting');
    await submitFrames({
      liveCapturedFrame,
      challengeFrames,
      metadata
    });

    stopDetector();
    stopCamera();
    setStatus('success');
    onVerified?.();
  };

  const startCamera = async () => {
    setErrorMessage('');
    setCompletedChallengeKeys([]);
    setActiveChallengeIndex(0);
    setStatus('requesting');
    const permissionState = await getCameraPermissionState();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not available on this browser.');
      }

      if (window.isSecureContext === false) {
        throw new DOMException(
          CAMERA_SECURE_CONTEXT_MESSAGE,
          'SecurityError'
        );
      }

      if (challengeSequence.length !== CHALLENGE_POOL.length) {
        throw new Error(DETECTOR_START_MESSAGE);
      }

      const stream = await getCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, stream);
      }

      setStatus('preparing');
      detectorRef.current = await createFaceLandmarker();

      setStatus('running');
      await runChallenges();
    } catch (error) {
      stopDetector();
      stopCamera();

      console.warn('Camera or liveness detector failed:', error?.name, error?.message);

      const isPermissionError = isPermissionDeniedError(error, permissionState);
      const isBiometricApiError = Boolean(error?.response?.data);
      const biometricCode = error?.response?.data?.code;
      const message =
        error?.message === DETECTOR_START_MESSAGE
          ? DETECTOR_START_MESSAGE
          : isBiometricApiError
            ? getBiometricErrorMessage(error)
            : getCameraErrorMessage(error, permissionState);

      setErrorMessage(message);
      setStatus('error');

      if (
        isBiometricApiError &&
        biometricCode !== 'BIOMETRIC_VERIFICATION_IN_PROGRESS' &&
        !isPermissionError
      ) {
        onFailed?.(message);
      }
    }
  };

  const handleCancel = () => {
    stopDetector();
    stopCamera();
    onCancel?.();
  };

  const activeChallengeKey = challengeSequence[activeChallengeIndex];
  const activeInstruction = activeChallengeKey
    ? CHALLENGE_INSTRUCTIONS[activeChallengeKey]
    : '';
  const activeChallengeGuide = activeChallengeKey
    ? CHALLENGE_GUIDES[activeChallengeKey]
    : null;
  const activeStepLabel = activeChallengeKey
    ? `Step ${activeChallengeIndex + 1} of ${challengeSequence.length}`
    : 'Liveness step';

  const content = (
    <div className={embedded ? 'liveness-panel embedded' : 'liveness-panel'}>
      <div className="liveness-header">
        <div>
          <h2>Face verification</h2>
          <p>Follow each prompt while the camera captures the live captured frame.</p>
        </div>
        {!embedded && (
          <button
            type="button"
            className="liveness-icon-button"
            onClick={handleCancel}
            aria-label="Close face verification"
          >
            <FaTimes />
          </button>
        )}
      </div>

      <div className="liveness-body">
        <div className="liveness-camera-column">
          <div className="liveness-camera-shell">
            <video ref={videoRef} playsInline muted className="liveness-video" />
            {status === 'idle' && (
              <div className="liveness-camera-placeholder">
                <FaCamera />
                <span>Camera will open after permission is granted.</span>
              </div>
            )}
            {(status === 'requesting' ||
              status === 'preparing' ||
              status === 'submitting') && (
              <div className="liveness-camera-placeholder">
                <FaSpinner className="liveness-spin" />
                <span>
                  {status === 'requesting'
                    ? 'Requesting camera permission...'
                    : status === 'preparing'
                      ? 'Preparing liveness detector...'
                      : 'Sending live captured frame for verification...'}
                </span>
              </div>
            )}
            {status === 'success' && (
              <div className="liveness-camera-placeholder success">
                <FaCheck />
                <span>Face verification completed.</span>
              </div>
            )}
          </div>
        </div>

        <div className="liveness-guide-column">
          {activeChallengeGuide && (
            <div className="liveness-guide" aria-live="polite">
              <div className="liveness-guide-image-frame">
                <img
                  src={activeChallengeGuide.src}
                  alt={activeChallengeGuide.alt}
                  width="160"
                  height="160"
                  loading="lazy"
                />
              </div>
              <div className="liveness-guide-copy">
                <span className="liveness-guide-step">{activeStepLabel}</span>
                <h3>
                  {activeStepLabel}: {activeInstruction}
                </h3>
                <p>
                  {status === 'preparing'
                    ? 'Preparing liveness detector...'
                    : status === 'capturing'
                      ? 'Please look straight at the camera for the final face check.'
                    : 'Complete this action while keeping your face inside the camera view.'}
                </p>
              </div>
            </div>
          )}

          <div className="liveness-challenges" aria-label="Liveness progress">
            {challengeSequence.map((challengeKey, index) => {
              const isDone = completedChallengeKeys.includes(challengeKey);
              const isActive =
                index === activeChallengeIndex &&
                !isDone &&
                !['success', 'submitting'].includes(status);
              const isLocked = index > activeChallengeIndex && !isDone;

              return (
                <div
                  key={`${challengeKey}-${index}`}
                  className={`liveness-challenge ${isActive ? 'active' : ''} ${
                    isDone ? 'done' : ''
                  } ${isLocked ? 'locked' : ''}`}
                >
                  <span>Step {index + 1}</span>
                  <strong>{CHALLENGE_LABELS[challengeKey]}</strong>
                </div>
              );
            })}
          </div>

          {errorMessage && <div className="liveness-error">{errorMessage}</div>}
        </div>
      </div>

      <canvas ref={canvasRef} className="liveness-canvas" />

      <div className="liveness-actions">
        {allowQrFallback && status === 'error' ? (
          <button type="button" className="btn btn-secondary" onClick={onSwitchToQr}>
            Scan QR with mobile
          </button>
        ) : null}
        {status === 'idle' || status === 'error' ? (
          <button type="button" className="btn btn-primary" onClick={startCamera}>
            <FaCamera /> Start camera
          </button>
        ) : null}
        <button type="button" className="btn btn-outline" onClick={handleCancel}>
          <FaTimes /> Cancel
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="liveness-modal-overlay">{content}</div>;
};

export default LivenessVerificationModal;
