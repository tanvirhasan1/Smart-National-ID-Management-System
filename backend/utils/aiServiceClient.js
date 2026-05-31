const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PROVIDER = 'opencv-yunet-sface-minifasnet';

const toBoolean = (value) => value === true || value === 'true';

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAiResult = (data = {}) => ({
  provider: data.provider || DEFAULT_PROVIDER,
  success: toBoolean(data.success),
  livenessPassed: toBoolean(data.liveness_passed),
  faceMatchPassed: toBoolean(data.face_match_passed),
  singleFaceDetected: toBoolean(data.single_face_detected),
  challengePassed: toBoolean(data.challenge_passed),
  livenessScore: toNumberOrNull(data.liveness_score),
  faceMatchScore: toNumberOrNull(data.face_match_score),
  faceMatchMetric: String(data.face_match_metric || 'cosine').trim(),
  livenessThreshold: toNumberOrNull(data.liveness_threshold),
  faceMatchThreshold: toNumberOrNull(data.face_match_threshold),
  failureReason: String(data.failure_reason || '').trim(),
  qualityChecks:
    data.quality_checks && typeof data.quality_checks === 'object'
      ? data.quality_checks
      : null
});

const appendFile = (formData, fieldName, file) => {
  formData.append(
    fieldName,
    new Blob([file.buffer], { type: file.mimetype }),
    file.originalname || `${fieldName}.jpg`
  );
};

const verifyBiometricSession = async ({
  passportPhoto,
  liveCapturedFrame,
  challengeFrames = [],
  challengeMetadata = {}
}) => {
  const serviceUrl = (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');
  const serviceSecret = process.env.AI_SERVICE_SECRET;

  if (!serviceUrl || !serviceSecret) {
    return normalizeAiResult({
      success: false,
      failure_reason: 'AI service is not configured'
    });
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();

    appendFile(formData, 'passport_photo', passportPhoto);
    appendFile(formData, 'live_captured_frame', liveCapturedFrame);

    challengeFrames.forEach((frame) => {
      appendFile(formData, 'challenge_frames', frame);
    });

    formData.append('challenge_metadata', JSON.stringify(challengeMetadata || {}));

    const response = await fetch(`${serviceUrl}/v1/verify`, {
      method: 'POST',
      headers: {
        'X-AI-Service-Secret': serviceSecret
      },
      body: formData,
      signal: controller.signal
    });

    const responseText = await response.text();
    let parsedBody = {};

    if (responseText) {
      try {
        parsedBody = JSON.parse(responseText);
      } catch (error) {
        parsedBody = {
          success: false,
          failure_reason: 'AI service returned an invalid response'
        };
      }
    }

    if (!response.ok) {
      return normalizeAiResult({
        ...parsedBody,
        success: false,
        failure_reason:
          parsedBody.failure_reason ||
          parsedBody.detail ||
          `AI service request failed with status ${response.status}`
      });
    }

    return normalizeAiResult(parsedBody);
  } catch (error) {
    return normalizeAiResult({
      success: false,
      failure_reason:
        error.name === 'AbortError'
          ? 'AI service verification timed out'
          : 'AI service verification failed'
    });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  verifyBiometricSession,
  normalizeAiResult
};
