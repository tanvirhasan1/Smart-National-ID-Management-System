import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import {
  FaIdCard,
  FaCamera,
  FaSignature,
  FaUpload,
  FaSpinner,
  FaCheck,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaBriefcase,
  FaPhone,
  FaEnvelope,
  FaCalendar,
  FaVenusMars,
  FaQrcode,
  FaMobileAlt,
  FaTimes,
  FaLaptop,
  FaFileAlt
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { bangladeshLocations } from '../utils/helpers';
import api from '../api/axios';
import LivenessVerificationModal from './LivenessVerificationModal';
import {
  uploadCitizenApplicationDocument,
  verifyBirthCertificateDocument,
  getCitizenDocumentLabel
} from '../../services/applicationDocumentService';
import '../styles/ApplicationForm.css';

const FACE_FAILURE_MESSAGE =
  'Face verification failed. Please upload a recent passport-size photo and try again.';

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

const APPLICATION_ERROR_MESSAGES = {
  APPLICATION_BIOMETRIC_SESSION_REQUIRED:
    'Face verification is required before application submission.',
  APPLICATION_BIOMETRIC_SESSION_NOT_FOUND:
    'Face verification session was not found. Please restart verification.',
  APPLICATION_BIOMETRIC_SESSION_NOT_PASSED:
    'Application can be submitted only after face verification passes.',
  APPLICATION_BIOMETRIC_SESSION_EXPIRED:
    'Face verification session expired. Please restart verification.',
  APPLICATION_BIOMETRIC_SESSION_ALREADY_USED:
    'Face verification session has already been used. Please restart verification.',
  APPLICATION_BIOMETRIC_OWNER_MISMATCH:
    'Face verification session does not belong to this citizen.',
  APPLICATION_VALIDATION_FAILED:
    'Application validation failed. Please review the form and try again.',
  BIRTH_CERTIFICATE_VERIFICATION_REQUIRED:
    'Birth certificate verification is required before New NID submission.',
  BIRTH_CERTIFICATE_VERIFICATION_EXPIRED:
    'Birth certificate verification expired. Please verify the birth certificate again.',
  BIRTH_CERTIFICATE_VERIFICATION_FIELD_CHANGED:
    'Application information changed after document verification. Please verify the birth certificate again.',
  BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED:
    'Birth certificate verification was already used. Please verify the document again.',
  NEW_NID_APPLICATION_EXISTS:
    'You already have an active or completed New NID application. You cannot submit another New NID application.',
  NEW_NID_ACTIVE_APPLICATION_EXISTS:
    'You already have an active New NID application. You cannot submit another New NID application.',
  NEW_NID_ALREADY_APPROVED:
    'You already have a New NID record. Please use Correction or Reissue if you need changes.',
  FIELD_MISMATCH:
    'Birth certificate information does not match your provided information.',
  REGISTRY_MISMATCH:
    'Birth certificate information does not match your provided information.',
  REGISTRY_RECORD_NOT_FOUND:
    'Birth registration record could not be found.',
  OCR_UNREADABLE:
    'Birth registration number could not be read. Please upload a clearer image.',
  DOCUMENT_VERIFICATION_MISMATCH:
    'Birth certificate information does not match your provided information.',
  DOCUMENT_UNREADABLE:
    'The document could not be read clearly. Please upload a clearer image.',
  DOCUMENT_LOW_CONFIDENCE:
    'The document text could not be verified confidently. Please upload a clearer image.',
  DOCUMENT_VERIFICATION_TIMEOUT:
    'Document verification is taking longer than expected. Please try again.',
  DOCUMENT_VERIFICATION_UNAVAILABLE:
    'Document verification service is temporarily unavailable. Please try again later.'
};

const SUBMIT_STAGES = {
  verifying_birth_certificate: {
    label: 'Verifying birth certificate...',
    subtext: 'We are checking your uploaded certificate.',
    buttonText: 'Verifying document...'
  },
  reading_document_text: {
    label: 'Reading document text...',
    subtext: 'We are reading your birth certificate. Please wait a moment.',
    buttonText: 'Verifying document...'
  },
  matching_certificate_information: {
    label: 'Matching certificate information...',
    subtext: 'We are matching the certificate with your form details.',
    buttonText: 'Verifying document...'
  },
  preparing_face_verification: {
    label: 'Preparing face verification...',
    subtext: 'Document verification is complete. Face verification is being prepared.',
    buttonText: 'Preparing face verification...'
  },
  starting_face_verification: {
    label: 'Starting face verification...',
    subtext: 'Please follow the next instructions to continue.',
    buttonText: 'Starting face verification...'
  },
  creating_application: {
    label: 'Creating application...',
    subtext: 'Your application record is being created.',
    buttonText: 'Submitting...'
  },
  uploading_documents: {
    label: 'Uploading documents...',
    subtext: 'Your files are being uploaded securely.',
    buttonText: 'Submitting...'
  }
};

const DEFAULT_SUBMIT_BUTTON_TEXT = 'Submit Application';

const formatEligibilityDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getDocumentVerificationUnavailableMessage = (error) => {
  const responseData = error?.response?.data || {};
  const code = responseData.code || '';

  if (code === 'DOCUMENT_VERIFICATION_TIMEOUT') {
    return 'Document verification is taking longer than expected. Please try again.';
  }

  const reason = String(
    responseData.failureReason ||
      responseData.verification?.failureReason ||
      responseData.message ||
      error?.message ||
      ''
  ).toLowerCase();

  if (reason.includes('timeout') || reason.includes('timed out')) {
    return 'Document verification is taking longer than expected. Please try again.';
  }

  return 'Document verification service is temporarily unavailable. Please try again later.';
};

const getApplicationSubmitErrorMessage = (error) => {
  const code = error?.response?.data?.code;

  if (
    code === 'DOCUMENT_VERIFICATION_UNAVAILABLE' ||
    code === 'DOCUMENT_VERIFICATION_TIMEOUT'
  ) {
    return getDocumentVerificationUnavailableMessage(error);
  }

  if (
    error?.safeMessage ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT'
  ) {
    return error.safeMessage || 'Request is taking longer than expected. Please try again.';
  }

  return (
    BIOMETRIC_ERROR_MESSAGES[code] ||
    APPLICATION_ERROR_MESSAGES[code] ||
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.msg ||
    error?.message ||
    'Failed to create application'
  );
};

const ApplicationForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [birthCertPreview, setBirthCertPreview] = useState(null);
  const [correctionProofPreview, setCorrectionProofPreview] = useState(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [selectedPresentDivision, setSelectedPresentDivision] = useState('');
  const [selectedPermanentDivision, setSelectedPermanentDivision] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({
    photograph: null,
    signature: null,
    birthCertificate: null,
    correctionProof: null
  });

  const [hasIssuedNid, setHasIssuedNid] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [isNidEligibilityLoading, setIsNidEligibilityLoading] = useState(true);

  const [livenessSession, setLivenessSession] = useState(null);
  const [qrSession, setQrSession] = useState(null);
  const [qrStatus, setQrStatus] = useState('pending');
  const [qrErrorMessage, setQrErrorMessage] = useState('');
  const [verificationMethodChoiceOpen, setVerificationMethodChoiceOpen] =
    useState(false);

  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const birthCertInputRef = useRef(null);
  const correctionProofInputRef = useRef(null);

  const livenessResolverRef = useRef(null);
  const qrResolverRef = useRef(null);
  const verificationMethodResolverRef = useRef(null);
  const qrPollTimeoutRef = useRef(null);
  const submitInProgressRef = useRef(false);
  const submitStageTimersRef = useRef([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    clearErrors,
    formState: { errors }
  } = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      applicationType: 'new',
      fullNameEnglish: '',
      fullNameBangla: '',
      fatherName: '',
      motherName: '',
      spouseName: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      maritalStatus: 'single',
      birthRegistrationNumber: '',
      existingNidNumber: '',
      phone: '',
      email: '',
      occupation: '',
      correctionReason: '',
      fatherNID: '',
      motherNID: '',
      presentAddress: {
        division: '',
        district: '',
        upazila: '',
        unionOrWard: '',
        villageOrArea: '',
        postOffice: '',
        postalCode: ''
      },
      permanentAddress: {
        division: '',
        district: '',
        upazila: '',
        unionOrWard: '',
        villageOrArea: '',
        postOffice: '',
        postalCode: ''
      }
    }
  });

  const applicationType = watch('applicationType');
  const bloodGroupValue = watch('bloodGroup');
  const occupationValue = watch('occupation');

  // These two flags make the validation feel natural:
  // once the user selects/types a valid value, the red border disappears immediately.
  const showBloodGroupError = Boolean(errors.bloodGroup && !bloodGroupValue);
  const showOccupationError = Boolean(
    errors.occupation && !occupationValue?.trim()
  );

  useEffect(() => {
    // react-hook-form clears most errors on change, but this keeps the UI extra smooth
    // for the custom step-by-step Continue validation.
    if (bloodGroupValue) {
      clearErrors('bloodGroup');
    }

    if (occupationValue?.trim()) {
      clearErrors('occupation');
    }
  }, [bloodGroupValue, occupationValue, clearErrors]);

  useEffect(() => {
    // Keeps every new step starting from the top instead of staying at the old scroll position.
    scrollToApplicationTop();
  }, [currentStep]);

  const canUseCorrectionServices =
    Boolean(eligibility?.canRequestCorrection) || hasIssuedNid;
  const isCorrectionServiceLocked = !canUseCorrectionServices;
  const newNidBlocked =
    applicationType === 'new' && eligibility?.canApplyNewNid === false;
  const newNidBlockedMessage =
    eligibility?.blockedReasonMessage ||
    APPLICATION_ERROR_MESSAGES[eligibility?.blockedReasonCode] ||
    APPLICATION_ERROR_MESSAGES.NEW_NID_APPLICATION_EXISTS;
  const showNewNidResubmissionNotice =
    applicationType === 'new' &&
    !newNidBlocked &&
    Boolean(eligibility?.hasPreviousRejection && eligibility?.resubmissionAllowed);
  const latestRejectionNotice =
    eligibility?.rejectionNotice || eligibility?.latestRejectedNewApplication || {};
  const isSubmitBlockedByNewNidEligibility =
    applicationType === 'new' && (isNidEligibilityLoading || newNidBlocked);
  const submitBlockedReason = isNidEligibilityLoading
    ? 'Checking New NID eligibility...'
    : newNidBlockedMessage;
  const idleSubmitButtonText = isSubmitBlockedByNewNidEligibility
    ? isNidEligibilityLoading
      ? 'Checking eligibility...'
      : 'New NID unavailable'
    : DEFAULT_SUBMIT_BUTTON_TEXT;
  const isIdentityLocked = ['new', 'correction', 'reissue'].includes(applicationType);
  const activeSubmitStage = submitStage ? SUBMIT_STAGES[submitStage] : null;
  const submitButtonText =
    activeSubmitStage?.buttonText || DEFAULT_SUBMIT_BUTTON_TEXT;
  const submitLockReason =
    activeSubmitStage?.label ||
    'Submission is in progress. Please wait before changing steps.';

  const blockLockedSelect = (event) => {
    if (!isIdentityLocked) return;
    event.preventDefault();
  };

  const handleLockedApplicationTypeClick = (event) => {
    if (!isCorrectionServiceLocked) return;

    event.preventDefault();
    setValue('applicationType', 'new', { shouldValidate: true });
    toast.info('Correction/Reissue will unlock after your New NID is approved or issued.');
  };

  const clearSubmitStageTimers = () => {
    submitStageTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    submitStageTimersRef.current = [];
  };

  const queueSubmitStage = (stage, delayMs) => {
    const timerId = setTimeout(() => {
      if (submitInProgressRef.current) {
        setSubmitStage(stage);
      }
    }, delayMs);

    submitStageTimersRef.current.push(timerId);
  };

  const resetSubmitProgress = () => {
    clearSubmitStageTimers();
    setSubmitStage('');
    setIsSubmitting(false);
  };

  const loadNidEligibility = useCallback(async ({ intent = '' } = {}) => {
    if (user) {
      setIsNidEligibilityLoading(true);

      try {
        const response = await api.get('/applications/eligibility', {
          params: intent ? { intent } : undefined
        });
        const nextEligibility = response?.data?.data || null;
        const hasEligibleNid = Boolean(
          nextEligibility?.canRequestCorrection ||
            nextEligibility?.issuedNewApplication
        );

        setEligibility(nextEligibility);
        setHasIssuedNid(hasEligibleNid);

        if (!hasEligibleNid) {
          setValue('applicationType', 'new', { shouldValidate: true });
        }

        return nextEligibility;
      } catch (error) {
        console.error('Failed to check NID eligibility:', error);
        setEligibility(null);
        setHasIssuedNid(false);
        setValue('applicationType', 'new', { shouldValidate: true });
        return null;
      } finally {
        setIsNidEligibilityLoading(false);
      }
    }

    setEligibility(null);
    setHasIssuedNid(false);
    setIsNidEligibilityLoading(false);
    return null;
  }, [user, setValue]);

  useEffect(() => {
    loadNidEligibility();
  }, [loadNidEligibility]);

  useEffect(() => {
    if (isCorrectionServiceLocked && ['correction', 'reissue'].includes(applicationType)) {
      setValue('applicationType', 'new', { shouldValidate: true });
    }
  }, [applicationType, isCorrectionServiceLocked, setValue]);

  useEffect(() => {
    const loadPrefillData = async () => {
      try {
        const response = await api.get('/applications/prefill');
        const prefill = response?.data?.prefill;

        if (!prefill) return;

        setValue('fullNameEnglish', prefill.fullNameEnglish || '');
        setValue('fullNameBangla', prefill.fullNameBangla || '');
        setValue('fatherName', prefill.fatherName || '');
        setValue('motherName', prefill.motherName || '');
        setValue('dateOfBirth', prefill.dateOfBirth || '');
        setValue('gender', prefill.gender || '');
        setValue('birthRegistrationNumber', prefill.birthRegistrationNumber || '');
        setValue('phone', prefill.phone || '');
        setValue('email', prefill.email || '');

        setValue('presentAddress.division', prefill.presentAddress?.division || '');
        setValue('presentAddress.district', prefill.presentAddress?.district || '');
        setValue('presentAddress.upazila', prefill.presentAddress?.upazila || '');
        setValue('presentAddress.unionOrWard', prefill.presentAddress?.unionOrWard || '');
        setValue('presentAddress.villageOrArea', prefill.presentAddress?.villageOrArea || '');
        setValue('presentAddress.postOffice', prefill.presentAddress?.postOffice || '');
        setValue('presentAddress.postalCode', prefill.presentAddress?.postalCode || '');

        setValue('permanentAddress.division', prefill.permanentAddress?.division || '');
        setValue('permanentAddress.district', prefill.permanentAddress?.district || '');
        setValue('permanentAddress.upazila', prefill.permanentAddress?.upazila || '');
        setValue('permanentAddress.unionOrWard', prefill.permanentAddress?.unionOrWard || '');
        setValue('permanentAddress.villageOrArea', prefill.permanentAddress?.villageOrArea || '');
        setValue('permanentAddress.postOffice', prefill.permanentAddress?.postOffice || '');
        setValue('permanentAddress.postalCode', prefill.permanentAddress?.postalCode || '');

        setSelectedPresentDivision(prefill.presentAddress?.division || '');
        setSelectedPermanentDivision(prefill.permanentAddress?.division || '');
      } catch (error) {
        console.error('Failed to load application prefill data:', error);
      }
    };

    if (user) {
      loadPrefillData();
    }
  }, [user, setValue]);

  useEffect(() => {
    return () => {
      clearSubmitStageTimers();

      if (qrPollTimeoutRef.current) {
        clearTimeout(qrPollTimeoutRef.current);
      }

      livenessResolverRef.current?.reject?.(
        new Error('Face verification was interrupted')
      );
      qrResolverRef.current?.reject?.(
        new Error('Face verification was interrupted')
      );
      verificationMethodResolverRef.current?.reject?.(
        new Error('Face verification was interrupted')
      );
    };
  }, []);

  const getInputClass = (hasError = false) =>
    `application-form-input form-input w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${
      hasError
        ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const getSelectClass = (hasError = false) =>
    `application-form-select form-select w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:ring-4 ${
      hasError
        ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Passport-size photo must be less than 2MB');
      return;
    }

    setSelectedFiles((prevState) => ({
      ...prevState,
      photograph: file
    }));
    setValue('photo', file);

    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSignatureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toast.error('Signature size must be less than 1MB');
      return;
    }

    setSelectedFiles((prevState) => ({
      ...prevState,
      signature: file
    }));
    setValue('signature', file);

    const reader = new FileReader();
    reader.onloadend = () => setSignaturePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleBirthCertChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Birth certificate size must be less than 5MB');
      return;
    }

    setSelectedFiles((prevState) => ({
      ...prevState,
      birthCertificate: file
    }));
    setValue('birthCertificate', file);
    setBirthCertPreview(file.name);
  };

  const handleCorrectionProofChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Correction proof size must be less than 5MB');
      return;
    }

    setSelectedFiles((prevState) => ({
      ...prevState,
      correctionProof: file
    }));
    setValue('correctionProof', file);
    setCorrectionProofPreview(file.name);
  };

  const handleSameAddress = (event) => {
    const isChecked = event.target.checked;
    setSameAddress(isChecked);

    if (isChecked) {
      const presentAddress = getValues('presentAddress');

      setValue('permanentAddress.division', presentAddress.division || '');
      setValue('permanentAddress.district', presentAddress.district || '');
      setValue('permanentAddress.upazila', presentAddress.upazila || '');
      setValue('permanentAddress.unionOrWard', presentAddress.unionOrWard || '');
      setValue('permanentAddress.villageOrArea', presentAddress.villageOrArea || '');
      setValue('permanentAddress.postOffice', presentAddress.postOffice || '');
      setValue('permanentAddress.postalCode', presentAddress.postalCode || '');

      setSelectedPermanentDivision(presentAddress.division || '');
    }
  };

  const resetPhotoSelection = () => {
    setPhotoPreview(null);
    setSelectedFiles((prevState) => ({
      ...prevState,
      photograph: null
    }));
    setValue('photo', null);

    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const resetSignatureSelection = () => {
    setSignaturePreview(null);
    setSelectedFiles((prevState) => ({
      ...prevState,
      signature: null
    }));
    setValue('signature', null);

    if (signatureInputRef.current) {
      signatureInputRef.current.value = '';
    }
  };

  const resetBirthCertificateSelection = () => {
    setBirthCertPreview(null);
    setSelectedFiles((prevState) => ({
      ...prevState,
      birthCertificate: null
    }));
    setValue('birthCertificate', null);

    if (birthCertInputRef.current) {
      birthCertInputRef.current.value = '';
    }
  };

  const resetCorrectionProofSelection = () => {
    setCorrectionProofPreview(null);
    setSelectedFiles((prevState) => ({
      ...prevState,
      correctionProof: null
    }));
    setValue('correctionProof', null);

    if (correctionProofInputRef.current) {
      correctionProofInputRef.current.value = '';
    }
  };

  const isMobileDevice = () => {
    if (typeof window === 'undefined') {
      return false;
    }

    const userAgent = window.navigator?.userAgent || '';
    const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;

    return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent) || coarsePointer;
  };

  const hasCameraCapability = () =>
    Boolean(navigator.mediaDevices?.getUserMedia);

  const isCameraSecureContext = () =>
    window.isSecureContext ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const createBiometricSession = async (deviceType, qrFlow = false) => {
    const formData = new FormData();
    formData.append('passport_photo', selectedFiles.photograph);
    formData.append('deviceType', deviceType);
    formData.append('qrFlow', String(qrFlow));

    if (import.meta.env.VITE_LIVENESS_MOBILE_BASE_URL) {
      formData.append(
        'mobileBaseUrl',
        import.meta.env.VITE_LIVENESS_MOBILE_BASE_URL
      );
    }

    const response = await api.post('/biometric/sessions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response?.data;
  };

  const waitForVerificationMethodChoice = () =>
    new Promise((resolve, reject) => {
      verificationMethodResolverRef.current = { resolve, reject };
      setVerificationMethodChoiceOpen(true);
    });

  const chooseVerificationMethod = (method) => {
    const resolver = verificationMethodResolverRef.current;
    verificationMethodResolverRef.current = null;
    setVerificationMethodChoiceOpen(false);
    resolver?.resolve?.(method);
  };

  const cancelVerificationMethodChoice = () => {
    const resolver = verificationMethodResolverRef.current;
    verificationMethodResolverRef.current = null;
    setVerificationMethodChoiceOpen(false);
    resolver?.reject?.(new Error('Face verification was cancelled'));
  };

  const waitForMobileLiveness = (session, options = {}) =>
    new Promise((resolve, reject) => {
      livenessResolverRef.current = { resolve, reject };
      setLivenessSession({
        ...session,
        allowQrFallback: Boolean(options.allowQrFallback)
      });
    });

  const switchDesktopLivenessToQr = () => {
    const resolver = livenessResolverRef.current;
    livenessResolverRef.current = null;
    setLivenessSession(null);
    resolver?.resolve?.('switch_to_qr');
  };

  const handleLivenessVerified = () => {
    const resolver = livenessResolverRef.current;
    livenessResolverRef.current = null;
    setLivenessSession(null);
    resolver?.resolve?.();
  };

  const handleLivenessFailed = (message) => {
    const resolver = livenessResolverRef.current;
    livenessResolverRef.current = null;
    setLivenessSession(null);
    resolver?.reject?.(new Error(message || FACE_FAILURE_MESSAGE));
  };

  const handleLivenessCancelled = () => {
    const resolver = livenessResolverRef.current;
    livenessResolverRef.current = null;
    setLivenessSession(null);
    resolver?.reject?.(new Error('Face verification was cancelled'));
  };

  const clearQrPolling = () => {
    if (qrPollTimeoutRef.current) {
      clearTimeout(qrPollTimeoutRef.current);
      qrPollTimeoutRef.current = null;
    }
  };

  const waitForDesktopQr = (session) =>
    new Promise((resolve, reject) => {
      setQrSession(session);
      setQrStatus('pending');
      setQrErrorMessage('');
      qrResolverRef.current = { resolve, reject };

      const pollStatus = async () => {
        try {
          const response = await api.get(
            `/biometric/sessions/${session.sessionId}/status`
          );
          const responseData = response?.data || {};
          const nextStatus = responseData.status || 'pending';

          setQrStatus(nextStatus);

          if (nextStatus === 'passed') {
            clearQrPolling();
            const resolver = qrResolverRef.current;
            qrResolverRef.current = null;
            setQrSession(null);
            resolver?.resolve?.();
            return;
          }

          if (['failed', 'expired', 'used'].includes(nextStatus)) {
            clearQrPolling();
            const resolver = qrResolverRef.current;
            qrResolverRef.current = null;
            setQrSession(null);
            resolver?.reject?.(
              new Error(
                responseData.message ||
                  BIOMETRIC_ERROR_MESSAGES[responseData.code] ||
                  (nextStatus === 'failed'
                    ? FACE_FAILURE_MESSAGE
                    : 'Face verification session expired. Please try again.')
              )
            );
            return;
          }

          qrPollTimeoutRef.current = setTimeout(pollStatus, 3000);
        } catch (error) {
          clearQrPolling();
          const resolver = qrResolverRef.current;
          qrResolverRef.current = null;
          setQrSession(null);
          setQrErrorMessage(
            error?.response?.data?.message || 'Could not check face verification status.'
          );
          resolver?.reject?.(error);
        }
      };

      qrPollTimeoutRef.current = setTimeout(pollStatus, 2000);
    });

  const cancelQrVerification = () => {
    clearQrPolling();
    const resolver = qrResolverRef.current;
    qrResolverRef.current = null;
    setQrSession(null);
    resolver?.reject?.(new Error('Face verification was cancelled'));
  };

  const uploadSelectedDocuments = async (applicationObjectId) => {
    const uploadQueue = [
      {
        documentType: 'photograph',
        file: selectedFiles.photograph
      },
      {
        documentType: 'signature',
        file: selectedFiles.signature
      },
      {
        documentType: 'birthCertificate',
        file: applicationType === 'new' ? selectedFiles.birthCertificate : null
      },
      {
        documentType: 'correctionProof',
        file:
          applicationType === 'correction'
            ? selectedFiles.correctionProof
            : null
      }
    ].filter((item) => item.file);

    const failedUploads = [];

    for (const item of uploadQueue) {
      try {
        await uploadCitizenApplicationDocument({
          applicationId: applicationObjectId,
          documentType: item.documentType,
          file: item.file
        });
      } catch (error) {
        failedUploads.push(getCitizenDocumentLabel(item.documentType));
        console.error(
          `Failed to upload ${item.documentType}:`,
          error?.response?.data || error.message
        );
      }
    }

    return failedUploads;
  };

  const scrollToApplicationTop = () => {
    // After changing steps, bring the user back to the top of the form.
    // The small offset keeps the title visible under the fixed/sticky navbar.
    window.requestAnimationFrame(() => {
      const formElement = document.querySelector('.application-form');
      const navbarOffset = 110;
      const targetTop = formElement
        ? formElement.getBoundingClientRect().top + window.scrollY - navbarOffset
        : 0;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: 'smooth'
      });
    });
  };

  const getStepValidationFields = (stepNumber) => {
    // Only validate the fields that belong to the current step.
    // This keeps the multi-step form friendly and prevents users from skipping required data.
    if (stepNumber === 1) {
      const fields = [
        'applicationType',
        'fullNameEnglish',
        'dateOfBirth',
        'gender',
        'bloodGroup',
        'phone',
        'occupation'
      ];

      if (applicationType === 'correction' || applicationType === 'reissue') {
        fields.push('existingNidNumber');
      }

      if (applicationType === 'correction') {
        fields.push('correctionReason');
      }

      return fields;
    }

    if (stepNumber === 2) {
      const fields = [
        'presentAddress.division',
        'presentAddress.district',
        'presentAddress.upazila',
        'fatherName',
        'motherName'
      ];

      if (!sameAddress) {
        fields.push(
          'permanentAddress.division',
          'permanentAddress.district',
          'permanentAddress.upazila'
        );
      }

      return fields;
    }

    return [];
  };

  const validateDocumentStep = () => {
    // File inputs are handled by React state, so we validate them manually here.
    if (!selectedFiles.photograph || !photoPreview) {
      toast.error('Please upload your passport-size photo');
      return false;
    }

    if (!selectedFiles.signature || !signaturePreview) {
      toast.error('Please upload your signature');
      return false;
    }

    if (applicationType === 'new' && !selectedFiles.birthCertificate) {
      toast.error('Please upload your birth certificate');
      return false;
    }

    if (applicationType === 'correction' && !selectedFiles.correctionProof) {
      toast.error('Please upload correction proof');
      return false;
    }

    return true;
  };

  const nextStep = async () => {
    if (currentStep === 1 || currentStep === 2) {
      const fieldsToValidate = getStepValidationFields(currentStep);
      const isStepValid = await trigger(fieldsToValidate, { shouldFocus: true });

      if (!isStepValid) {
        toast.error('Please fill all required fields before continuing.');
        return;
      }
    }

    if (currentStep === 3 && !validateDocumentStep()) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollToApplicationTop();
  };

  const onSubmit = async (data) => {
    if (submitInProgressRef.current) {
      return;
    }

    if (isCorrectionServiceLocked && ['correction', 'reissue'].includes(data.applicationType)) {
      toast.error('Please complete and receive your New NID before requesting Correction or Reissue.');
      setValue('applicationType', 'new', { shouldValidate: true });
      setCurrentStep(1);
      return;
    }

    if (data.applicationType === 'new') {
      const latestEligibility = await loadNidEligibility({ intent: 'submit' });

      if (!latestEligibility) {
        toast.error('Could not check New NID eligibility. Please try again.');
        setCurrentStep(1);
        return;
      }

      if (latestEligibility.canApplyNewNid === false) {
        toast.error(
          latestEligibility.blockedReasonMessage ||
            APPLICATION_ERROR_MESSAGES[latestEligibility.blockedReasonCode] ||
            APPLICATION_ERROR_MESSAGES.NEW_NID_APPLICATION_EXISTS
        );
        setCurrentStep(1);
        return;
      }
    }

    if (!selectedFiles.photograph || !photoPreview) {
      toast.error('Please upload your passport-size photo');
      setCurrentStep(3);
      return;
    }

    if (!selectedFiles.signature || !signaturePreview) {
      toast.error('Please upload your signature');
      setCurrentStep(3);
      return;
    }

    if (data.applicationType === 'new' && !selectedFiles.birthCertificate) {
      toast.error('Please upload your birth certificate');
      setCurrentStep(3);
      return;
    }

    if (data.applicationType === 'correction' && !selectedFiles.correctionProof) {
      toast.error('Please upload correction proof');
      setCurrentStep(3);
      return;
    }

    if (data.applicationType === 'correction' && !data.correctionReason?.trim()) {
      toast.error('Please enter the reason for correction');
      setCurrentStep(1);
      return;
    }

    submitInProgressRef.current = true;
    setIsSubmitting(true);

    let finalBiometricSessionId = '';
    let finalApplicationSubmitCalled = false;

    try {
      const presentAddressPayload = {
        division: data.presentAddress.division,
        district: data.presentAddress.district,
        upazila: data.presentAddress.upazila,
        unionOrWard: data.presentAddress.unionOrWard || '',
        villageOrArea: data.presentAddress.villageOrArea || '',
        postOffice: data.presentAddress.postOffice || '',
        postalCode: data.presentAddress.postalCode || ''
      };

      const permanentAddressPayload = sameAddress
        ? { ...presentAddressPayload }
        : {
            division: data.permanentAddress.division,
            district: data.permanentAddress.district,
            upazila: data.permanentAddress.upazila,
            unionOrWard: data.permanentAddress.unionOrWard || '',
            villageOrArea: data.permanentAddress.villageOrArea || '',
            postOffice: data.permanentAddress.postOffice || '',
            postalCode: data.permanentAddress.postalCode || ''
          };

      const payload = {
        applicationType: data.applicationType,
        fullNameEnglish: data.fullNameEnglish,
        fullNameBangla: data.fullNameBangla || '',
        fatherName: data.fatherName,
        motherName: data.motherName,
        spouseName: data.spouseName || '',
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodGroup: data.bloodGroup || '',
        maritalStatus: data.maritalStatus || 'single',
        birthRegistrationNumber: data.birthRegistrationNumber || '',
        existingNidNumber:
          data.applicationType === 'correction' || data.applicationType === 'reissue'
            ? data.existingNidNumber || ''
            : '',
        phone: data.phone,
        email: data.email || '',
        occupation: data.occupation || '',
        presentAddress: presentAddressPayload,
        permanentAddress: permanentAddressPayload,
        documents: {
          birthCertificate:
            data.applicationType === 'new'
              ? selectedFiles.birthCertificate?.name || ''
              : '',
          fatherNid: data.fatherNID || '',
          motherNid: data.motherNID || '',
          correctionProof:
            data.applicationType === 'correction'
              ? selectedFiles.correctionProof?.name || ''
              : '',
          photo: selectedFiles.photograph?.name || '',
          signature: selectedFiles.signature?.name || ''
        }
      };

      if (payload.applicationType === 'correction') {
        payload.correctionInfo = {
          reason: data.correctionReason?.trim() || ''
        };
      }

      if (payload.applicationType === 'new') {
        clearSubmitStageTimers();
        setSubmitStage('verifying_birth_certificate');
        queueSubmitStage('reading_document_text', 900);
        queueSubmitStage('matching_certificate_information', 3200);

        const documentVerificationResponse = await verifyBirthCertificateDocument({
          file: selectedFiles.birthCertificate,
          claimedFields: {
            birthRegistrationNumber: payload.birthRegistrationNumber,
            fullNameEnglish: payload.fullNameEnglish,
            fullNameBangla: payload.fullNameBangla,
            fatherName: payload.fatherName,
            motherName: payload.motherName,
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender
          }
        });

        clearSubmitStageTimers();

        if (!documentVerificationResponse?.verificationToken) {
          throw new Error('Birth certificate verification could not be completed');
        }

        payload.birthCertificateVerificationToken =
          documentVerificationResponse.verificationToken;
      }

      setSubmitStage('preparing_face_verification');

      const deviceType = isMobileDevice() ? 'mobile' : 'desktop';
      const verificationMethod =
        deviceType === 'mobile' ? 'camera' : await waitForVerificationMethodChoice();

      setSubmitStage('starting_face_verification');

      let biometricSession = await createBiometricSession(
        deviceType,
        verificationMethod === 'qr'
      );

      if (!biometricSession?.sessionId) {
        throw new Error('Could not create face verification session');
      }

      if (deviceType === 'mobile') {
        await waitForMobileLiveness(biometricSession);
      } else if (verificationMethod === 'camera') {
        const cameraResult = await waitForMobileLiveness(biometricSession, {
          allowQrFallback: true
        });

        if (cameraResult === 'switch_to_qr') {
          setSubmitStage('starting_face_verification');
          biometricSession = await createBiometricSession(deviceType, true);

          if (!biometricSession?.sessionId) {
            throw new Error('Could not create face verification session');
          }

          await waitForDesktopQr(biometricSession);
        }
      } else {
        await waitForDesktopQr(biometricSession);
      }

      payload.biometricSessionId = biometricSession.sessionId;
      finalBiometricSessionId = biometricSession.sessionId;

      finalApplicationSubmitCalled = true;
      setSubmitStage('creating_application');

      if (import.meta.env.DEV) {
        console.info('Final application submit started:', {
          biometricSessionIdExists: Boolean(payload.biometricSessionId)
        });
      }

      const response = await api.post('/applications', payload);
      const createdApplication = response?.data?.application;
      const createdApplicationId = createdApplication?._id;

      if (!createdApplicationId) {
        throw new Error('Application created but no application id was returned');
      }

      setSubmitStage('uploading_documents');
      const failedUploads = await uploadSelectedDocuments(createdApplicationId);

      if (failedUploads.length > 0) {
        toast.warning(
          `Application submitted, but these document uploads failed: ${failedUploads.join(
            ', '
          )}. Please contact support if needed.`
        );
      } else {
        toast.success('Application submitted successfully!');
      }

      navigate(`/track-application?id=${createdApplicationId}`);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Application form submit failed:', {
          httpStatus: error?.response?.status || null,
          backendCode: error?.response?.data?.code || '',
          backendMessage: error?.response?.data?.message || error?.message || '',
          biometricSessionIdExists: Boolean(finalBiometricSessionId),
          finalApplicationSubmitCalled
        });
      }

      toast.error(getApplicationSubmitErrorMessage(error));
    } finally {
      submitInProgressRef.current = false;
      resetSubmitProgress();
    }
  };

  return (
    <div className="application-form-page application-form-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="form-container application-form-container mx-auto w-full max-w-[980px]">
        <div className="form-header application-form-header text-center">
          <h1 className="application-form-title text-[2rem] font-bold text-[#1F2937]">
            Smart NID Application
          </h1>
          <p className="application-form-subtitle text-[#6B7280]">
            Complete all steps to submit your application
          </p>
        </div>

        <div className="progress-steps application-progress-steps mb-10 flex items-center justify-center px-2">
          <div
            className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${
              currentStep > 1 ? 'completed' : ''
            }`}
          >
            <div className="step-circle">{currentStep > 1 ? <FaCheck /> : '1'}</div>
            <span>Personal Info</span>
          </div>
          <div className="step-line" />
          <div
            className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${
              currentStep > 2 ? 'completed' : ''
            }`}
          >
            <div className="step-circle">{currentStep > 2 ? <FaCheck /> : '2'}</div>
            <span>Address & Family</span>
          </div>
          <div className="step-line" />
          <div
            className={`progress-step ${currentStep >= 3 ? 'active' : ''} ${
              currentStep > 3 ? 'completed' : ''
            }`}
          >
            <div className="step-circle">{currentStep > 3 ? <FaCheck /> : '3'}</div>
            <span>Documents</span>
          </div>
          <div className="step-line" />
          <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-circle">4</div>
            <span>Review</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="application-form rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] sm:p-8"
          aria-busy={isSubmitting}
        >
          {currentStep === 1 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaIdCard /> Application & Personal Information
              </h2>
              <p className="step-description">
                Select application type and provide your core information.
              </p>

              {/* 
                Application type cards:
                Correction/Reissue stay locked in logic until the user is eligible,
                but the extra visible "Locked" text is hidden for a cleaner UI.
              */}
              <div className="application-types mb-8 grid gap-5 md:grid-cols-3">
                <label
                  className={`type-card ${
                    applicationType === 'new' ? 'selected' : ''
                  }`}
                >
                  <input type="radio" value="new" {...register('applicationType')} />
                  <div className="type-content">
                    <div className="type-icon new-icon">
                      <FaIdCard />
                    </div>
                    <h4>New NID</h4>
                    <p>First-time NID application</p>
                  </div>
                </label>

                <label
                  className={`type-card ${
                    applicationType === 'correction' ? 'selected' : ''
                  } ${isCorrectionServiceLocked ? 'locked-type' : ''}`}
                  onClick={isCorrectionServiceLocked ? handleLockedApplicationTypeClick : undefined}
                  aria-disabled={isCorrectionServiceLocked}
                >
                  <input
                    type="radio"
                    value="correction"
                    // UI is clean, but the actual lock condition still protects this option.
                    disabled={isCorrectionServiceLocked}
                    {...register('applicationType')}
                  />
                  <div className="type-content">
                    <div className="type-icon correction-icon">
                      <FaIdCard />
                    </div>
                    <h4>Correction</h4>
                    <p>Correct existing NID information</p>
                  </div>
                </label>

                <label
                  className={`type-card ${
                    applicationType === 'reissue' ? 'selected' : ''
                  } ${isCorrectionServiceLocked ? 'locked-type' : ''}`}
                  onClick={isCorrectionServiceLocked ? handleLockedApplicationTypeClick : undefined}
                  aria-disabled={isCorrectionServiceLocked}
                >
                  <input
                    type="radio"
                    value="reissue"
                    // UI is clean, but the actual lock condition still protects this option.
                    disabled={isCorrectionServiceLocked}
                    {...register('applicationType')}
                  />
                  <div className="type-content">
                    <div className="type-icon renewal-icon">
                      <FaIdCard />
                    </div>
                    <h4>Reissue</h4>
                    <p>Reissue lost or damaged NID</p>
                  </div>
                </label>
              </div>

              {newNidBlocked ? (
                <div className="application-eligibility-note blocked" role="alert">
                  <strong>New NID submission is not available.</strong>
                  <span>{newNidBlockedMessage}</span>
                </div>
              ) : null}

              {showNewNidResubmissionNotice ? (
                <div className="application-eligibility-note resubmission" role="note">
                  <strong>Your previous New NID application was rejected.</strong>
                  <span>
                    You can apply again after correcting the issues.
                  </span>
                  <div className="application-eligibility-meta">
                    {(latestRejectionNotice.applicationId ||
                      eligibility?.latestRejectedApplicationId) && (
                      <span>
                        Previous:{' '}
                        {latestRejectionNotice.applicationId ||
                          eligibility.latestRejectedApplicationId}
                      </span>
                    )}
                    {(latestRejectionNotice.rejectedAt ||
                      eligibility?.latestRejectedAt) && (
                      <span>
                        Rejected:{' '}
                        {formatEligibilityDate(
                          latestRejectionNotice.rejectedAt ||
                            eligibility.latestRejectedAt
                        )}
                      </span>
                    )}
                    {(latestRejectionNotice.rejectionReason ||
                      eligibility?.latestRejectionReason) && (
                      <span>
                        Reason:{' '}
                        {latestRejectionNotice.rejectionReason ||
                          eligibility.latestRejectionReason}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="info-section applicant-info-section">
                <h3>Applicant Information</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Full Name (English) *</label>
                    <input
                      type="text"
                      readOnly={isIdentityLocked}
                      aria-readonly={isIdentityLocked}
                      className={`input-field ${
                        isIdentityLocked ? 'locked-input' : ''
                      }`}
                      placeholder="Enter full name in English"
                      {...register('fullNameEnglish', {
                        required: 'Full name in English is required'
                      })}
                    />
                    {errors.fullNameEnglish && (
                      <span className="form-error">{errors.fullNameEnglish.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Name (বাংলা)</label>
                    <input
                      type="text"
                      readOnly={isIdentityLocked}
                      aria-readonly={isIdentityLocked}
                      className={`input-field ${
                        isIdentityLocked ? 'locked-input' : ''
                      }`}
                      placeholder="পূর্ণ নাম লিখুন"
                      {...register('fullNameBangla')}
                    />
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="inline-flex items-center gap-2">
                        <FaCalendar className="text-[#16A34A]" />
                        Date of Birth *
                      </span>
                    </label>
                    <input
                      type="date"
                      readOnly={isIdentityLocked}
                      aria-readonly={isIdentityLocked}
                      className={`input-field ${
                        isIdentityLocked ? 'locked-input' : ''
                      }`}
                      {...register('dateOfBirth', {
                        required: 'Date of birth is required'
                      })}
                    />
                    {errors.dateOfBirth && (
                      <span className="form-error">{errors.dateOfBirth.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="inline-flex items-center gap-2">
                        <FaVenusMars className="text-[#16A34A]" />
                        Gender *
                      </span>
                    </label>
                    <select
                      aria-disabled={isIdentityLocked}
                      tabIndex={isIdentityLocked ? -1 : 0}
                      className={`input-field ${
                        isIdentityLocked ? 'locked-input' : ''
                      }`}
                      onMouseDown={blockLockedSelect}
                      onTouchStart={blockLockedSelect}
                      onKeyDown={blockLockedSelect}
                      {...register('gender', {
                        required: 'Gender is required'
                      })}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && (
                      <span className="form-error">{errors.gender.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Birth Registration Number</label>
                    <input
                      type="text"
                      readOnly={isIdentityLocked}
                      aria-readonly={isIdentityLocked}
                      className={`input-field ${
                        isIdentityLocked ? 'locked-input' : ''
                      }`}
                      placeholder="17 digit birth registration number"
                      {...register('birthRegistrationNumber', {
                        pattern: {
                          value: /^(\d{17})?$/,
                          message: 'Enter a valid 17 digit birth registration number'
                        }
                      })}
                    />
                    {errors.birthRegistrationNumber && (
                      <span className="form-error">
                        {errors.birthRegistrationNumber.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Blood Group *</label>
                    <select
                      className={getSelectClass(showBloodGroupError)}
                      {...register('bloodGroup', {
                        required: 'Blood group is required'
                      })}
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="inline-flex items-center gap-2">
                        <FaPhone className="text-[#16A34A]" />
                        Phone Number *
                      </span>
                    </label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.phone)}
                      placeholder="01XXXXXXXXX"
                      {...register('phone', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^01[0-9]{9}$/,
                          message: 'Enter a valid Bangladeshi mobile number'
                        }
                      })}
                    />
                    {errors.phone && (
                      <span className="form-error">{errors.phone.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="inline-flex items-center gap-2">
                        <FaEnvelope className="text-[#16A34A]" />
                        Email
                      </span>
                    </label>
                    <input
                      type="email"
                      className={getInputClass(!!errors.email)}
                      placeholder="email@example.com"
                      {...register('email', {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Enter a valid email address'
                        }
                      })}
                    />
                    {errors.email && (
                      <span className="form-error">{errors.email.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Marital Status</label>
                    <select className={getSelectClass(false)} {...register('maritalStatus')}>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="inline-flex items-center gap-2">
                        <FaBriefcase className="text-[#16A34A]" />
                        Occupation *
                      </span>
                    </label>
                    <input
                      type="text"
                      className={getInputClass(showOccupationError)}
                      placeholder="Enter your occupation"
                      {...register('occupation', {
                        required: 'Occupation is required',
                        validate: (value) =>
                          value.trim().length > 0 || 'Occupation is required'
                      })}
                    />
                  </div>
                </div>

                {(applicationType === 'correction' ||
                  applicationType === 'reissue') && (
                  <div className="form-group">
                    <label className="form-label">Existing NID Number *</label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.existingNidNumber)}
                      placeholder="Enter your current NID number"
                      {...register('existingNidNumber', {
                        required:
                          applicationType === 'correction' ||
                          applicationType === 'reissue'
                            ? 'Existing NID number is required'
                            : false
                      })}
                    />
                    {errors.existingNidNumber && (
                      <span className="form-error">
                        {errors.existingNidNumber.message}
                      </span>
                    )}
                  </div>
                )}

                {applicationType === 'correction' && (
                  <div className="form-group">
                    <label className="form-label">Correction Reason *</label>
                    <textarea
                      rows={3}
                      className={getInputClass(!!errors.correctionReason)}
                      placeholder="Explain what information needs correction"
                      {...register('correctionReason', {
                        required:
                          applicationType === 'correction'
                            ? 'Correction reason is required'
                            : false
                      })}
                    />
                    {errors.correctionReason && (
                      <span className="form-error">
                        {errors.correctionReason.message}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-primary" onClick={nextStep}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaMapMarkerAlt /> Address & Family Information
              </h2>
              <p className="step-description">
                Provide your address and family information.
              </p>

              <div className="info-section">
                <h3>Present Address</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Division *</label>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.division)}
                      {...register('presentAddress.division', {
                        required: 'Present address division is required'
                      })}
                      onChange={(e) => {
                        setSelectedPresentDivision(e.target.value);
                        setValue('presentAddress.district', '');
                      }}
                    >
                      <option value="">Select division</option>
                      {bangladeshLocations.divisions.map((division) => (
                        <option key={division} value={division}>
                          {division}
                        </option>
                      ))}
                    </select>
                    {errors.presentAddress?.division && (
                      <span className="form-error">
                        {errors.presentAddress.division.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">District *</label>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.district)}
                      {...register('presentAddress.district', {
                        required: 'Present address district is required'
                      })}
                    >
                      <option value="">Select district</option>
                      {selectedPresentDivision &&
                        bangladeshLocations.districts[selectedPresentDivision]?.map(
                          (district) => (
                            <option key={district} value={district}>
                              {district}
                            </option>
                          )
                        )}
                    </select>
                    {errors.presentAddress?.district && (
                      <span className="form-error">
                        {errors.presentAddress.district.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Upazila/Thana *</label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.presentAddress?.upazila)}
                      placeholder="Enter upazila or thana"
                      {...register('presentAddress.upazila', {
                        required: 'Present address upazila is required'
                      })}
                    />
                    {errors.presentAddress?.upazila && (
                      <span className="form-error">
                        {errors.presentAddress.upazila.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Union/Ward</label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Enter union or ward"
                      {...register('presentAddress.unionOrWard')}
                    />
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Village/Area</label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Enter village or area"
                      {...register('presentAddress.villageOrArea')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Post Office</label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Enter post office"
                      {...register('presentAddress.postOffice')}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    className={getInputClass(false)}
                    placeholder="Enter postal code"
                    {...register('presentAddress.postalCode')}
                  />
                </div>
              </div>

              <div className="register-checkbox-group rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 mb-8">
                <label className="register-checkbox-label flex items-start gap-3 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    checked={sameAddress}
                    onChange={handleSameAddress}
                    className="mt-1 h-4 w-4 rounded border-[#D1D5DB] text-[#16A34A] focus:ring-[#16A34A]"
                  />
                  <span>Permanent address same as present address</span>
                </label>
              </div>

              {!sameAddress && (
                <div className="info-section">
                  <h3>Permanent Address</h3>

                  <div className="form-row grid gap-5 md:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Division *</label>
                      <select
                        className={getSelectClass(!!errors.permanentAddress?.division)}
                        {...register('permanentAddress.division', {
                          required: !sameAddress
                            ? 'Permanent address division is required'
                            : false
                        })}
                        onChange={(e) => {
                          setSelectedPermanentDivision(e.target.value);
                          setValue('permanentAddress.district', '');
                        }}
                      >
                        <option value="">Select division</option>
                        {bangladeshLocations.divisions.map((division) => (
                          <option key={division} value={division}>
                            {division}
                          </option>
                        ))}
                      </select>
                      {errors.permanentAddress?.division && (
                        <span className="form-error">
                          {errors.permanentAddress.division.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">District *</label>
                      <select
                        className={getSelectClass(!!errors.permanentAddress?.district)}
                        {...register('permanentAddress.district', {
                          required: !sameAddress
                            ? 'Permanent address district is required'
                            : false
                        })}
                      >
                        <option value="">Select district</option>
                        {selectedPermanentDivision &&
                          bangladeshLocations.districts[selectedPermanentDivision]?.map(
                            (district) => (
                              <option key={district} value={district}>
                                {district}
                              </option>
                            )
                          )}
                      </select>
                      {errors.permanentAddress?.district && (
                        <span className="form-error">
                          {errors.permanentAddress.district.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="form-row grid gap-5 md:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Upazila/Thana *</label>
                      <input
                        type="text"
                        className={getInputClass(!!errors.permanentAddress?.upazila)}
                        placeholder="Enter upazila or thana"
                        {...register('permanentAddress.upazila', {
                          required: !sameAddress
                            ? 'Permanent address upazila is required'
                            : false
                        })}
                      />
                      {errors.permanentAddress?.upazila && (
                        <span className="form-error">
                          {errors.permanentAddress.upazila.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Union/Ward</label>
                      <input
                        type="text"
                        className={getInputClass(false)}
                        placeholder="Enter union or ward"
                        {...register('permanentAddress.unionOrWard')}
                      />
                    </div>
                  </div>

                  <div className="form-row grid gap-5 md:grid-cols-2">
                    <div className="form-group">
                      <label className="form-label">Village/Area</label>
                      <input
                        type="text"
                        className={getInputClass(false)}
                        placeholder="Enter village or area"
                        {...register('permanentAddress.villageOrArea')}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Post Office</label>
                      <input
                        type="text"
                        className={getInputClass(false)}
                        placeholder="Enter post office"
                        {...register('permanentAddress.postOffice')}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Postal Code</label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Enter postal code"
                      {...register('permanentAddress.postalCode')}
                    />
                  </div>
                </div>
              )}

              <div className="info-section">
                <h3>Father&apos;s Information</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Father&apos;s Name *</label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.fatherName)}
                      placeholder="Enter father's name"
                      {...register('fatherName', {
                        required: "Father's name is required"
                      })}
                    />
                    {errors.fatherName && (
                      <span className="form-error">{errors.fatherName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Father&apos;s NID (Optional)</label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.fatherNID)}
                      placeholder="10 or 17 digit NID"
                      {...register('fatherNID', {
                        pattern: {
                          value: /^(\d{10}|\d{17})?$/,
                          message: 'Enter valid NID (10 or 17 digits)'
                        }
                      })}
                    />
                    {errors.fatherNID && (
                      <span className="form-error">{errors.fatherNID.message}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>Mother&apos;s Information</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Mother&apos;s Name *</label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.motherName)}
                      placeholder="Enter mother's name"
                      {...register('motherName', {
                        required: "Mother's name is required"
                      })}
                    />
                    {errors.motherName && (
                      <span className="form-error">{errors.motherName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mother&apos;s NID (Optional)</label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.motherNID)}
                      placeholder="10 or 17 digit NID"
                      {...register('motherNID', {
                        pattern: {
                          value: /^(\d{10}|\d{17})?$/,
                          message: 'Enter valid NID (10 or 17 digits)'
                        }
                      })}
                    />
                    {errors.motherNID && (
                      <span className="form-error">{errors.motherNID.message}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3>Spouse Information (Optional)</h3>

                <div className="form-group">
                  <label className="form-label">Spouse Name</label>
                  <input
                    type="text"
                    className={getInputClass(false)}
                    placeholder="Enter spouse name"
                    {...register('spouseName')}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={prevStep}>
                  ← Previous
                </button>
                <button type="button" className="btn btn-primary" onClick={nextStep}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaUpload /> Upload Documents
              </h2>
              <p className="step-description">
                Upload your documents. This step keeps the current UI and preview.
              </p>

              <div className="upload-section">
                <div className="upload-card">
                  <div className="upload-header">
                    <FaCamera className="upload-icon" />
                    <div>
                      <h4>Passport-size photo *</h4>
                      <p>Recent passport-size photo with white background</p>
                    </div>
                  </div>

                  <div
                    className="upload-area"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <div className="preview-container">
                        <img src={photoPreview} alt="Preview" className="photo-preview" />
                        <button
                          type="button"
                          className="change-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            resetPhotoSelection();
                          }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <FaUpload />
                        <span>Click to upload passport-size photo</span>
                        <small>JPG, PNG (Max 2MB)</small>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/jpeg,image/png"
                    onChange={handlePhotoChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="upload-card">
                  <div className="upload-header">
                    <FaSignature className="upload-icon" />
                    <div>
                      <h4>Signature *</h4>
                      <p>Clear signature on white paper</p>
                    </div>
                  </div>

                  <div
                    className="upload-area signature-area"
                    onClick={() => signatureInputRef.current?.click()}
                  >
                    {signaturePreview ? (
                      <div className="preview-container">
                        <img
                          src={signaturePreview}
                          alt="Signature"
                          className="signature-preview"
                        />
                        <button
                          type="button"
                          className="change-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            resetSignatureSelection();
                          }}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <FaUpload />
                        <span>Click to upload signature</span>
                        <small>JPG, PNG (Max 1MB)</small>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={signatureInputRef}
                    accept="image/jpeg,image/png"
                    onChange={handleSignatureChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {applicationType === 'new' && (
                  <div className="upload-card">
                    <div className="upload-header">
                      <FaIdCard className="upload-icon" />
                      <div>
                        <h4>Birth Certificate *</h4>
                        <p>Scan copy of birth certificate</p>
                      </div>
                    </div>

                    <div
                      className="upload-area"
                      onClick={() => birthCertInputRef.current?.click()}
                    >
                      {birthCertPreview ? (
                        <div className="file-uploaded">
                          <FaCheck className="success-icon" />
                          <span>{birthCertPreview}</span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              resetBirthCertificateSelection();
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload />
                          <span>Click to upload document</span>
                          <small>JPG, PNG, PDF (Max 5MB)</small>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={birthCertInputRef}
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleBirthCertChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                {applicationType === 'correction' && (
                  <div className="upload-card">
                    <div className="upload-header">
                      <FaFileAlt className="upload-icon" />
                      <div>
                        <h4>Correction Proof *</h4>
                        <p>Supporting document for requested correction</p>
                      </div>
                    </div>

                    <div
                      className="upload-area"
                      onClick={() => correctionProofInputRef.current?.click()}
                    >
                      {correctionProofPreview ? (
                        <div className="file-uploaded">
                          <FaCheck className="success-icon" />
                          <span>{correctionProofPreview}</span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              resetCorrectionProofSelection();
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload />
                          <span>Click to upload correction proof</span>
                          <small>JPG, PNG, PDF (Max 5MB)</small>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={correctionProofInputRef}
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={handleCorrectionProofChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
              </div>

              <div className="upload-guidelines">
                <h4>
                  <FaExclamationTriangle /> Important Note
                </h4>
                <ul>
                  <li>Passport-size photo and signature preview will work normally</li>
                  <li>Face verification will start when you submit the application</li>
                  <li>Required documents will be uploaded after the application is created</li>
                  <li>If any document upload fails after submission, the application will still be created and you can contact support</li>
                </ul>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={prevStep}>
                  ← Previous
                </button>
                <button type="button" className="btn btn-primary" onClick={nextStep}>
                  Review Application →
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaCheck /> Review & Submit
              </h2>
              <p className="step-description">
                Please review your application before submitting.
              </p>

              <div className="review-section">
                <div className="review-card">
                  <h4>Application Type</h4>
                  <p className="review-value">
                    {watch('applicationType')?.toUpperCase()} NID Application
                  </p>
                </div>

                <div className="review-card">
                  <h4>Personal Information</h4>
                  <div className="review-grid">
                    <div className="review-item">
                      <label>Full Name (English)</label>
                      <p>{watch('fullNameEnglish')}</p>
                    </div>
                    <div className="review-item">
                      <label>Full Name (Bangla)</label>
                      <p>{watch('fullNameBangla') || 'N/A'}</p>
                    </div>
                    <div className="review-item">
                      <label>Date of Birth</label>
                      <p>{watch('dateOfBirth') || 'N/A'}</p>
                    </div>
                    <div className="review-item">
                      <label>Gender</label>
                      <p>{watch('gender') || 'N/A'}</p>
                    </div>
                    <div className="review-item">
                      <label>Phone</label>
                      <p>{watch('phone')}</p>
                    </div>
                    <div className="review-item">
                      <label>Email</label>
                      <p>{watch('email') || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="review-card">
                  <h4>Address Information</h4>
                  <div className="review-grid">
                    <div className="review-item">
                      <label>Present Address</label>
                      <p>
                        {watch('presentAddress.division')},{' '}
                        {watch('presentAddress.district')},{' '}
                        {watch('presentAddress.upazila')}
                      </p>
                    </div>
                    <div className="review-item">
                      <label>Permanent Address</label>
                      <p>
                        {sameAddress
                          ? 'Same as present address'
                          : `${watch('permanentAddress.division')}, ${watch(
                              'permanentAddress.district'
                            )}, ${watch('permanentAddress.upazila')}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="review-card">
                  <h4>Family Information</h4>
                  <div className="review-grid">
                    <div className="review-item">
                      <label>Father&apos;s Name</label>
                      <p>{watch('fatherName')}</p>
                    </div>
                    <div className="review-item">
                      <label>Mother&apos;s Name</label>
                      <p>{watch('motherName')}</p>
                    </div>
                    <div className="review-item">
                      <label>Spouse Name</label>
                      <p>{watch('spouseName') || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="review-card">
                  <h4>Uploaded Documents</h4>
                  <div className="documents-preview">
                    <div className="doc-item">
                      <span>Passport-size photo</span>
                      {photoPreview ? (
                        <img src={photoPreview} alt="Photo" className="doc-thumb" />
                      ) : (
                        <span className="doc-missing">Not uploaded</span>
                      )}
                    </div>

                    <div className="doc-item">
                      <span>Signature</span>
                      {signaturePreview ? (
                        <img
                          src={signaturePreview}
                          alt="Signature"
                          className="doc-thumb signature-thumb"
                        />
                      ) : (
                        <span className="doc-missing">Not uploaded</span>
                      )}
                    </div>

                    {applicationType === 'new' && (
                      <div className="doc-item">
                        <span>Birth Certificate</span>
                        {birthCertPreview ? (
                          <span className="doc-uploaded">
                            <FaCheck /> {birthCertPreview}
                          </span>
                        ) : (
                          <span className="doc-missing">Not uploaded</span>
                        )}
                      </div>
                    )}

                    {applicationType === 'correction' && (
                      <div className="doc-item">
                        <span>Correction Proof</span>
                        {correctionProofPreview ? (
                          <span className="doc-uploaded">
                            <FaCheck /> {correctionProofPreview}
                          </span>
                        ) : (
                          <span className="doc-missing">Not uploaded</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="declaration">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    {...register('declaration', { required: true })}
                  />
                  <span>
                    I hereby declare that all information provided is true and correct
                    to the best of my knowledge.
                  </span>
                </label>
                {errors.declaration && (
                  <span className="form-error">
                    You must agree to the declaration
                  </span>
                )}
              </div>

              {newNidBlocked ? (
                <div className="application-eligibility-note blocked" role="alert">
                  <strong>New NID submission is blocked.</strong>
                  <span>{newNidBlockedMessage}</span>
                </div>
              ) : null}

              {isSubmitting && activeSubmitStage && (
                <div
                  id="application-submit-progress"
                  className="submit-progress-panel"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div className="submit-progress-main">
                    <span className="submit-thinking-indicator" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <div className="submit-progress-copy">
                      <p className="submit-progress-label">
                        {activeSubmitStage.label}
                      </p>
                      <p className="submit-progress-subtext">
                        {activeSubmitStage.subtext}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  title={isSubmitting ? submitLockReason : undefined}
                  aria-describedby={
                    isSubmitting ? 'application-submit-progress' : undefined
                  }
                >
                  ← Previous
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSubmitting || isSubmitBlockedByNewNidEligibility}
                  title={
                    isSubmitting
                      ? submitLockReason
                      : isSubmitBlockedByNewNidEligibility
                        ? submitBlockedReason
                        : undefined
                  }
                  aria-describedby={
                    isSubmitting ? 'application-submit-progress' : undefined
                  }
                >
                  {isSubmitting ? (
                    <>
                      <span className="submit-button-thinking" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      {submitButtonText}
                    </>
                  ) : (
                    idleSubmitButtonText
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {livenessSession && (
          <LivenessVerificationModal
            session={livenessSession}
            onVerified={handleLivenessVerified}
            onFailed={handleLivenessFailed}
            onCancel={handleLivenessCancelled}
            onSwitchToQr={switchDesktopLivenessToQr}
            allowQrFallback={livenessSession.allowQrFallback}
          />
        )}

        {verificationMethodChoiceOpen && (
          <div className="biometric-method-overlay">
            <div className="biometric-method-panel">
              <div className="biometric-method-header">
                <div>
                  <h2>Choose face verification method</h2>
                  <p>
                    Use this device camera or scan the QR code with your mobile phone to complete face verification.
                  </p>
                </div>
                <button
                  type="button"
                  className="biometric-qr-close"
                  onClick={cancelVerificationMethodChoice}
                  aria-label="Close verification method selection"
                >
                  <FaTimes />
                </button>
              </div>

              {!hasCameraCapability() || !isCameraSecureContext() ? (
                <div className="biometric-method-warning">
                  {!isCameraSecureContext()
                    ? 'Camera access requires HTTPS. Please use the secure testing link or scan the QR code with your mobile.'
                    : 'Camera permission is required for liveness verification. Please allow camera access and try again.'}
                </div>
              ) : null}

              <div className="biometric-method-actions">
                {hasCameraCapability() && isCameraSecureContext() ? (
                  <button
                    type="button"
                    className="biometric-method-button primary"
                    onClick={() => chooseVerificationMethod('camera')}
                  >
                    <FaLaptop />
                    <span>Use this device camera</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  className="biometric-method-button"
                  onClick={() => chooseVerificationMethod('qr')}
                >
                  <FaQrcode />
                  <span>Scan QR with mobile</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {qrSession && (
          <div className="biometric-qr-overlay">
            <div className="biometric-qr-panel">
              <div className="biometric-qr-header">
                <div>
                  <h2>
                    <FaQrcode /> Scan for face verification
                  </h2>
                  <p>
                    Open this secure QR code on a mobile phone to complete the
                    face verification and live captured frame check.
                  </p>
                </div>
                <button
                  type="button"
                  className="biometric-qr-close"
                  onClick={cancelQrVerification}
                  aria-label="Close QR verification"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="biometric-qr-code">
                <QRCodeSVG
                  value={qrSession.qrPayload || qrSession.mobileUrl}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="biometric-qr-status">
                {qrStatus === 'pending' ? (
                  <>
                    <FaMobileAlt />
                    Waiting for face verification on mobile...
                  </>
                ) : (
                  <>
                    <FaSpinner className="spinner" />
                    Checking face verification status...
                  </>
                )}
              </div>

              {qrErrorMessage && (
                <div className="biometric-qr-error">{qrErrorMessage}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationForm;
