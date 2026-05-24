const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const BiometricVerificationSession = require('../models/BiometricVerificationSession');
const User = require('../models/User');
const { verifyAccessToken } = require('../utils/token');
const { verifyBiometricSession } = require('../utils/aiServiceClient');

const BIOMETRIC_PROVIDER = 'opencv-yunet-sface-minifasnet';
const FAILURE_MESSAGE =
  'Face verification failed. Please upload a recent passport-size photo and try again.';
const QUALITY_FAILURE_MESSAGE =
  'Face verification failed. Please ensure your face is clear and try again.';
const SERVICE_FAILURE_MESSAGE =
  'Face verification service is not ready. Please try again later.';
const TOO_MANY_ATTEMPTS_MESSAGE =
  'Too many face verification attempts. Please restart verification and try again.';
const TOO_MANY_QR_OPENS_MESSAGE =
  'This face verification link has been opened too many times. Please restart verification.';
const SESSION_EXPIRED_MESSAGE =
  'Face verification session expired. Please try again.';
const IN_PROGRESS_MESSAGE =
  'Face verification is already in progress. Please wait and try again.';
const TOKEN_PURPOSE = 'biometric_liveness';
const CHALLENGE_POOL = ['blink', 'turn_left', 'turn_right', 'smile'];
const ERROR_CODES = {
  IN_PROGRESS: 'BIOMETRIC_VERIFICATION_IN_PROGRESS',
  SESSION_EXPIRED: 'BIOMETRIC_SESSION_EXPIRED',
  TOO_MANY_ATTEMPTS: 'BIOMETRIC_TOO_MANY_ATTEMPTS',
  TOO_MANY_QR_OPENS: 'BIOMETRIC_TOO_MANY_QR_OPENS',
  CHALLENGE_SEQUENCE_INVALID: 'BIOMETRIC_CHALLENGE_SEQUENCE_INVALID'
};

const QUALITY_FAILURE_REASONS = [
  'PASSPORT_FACE_NOT_FOUND',
  'LIVE_FACE_NOT_FOUND',
  'MULTIPLE_FACES_DETECTED',
  'LIVE_FRAME_TOO_BLURRY',
  'LIVE_FRAME_TOO_DARK',
  'LIVE_FRAME_TOO_BRIGHT',
  'PASSPORT_FRAME_TOO_BLURRY',
  'PASSPORT_FRAME_TOO_DARK',
  'PASSPORT_FRAME_TOO_BRIGHT',
  'FACE_TOO_SMALL'
];

const allowedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const getMaxImageBytes = () =>
  (Number(process.env.BIOMETRIC_MAX_IMAGE_MB) || 5) * 1024 * 1024;

const biometricUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!allowedImageMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
    }

    cb(null, true);
  },
  limits: {
    fileSize: getMaxImageBytes(),
    files: 22
  }
});

const handleMulterUpload = (uploadHandler) => (req, res, next) => {
  uploadHandler(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next();
  });
};

const uploadPassportPhoto = handleMulterUpload(
  biometricUpload.single('passport_photo')
);

const uploadBiometricCompletion = handleMulterUpload(
  biometricUpload.fields([
    { name: 'live_captured_frame', maxCount: 1 },
    { name: 'challenge_frames', maxCount: 20 }
  ])
);

const getRequestIp = (req) => {
  const forwardedHeader = req.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedHeader)
    ? forwardedHeader[0]
    : forwardedHeader;

  return forwardedValue
    ? String(forwardedValue).split(',')[0].trim()
    : req.ip || req.socket?.remoteAddress || '';
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const generateSessionId = () => crypto.randomBytes(32).toString('base64url');

const generateChallengeSequence = () => {
  const sequence = [...CHALLENGE_POOL];

  for (let index = sequence.length - 1; index > 0; index -= 1) {
    const randomIndex = crypto.randomInt(0, index + 1);
    [sequence[index], sequence[randomIndex]] = [
      sequence[randomIndex],
      sequence[index]
    ];
  }

  return sequence;
};

const getPositiveIntegerEnv = (name, defaultValue, { min = 1, max = null } = {}) => {
  const parsed = Number(process.env[name]);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  const integerValue = Math.floor(parsed);
  const minBounded = Math.max(integerValue, min);

  return max ? Math.min(minBounded, max) : minBounded;
};

const getSessionTtlMinutes = () => {
  return getPositiveIntegerEnv('BIOMETRIC_SESSION_TTL_MINUTES', 10, {
    min: 1,
    max: 60
  });
};

const getMaxAttempts = () =>
  getPositiveIntegerEnv('BIOMETRIC_MAX_ATTEMPTS', 3, { min: 1, max: 20 });

const getMaxQrOpens = () =>
  getPositiveIntegerEnv('BIOMETRIC_MAX_QR_OPENS', 10, { min: 1, max: 100 });

const getInProgressTimeoutSeconds = () =>
  getPositiveIntegerEnv('BIOMETRIC_IN_PROGRESS_TIMEOUT_SECONDS', 120, {
    min: 30,
    max: 600
  });

const getBiometricTokenSecret = () =>
  process.env.BIOMETRIC_SESSION_SECRET || process.env.ACCESS_TOKEN_SECRET;

const createSignedMobileToken = ({ sessionId, expiresAt }) => {
  const secret = getBiometricTokenSecret();

  if (!secret) {
    throw new Error('Biometric token secret is not configured');
  }

  const expiresInSeconds = Math.max(
    60,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000)
  );

  return jwt.sign(
    {
      sid: sessionId,
      nonce: crypto.randomBytes(24).toString('base64url'),
      purpose: TOKEN_PURPOSE
    },
    secret,
    {
      expiresIn: expiresInSeconds,
      issuer: 'smart-nid-backend',
      audience: 'smart-nid-biometric'
    }
  );
};

const verifySignedMobileToken = (token) => {
  const secret = getBiometricTokenSecret();

  if (!secret) {
    throw new Error('Biometric token secret is not configured');
  }

  return jwt.verify(token, secret, {
    issuer: 'smart-nid-backend',
    audience: 'smart-nid-biometric'
  });
};

const isInProgress = (session) =>
  session?.inProgressUntil && session.inProgressUntil.getTime() > Date.now();

const validateMobileTokenForSession = ({ token, session }) => {
  if (!token) {
    return false;
  }

  try {
    const decoded = verifySignedMobileToken(token);

    return (
      decoded?.purpose === TOKEN_PURPOSE &&
      decoded?.sid === session.sessionId &&
      session.qrTokenHash === sha256(token)
    );
  } catch (error) {
    return false;
  }
};

const getMobileBaseUrl = (req) => {
  const configuredBaseUrl =
    process.env.BIOMETRIC_MOBILE_BASE_URL ||
    process.env.LIVENESS_MOBILE_BASE_URL ||
    '';

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  const requestedBaseUrl = String(req.body?.mobileBaseUrl || '').trim();

  if (
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\//i.test(requestedBaseUrl)
  ) {
    return requestedBaseUrl.replace(/\/$/, '');
  }

  const originHeader = Array.isArray(req.headers.origin)
    ? req.headers.origin[0]
    : req.headers.origin;

  if (originHeader) {
    return `${String(originHeader).replace(/\/$/, '')}/liveness/mobile`;
  }

  const firstFrontendUrl = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)[0];

  return `${(firstFrontendUrl || 'http://localhost:5173').replace(
    /\/$/,
    ''
  )}/liveness/mobile`;
};

const buildMobileUrl = ({ req, sessionId, token }) => {
  const mobileBaseUrl = getMobileBaseUrl(req);
  const separator = mobileBaseUrl.includes('?') ? '&' : '?';

  return `${mobileBaseUrl}/${encodeURIComponent(sessionId)}${separator}token=${encodeURIComponent(
    token
  )}`;
};

const parseBoolean = (value) => value === true || value === 'true';

const isDevelopmentBiometricDebugEnabled = () =>
  process.env.NODE_ENV !== 'production' &&
  (process.env.BIOMETRIC_DEBUG === 'true' || process.env.AI_DEBUG === 'true');

const logBiometricDebug = (message, metadata = {}) => {
  if (!isDevelopmentBiometricDebugEnabled()) {
    return;
  }

  console.info(`[face-verification] ${message}`, metadata);
};

const getFailureReasonText = (failureReason = '') =>
  String(failureReason || '').toUpperCase();

const isQualityFailureReason = (failureReason = '') => {
  const normalizedReason = getFailureReasonText(failureReason);

  return QUALITY_FAILURE_REASONS.some((reason) =>
    normalizedReason.includes(reason)
  );
};

const getFailureCodeForReason = (failureReason = '') => {
  const normalizedReason = getFailureReasonText(failureReason);

  if (isQualityFailureReason(normalizedReason)) {
    return 'FACE_VERIFICATION_QUALITY_FAILED';
  }

  if (normalizedReason.includes('FACE_MATCH_FAILED')) {
    return 'FACE_MATCH_FAILED';
  }

  if (normalizedReason.includes('LIVENESS_FAILED')) {
    return 'LIVENESS_FAILED';
  }

  if (normalizedReason.includes('MODEL_FILE_MISSING')) {
    return 'MODEL_FILE_MISSING';
  }

  if (
    normalizedReason.includes('MODEL_ERROR') ||
    normalizedReason.includes('AI SERVICE') ||
    normalizedReason.includes('VERIFICATION TIMED OUT')
  ) {
    return 'FACE_VERIFICATION_SERVICE_UNAVAILABLE';
  }

  return '';
};

const getFailureMessageForReason = (failureReason = '') => {
  const normalizedReason = getFailureReasonText(failureReason);

  if (
    normalizedReason.includes('MODEL_FILE_MISSING') ||
    normalizedReason.includes('MODEL_ERROR') ||
    normalizedReason.includes('AI SERVICE') ||
    normalizedReason.includes('VERIFICATION TIMED OUT')
  ) {
    return SERVICE_FAILURE_MESSAGE;
  }

  return isQualityFailureReason(failureReason)
    ? QUALITY_FAILURE_MESSAGE
    : FAILURE_MESSAGE;
};

const parseChallengeMetadata = (rawMetadata) => {
  if (!rawMetadata) {
    return {};
  }

  if (typeof rawMetadata === 'object') {
    return rawMetadata;
  }

  try {
    return JSON.parse(rawMetadata);
  } catch (error) {
    return {};
  }
};

const getSessionChallengeSequence = (session) => {
  const sequence = Array.isArray(session.challengeSequence)
    ? session.challengeSequence.filter((challenge) =>
        CHALLENGE_POOL.includes(challenge)
      )
    : [];

  return sequence.length === CHALLENGE_POOL.length ? sequence : CHALLENGE_POOL;
};

const getCompletedChallengeSequence = (challengeMetadata) => {
  if (Array.isArray(challengeMetadata.completedChallengeSequence)) {
    return challengeMetadata.completedChallengeSequence;
  }

  if (Array.isArray(challengeMetadata.completedChallenges)) {
    return challengeMetadata.completedChallenges.map((challenge) => challenge.key);
  }

  if (Array.isArray(challengeMetadata.challenges)) {
    return challengeMetadata.challenges;
  }

  return [];
};

const doChallengeSequencesMatch = (leftSequence, rightSequence) =>
  leftSequence.length === rightSequence.length &&
  leftSequence.every((challenge, index) => challenge === rightSequence[index]);

const validateChallengeMetadata = ({ session, challengeMetadata, frameCount }) => {
  const expectedSequence = getSessionChallengeSequence(session);
  const metadataSequence = Array.isArray(challengeMetadata.challengeSequence)
    ? challengeMetadata.challengeSequence
    : challengeMetadata.challenges;
  const completedSequence = getCompletedChallengeSequence(challengeMetadata);

  if (!doChallengeSequencesMatch(expectedSequence, metadataSequence || [])) {
    return false;
  }

  if (!doChallengeSequencesMatch(expectedSequence, completedSequence)) {
    return false;
  }

  if (frameCount < expectedSequence.length) {
    return false;
  }

  return true;
};

const getAuthenticatedUserFromRequest = async (req) => {
  const authorizationHeader = req.headers.authorization || '';

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authorizationHeader.split('Bearer ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || user.isArchived || user.status === 'blocked') {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
};

const expireSessionIfNeeded = async (session) => {
  if (
    session &&
    session.expiresAt &&
    session.expiresAt.getTime() <= Date.now() &&
    !['expired', 'used'].includes(session.status)
  ) {
    session.status = 'expired';
    session.failureReason = session.failureReason || 'Biometric session expired';
    session.qrTokenHash = '';
    session.passportPhoto = undefined;
    session.verificationStartedAt = null;
    session.inProgressUntil = null;
    await session.save();
  }

  return session;
};

const getSafeFailurePayload = (session) => {
  if (session.status === 'expired') {
    return {
      code: ERROR_CODES.SESSION_EXPIRED,
      message: SESSION_EXPIRED_MESSAGE
    };
  }

  if (session.failureReason === TOO_MANY_ATTEMPTS_MESSAGE) {
    return {
      code: ERROR_CODES.TOO_MANY_ATTEMPTS,
      message: TOO_MANY_ATTEMPTS_MESSAGE
    };
  }

  if (session.failureReason === TOO_MANY_QR_OPENS_MESSAGE) {
    return {
      code: ERROR_CODES.TOO_MANY_QR_OPENS,
      message: TOO_MANY_QR_OPENS_MESSAGE
    };
  }

  if (session.status === 'failed') {
    return {
      code: getFailureCodeForReason(session.failureReason),
      message: getFailureMessageForReason(session.failureReason)
    };
  }

  return {
    code: '',
    message: ''
  };
};

const toSafeStatusPayload = (session) => {
  const failurePayload = getSafeFailurePayload(session);

  return {
    sessionId: session.sessionId,
    status: session.status,
    expiresAt: session.expiresAt,
    verifiedAt: session.verifiedAt,
    deviceType: session.deviceType,
    qrFlow: session.qrFlow,
    challengeSequence: getSessionChallengeSequence(session),
    code: failurePayload.code,
    message: failurePayload.message
  };
};

const failSessionWithLimit = async ({ session, failureReason }) => {
  session.status = 'failed';
  session.failureReason = failureReason;
  session.qrTokenHash = '';
  session.passportPhoto = undefined;
  session.verificationStartedAt = null;
  session.inProgressUntil = null;
  await session.save();
};

const createBiometricSession = async (req, res) => {
  try {
    await expireOldSessions();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Passport-size photo is required'
      });
    }

    if (!req.user || req.user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Only citizens can create biometric verification sessions'
      });
    }

    const deviceType = req.body.deviceType === 'desktop' ? 'desktop' : 'mobile';
    const qrFlow =
      req.body.qrFlow === undefined
        ? deviceType === 'desktop'
        : parseBoolean(req.body.qrFlow);
    const expiresAt = new Date(Date.now() + getSessionTtlMinutes() * 60 * 1000);
    const sessionId = generateSessionId();
    const challengeSequence = generateChallengeSequence();
    const mobileToken = createSignedMobileToken({ sessionId, expiresAt });
    const mobileUrl = buildMobileUrl({
      req,
      sessionId,
      token: mobileToken
    });

    const biometricSession = await BiometricVerificationSession.create({
      citizen: req.user._id,
      sessionId,
      status: 'pending',
      passportPhotoHash: sha256(req.file.buffer),
      passportPhoto: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        originalName: req.file.originalname || 'passport-photo',
        size: req.file.size
      },
      qrTokenHash: sha256(mobileToken),
      deviceType,
      qrFlow,
      challengeSequence,
      provider: BIOMETRIC_PROVIDER,
      expiresAt,
      ipAddress: getRequestIp(req),
      userAgent: req.headers['user-agent'] || ''
    });

    return res.status(201).json({
      success: true,
      sessionId: biometricSession.sessionId,
      expiresAt: biometricSession.expiresAt,
      challengeSequence: biometricSession.challengeSequence,
      mobileUrl,
      qrPayload: mobileUrl
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not create biometric verification session. Please try again.'
    });
  }
};

const completeBiometricSession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Biometric session id is required'
      });
    }

    let session = await BiometricVerificationSession.findOne({
      sessionId
    }).select('+passportPhoto.data +qrTokenHash');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Biometric session not found'
      });
    }

    await expireSessionIfNeeded(session);

    if (session.status === 'expired') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.SESSION_EXPIRED,
        status: session.status,
        message: SESSION_EXPIRED_MESSAGE
      });
    }

    if (session.status !== 'pending') {
      return res.status(409).json({
        success: false,
        ...toSafeStatusPayload(session),
        message:
          toSafeStatusPayload(session).message ||
          'Biometric session is no longer available'
      });
    }

    const token =
      req.body.biometricToken ||
      req.body.mobileToken ||
      req.body.token ||
      req.headers['x-biometric-token'] ||
      '';
    const authenticatedUser = await getAuthenticatedUserFromRequest(req);
    const ownsSession =
      authenticatedUser &&
      String(authenticatedUser._id) === String(session.citizen) &&
      authenticatedUser.role === 'citizen';

    let validToken = false;

    if (token) {
      validToken = validateMobileTokenForSession({ token, session });
    }

    if (!ownsSession && !validToken) {
      return res.status(403).json({
        success: false,
        message: 'Biometric session token is invalid or expired'
      });
    }

    if (session.attemptCount >= getMaxAttempts()) {
      await failSessionWithLimit({
        session,
        failureReason: TOO_MANY_ATTEMPTS_MESSAGE
      });

      return res.status(429).json({
        success: false,
        code: ERROR_CODES.TOO_MANY_ATTEMPTS,
        status: session.status,
        message: TOO_MANY_ATTEMPTS_MESSAGE
      });
    }

    if (isInProgress(session)) {
      return res.status(409).json({
        success: false,
        code: ERROR_CODES.IN_PROGRESS,
        status: session.status,
        message: IN_PROGRESS_MESSAGE
      });
    }

    const liveCapturedFrame = req.files?.live_captured_frame?.[0];
    const challengeFrames = req.files?.challenge_frames || [];

    if (!liveCapturedFrame) {
      return res.status(400).json({
        success: false,
        message: 'Live captured frame is required'
      });
    }

    if (challengeFrames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Challenge frames are required'
      });
    }

    const challengeMetadata = parseChallengeMetadata(req.body.challenge_metadata);

    if (
      !validateChallengeMetadata({
        session,
        challengeMetadata,
        frameCount: challengeFrames.length
      })
    ) {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.CHALLENGE_SEQUENCE_INVALID,
        message: 'Challenge sequence is invalid. Please restart verification.'
      });
    }

    if (!session.passportPhoto?.data) {
      session.status = 'failed';
      session.failureReason = 'Passport-size photo is no longer available';
      session.qrTokenHash = '';
      await session.save();

      return res.status(400).json({
        success: false,
        status: session.status,
        message: FAILURE_MESSAGE
      });
    }

    const attemptFilter = {
      _id: session._id,
      status: 'pending',
      expiresAt: { $gt: new Date() },
      attemptCount: { $lt: getMaxAttempts() },
      $or: [
        { inProgressUntil: null },
        { inProgressUntil: { $lte: new Date() } }
      ]
    };

    if (validToken) {
      attemptFilter.qrTokenHash = sha256(token);
    }

    const attemptUpdate = {
      $inc: {
        attemptCount: 1
      },
      $set: {
        verificationStartedAt: new Date(),
        inProgressUntil: new Date(
          Date.now() + getInProgressTimeoutSeconds() * 1000
        )
      }
    };

    const attemptSession = await BiometricVerificationSession.findOneAndUpdate(
      attemptFilter,
      attemptUpdate,
      {
        new: true
      }
    ).select('+passportPhoto.data +qrTokenHash');

    if (!attemptSession) {
      const latestSession = await BiometricVerificationSession.findById(
        session._id
      ).select('+qrTokenHash');

      if (latestSession && isInProgress(latestSession)) {
        return res.status(409).json({
          success: false,
          code: ERROR_CODES.IN_PROGRESS,
          status: latestSession.status,
          message: IN_PROGRESS_MESSAGE
        });
      }

      if (latestSession?.attemptCount >= getMaxAttempts()) {
        await failSessionWithLimit({
          session: latestSession,
          failureReason: TOO_MANY_ATTEMPTS_MESSAGE
        });

        return res.status(429).json({
          success: false,
          code: ERROR_CODES.TOO_MANY_ATTEMPTS,
          status: latestSession.status,
          message: TOO_MANY_ATTEMPTS_MESSAGE
        });
      }

      return res.status(409).json({
        success: false,
        status: session.status,
        message: 'Biometric session is no longer available'
      });
    }

    session = attemptSession;

    logBiometricDebug('received face verification files', {
      passportPhotoExists: Boolean(session.passportPhoto?.data),
      passportPhotoBytes: session.passportPhoto?.data?.length || 0,
      liveCapturedFrameExists: Boolean(liveCapturedFrame?.buffer),
      liveCapturedFrameBytes: liveCapturedFrame?.buffer?.length || 0,
      liveCapturedFrameMimeType: liveCapturedFrame?.mimetype || '',
      challengeFrameCount: challengeFrames.length
    });

    const aiResult = await verifyBiometricSession({
      passportPhoto: {
        buffer: session.passportPhoto.data,
        mimetype: session.passportPhoto.contentType,
        originalname: session.passportPhoto.originalName
      },
      liveCapturedFrame: {
        buffer: liveCapturedFrame.buffer,
        mimetype: liveCapturedFrame.mimetype,
        originalname: liveCapturedFrame.originalname
      },
      challengeFrames: challengeFrames.map((frame) => ({
        buffer: frame.buffer,
        mimetype: frame.mimetype,
        originalname: frame.originalname
      })),
      challengeMetadata
    });

    logBiometricDebug('AI face verification result', {
      failureReason: aiResult.failureReason,
      faceMatchScore: aiResult.faceMatchScore,
      faceMatchThreshold: aiResult.faceMatchThreshold,
      faceMatchMetric: aiResult.faceMatchMetric,
      livenessScore: aiResult.livenessScore,
      livenessThreshold: aiResult.livenessThreshold,
      singleFaceDetected: aiResult.singleFaceDetected,
      challengePassed: aiResult.challengePassed
    });

    const passed =
      aiResult.success &&
      aiResult.livenessPassed &&
      aiResult.faceMatchPassed &&
      aiResult.singleFaceDetected &&
      aiResult.challengePassed;

    session.provider = aiResult.provider || BIOMETRIC_PROVIDER;
    session.livenessScore = aiResult.livenessScore;
    session.faceMatchScore = aiResult.faceMatchScore;
    session.livenessThreshold = aiResult.livenessThreshold;
    session.faceMatchThreshold = aiResult.faceMatchThreshold;
    session.singleFaceDetected = aiResult.singleFaceDetected;
    session.challengePassed = aiResult.challengePassed;
    session.failureReason = passed
      ? ''
      : aiResult.failureReason || 'Face verification failed';
    session.status = passed ? 'passed' : 'failed';
    session.verifiedAt = passed ? new Date() : null;
    session.qrTokenHash = '';
    session.passportPhoto = undefined;
    session.verificationStartedAt = null;
    session.inProgressUntil = null;

    await session.save();

    if (!passed) {
      return res.status(400).json({
        success: false,
        status: session.status,
        code: getFailureCodeForReason(session.failureReason),
        message: getFailureMessageForReason(session.failureReason)
      });
    }

    return res.status(200).json({
      success: true,
      status: session.status,
      message: 'Face verification passed'
    });
  } catch (error) {
    logBiometricDebug('face verification request failed', {
      errorName: error?.name || '',
      errorMessage: error?.message || ''
    });

    return res.status(500).json({
      success: false,
      message: FAILURE_MESSAGE
    });
  }
};

const openMobileBiometricSession = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const token =
      req.query.token ||
      req.body?.token ||
      req.headers['x-biometric-token'] ||
      '';

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Biometric session id is required'
      });
    }

    const session = await BiometricVerificationSession.findOne({
      sessionId
    }).select('+qrTokenHash');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Biometric session not found'
      });
    }

    await expireSessionIfNeeded(session);

    if (session.status === 'expired') {
      return res.status(400).json({
        success: false,
        code: ERROR_CODES.SESSION_EXPIRED,
        status: session.status,
        message: SESSION_EXPIRED_MESSAGE
      });
    }

    if (session.status !== 'pending') {
      return res.status(409).json({
        success: false,
        ...toSafeStatusPayload(session)
      });
    }

    const validToken = validateMobileTokenForSession({ token, session });

    if (!validToken) {
      return res.status(403).json({
        success: false,
        message: 'Verification link is invalid or expired'
      });
    }

    const openedSession = await BiometricVerificationSession.findOneAndUpdate(
      {
        _id: session._id,
        status: 'pending',
        expiresAt: { $gt: new Date() },
        qrTokenHash: sha256(token),
        qrOpenCount: { $lt: getMaxQrOpens() }
      },
      {
        $inc: {
          qrOpenCount: 1
        }
      },
      {
        new: true
      }
    );

    if (!openedSession) {
      const latestSession = await BiometricVerificationSession.findById(
        session._id
      ).select('+qrTokenHash');

      if (latestSession) {
        await expireSessionIfNeeded(latestSession);
      }

      if (latestSession?.status === 'expired') {
        return res.status(400).json({
          success: false,
          code: ERROR_CODES.SESSION_EXPIRED,
          status: latestSession.status,
          message: SESSION_EXPIRED_MESSAGE
        });
      }

      if (latestSession?.qrOpenCount >= getMaxQrOpens()) {
        await failSessionWithLimit({
          session: latestSession,
          failureReason: TOO_MANY_QR_OPENS_MESSAGE
        });

        return res.status(429).json({
          success: false,
          code: ERROR_CODES.TOO_MANY_QR_OPENS,
          status: latestSession.status,
          message: TOO_MANY_QR_OPENS_MESSAGE
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Biometric session is no longer available'
      });
    }

    return res.status(200).json({
      success: true,
      ...toSafeStatusPayload(openedSession)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not open biometric verification link. Please try again.'
    });
  }
};

const getBiometricSessionStatus = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Biometric session id is required'
      });
    }

    const session = await BiometricVerificationSession.findOne({
      sessionId,
      citizen: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Biometric session not found'
      });
    }

    await expireSessionIfNeeded(session);

    return res.status(200).json({
      success: true,
      ...toSafeStatusPayload(session)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Could not load biometric session status. Please try again.'
    });
  }
};

const expireOldSessions = async () => {
  await BiometricVerificationSession.updateMany(
    {
      status: { $in: ['pending', 'passed', 'failed'] },
      expiresAt: { $lte: new Date() }
    },
    {
      $set: {
        status: 'expired',
        failureReason: 'Biometric session expired'
      },
      $unset: {
        passportPhoto: '',
        qrTokenHash: '',
        verificationStartedAt: '',
        inProgressUntil: ''
      }
    }
  );
};

module.exports = {
  uploadPassportPhoto,
  uploadBiometricCompletion,
  createBiometricSession,
  openMobileBiometricSession,
  completeBiometricSession,
  getBiometricSessionStatus,
  expireOldSessions
};
