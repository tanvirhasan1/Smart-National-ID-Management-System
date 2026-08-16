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
  FaFileAlt,
  FaLock,
  FaUser,
  FaTint
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { bangladeshLocations } from '../utils/helpers';
import { isCorrectionEligible } from '../../utils/applicationLifecycle';
import api from '../api/axios';
import LivenessVerificationModal from './LivenessVerificationModal';
import EmailVerificationModal from '../common/EmailVerificationModal';
import useEmailVerification, { normalizeVerificationEmail } from '../common/useEmailVerification';
import {
  uploadCitizenApplicationDocument,
  uploadCitizenCorrectionDocument,
  verifyBirthCertificateDocument,
  getCitizenDocumentLabel
} from '../../services/applicationDocumentService';
import '../styles/ApplicationForm.css';

const FACE_FAILURE_MESSAGE =
  'Face verification failed. Please try again.';

const FieldLabel = ({ icon: Icon, children }) => (
  <label className="form-label">
    <span className="form-label-content">
      {Icon ? <Icon className="form-label-icon" aria-hidden="true" /> : null}
      <span className="form-label-text">{children}</span>
    </span>
  </label>
);

const BIOMETRIC_ERROR_MESSAGES = {
  BIOMETRIC_TOO_MANY_ATTEMPTS:
    'Too many face verification attempts. Please restart verification.',
  BIOMETRIC_TOO_MANY_QR_OPENS:
    'Face verification link limit reached. Please restart verification.',
  BIOMETRIC_SESSION_EXPIRED:
    'Face verification session expired. Please try again.',
  BIOMETRIC_VERIFICATION_IN_PROGRESS:
    'Face verification is already in progress. Please wait and try again.',
  BIOMETRIC_CHALLENGE_SEQUENCE_INVALID:
    'Challenge sequence is invalid. Please restart verification.',
  FACE_VERIFICATION_QUALITY_FAILED:
    'Face verification failed. Please keep your face clear and try again.',
  FACE_MATCH_FAILED: FACE_FAILURE_MESSAGE,
  LIVENESS_FAILED:
    'Face verification failed. Please keep your face clear and try again.',
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
    'Please complete face verification before submitting.',
  APPLICATION_BIOMETRIC_SESSION_EXPIRED:
    'Face verification session expired. Please restart verification.',
  APPLICATION_BIOMETRIC_SESSION_ALREADY_USED:
    'Face verification session has already been used. Please restart verification.',
  APPLICATION_BIOMETRIC_OWNER_MISMATCH:
    'Face verification session does not match this account.',
  APPLICATION_VALIDATION_FAILED:
    'Application validation failed. Please review the form and try again.',
  BIRTH_CERTIFICATE_VERIFICATION_REQUIRED:
    'Birth certificate verification is required before New NID submission.',
  BIRTH_CERTIFICATE_VERIFICATION_EXPIRED:
    'Birth certificate verification expired. Please verify the birth certificate again.',
  BIRTH_CERTIFICATE_VERIFICATION_FIELD_CHANGED:
    'Application information changed. Please verify the birth certificate again.',
  BIRTH_CERTIFICATE_VERIFICATION_ALREADY_USED:
    'Birth certificate verification was already used. Please verify the document again.',
  NEW_NID_APPLICATION_EXISTS:
    'You already have a New NID application.',
  NEW_NID_ACTIVE_APPLICATION_EXISTS:
    'You already have an active New NID application.',
  NEW_NID_ALREADY_APPROVED:
    'You already have a New NID record. Please use Correction if you need changes.',
  NID_NOT_ISSUED_YET:
    'Correction is available after your card is printed.',
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
    'Document text could not be verified. Please upload a clearer image.',
  DOCUMENT_VERIFICATION_UNAVAILABLE:
    'Document verification service is temporarily unavailable. Please try again later.'
};

const CORRECTION_SUPPORTING_DOCUMENT_MIN = 1;
const CORRECTION_SUPPORTING_DOCUMENT_MAX = 4;

const CORRECTION_FORM_COPY = {
  en: {
    lockedTitle: 'Correction locked',
    lockedMessage: 'Correction will be available after your card is printed.',
    pendingTitle: 'Your correction request is under review.',
    pendingMessage:
      'You can submit another correction request only after the current one is decided.',
    rejectedTitle: 'Previous correction request rejected',
    rejectedMessage:
      'Your previous correction request was rejected. You may submit a new request with updated documents.',
    rejectionReason: 'Reason',
    currentDataReady: 'Current official NID data is loaded.',
    currentDataHelp: 'Edit only the fields you want to correct.',
    supportingDocumentsTitle: 'Supporting documents *',
    supportingDocumentsHint: 'Upload 1-4 supporting documents for your correction request.',
    supportingDocumentsPlaceholder: 'Upload supporting documents',
    supportingDocumentsSmall: 'JPG, PNG, PDF (Max 4 files, 5MB each)',
    supportingDocumentsAddMore: 'Click to add more documents',
    supportingDocumentsRequired:
      'Upload 1-4 supporting documents for your correction request.',
    supportingDocumentsTooMany: 'Maximum 4 supporting documents are allowed.',
    requestPhotoChange: 'Request photo change',
    requestPhotoChangeHelp: 'Use this only if your NID photo needs to be updated.',
    noOcrOrFaceVerification: 'Correction submission will not run OCR or face verification.',
    passportPhotoOptional: 'Passport-size photo',
    passportPhotoRequired: 'Passport-size photo *',
    passportPhotoHint: 'Upload a new passport-size photo for review.',
    passportPhotoRequiredError: 'Please upload a new passport-size photo for review.',
    photoChangeNotRequested: 'Photo change not requested',
    yes: 'Yes',
    no: 'No'
  },
  bn: {
    lockedTitle: 'সংশোধন লক করা আছে',
    lockedMessage: 'কার্ড প্রিন্ট সম্পন্ন হলে সংশোধনের আবেদন করা যাবে।',
    pendingTitle: 'আপনার সংশোধনের আবেদন পর্যালোচনাধীন রয়েছে।',
    pendingMessage:
      'বর্তমান আবেদনটি সিদ্ধান্ত হওয়ার পরই আপনি আরেকটি সংশোধনের আবেদন জমা দিতে পারবেন।',
    rejectedTitle: 'পূর্বের সংশোধনের আবেদন বাতিল হয়েছে',
    rejectedMessage:
      'আপনার পূর্বের সংশোধনের আবেদন বাতিল হয়েছে। হালনাগাদ কাগজপত্রসহ নতুন আবেদন জমা দিতে পারেন।',
    rejectionReason: 'কারণ',
    currentDataReady: 'বর্তমান অফিসিয়াল এনআইডি তথ্য লোড হয়েছে।',
    currentDataHelp: 'শুধু যে তথ্য সংশোধন করতে চান তা পরিবর্তন করুন।',
    supportingDocumentsTitle: 'সহায়ক কাগজপত্র *',
    supportingDocumentsHint: 'সংশোধনের আবেদনের জন্য ১-৪টি সহায়ক কাগজপত্র আপলোড করুন।',
    supportingDocumentsPlaceholder: 'সহায়ক কাগজপত্র আপলোড করুন',
    supportingDocumentsSmall: 'JPG, PNG, PDF (সর্বোচ্চ ৪টি ফাইল, প্রতিটি ৫MB)',
    supportingDocumentsAddMore: 'আরও কাগজপত্র যোগ করতে ক্লিক করুন',
    supportingDocumentsRequired:
      'সংশোধনের আবেদনের জন্য ১-৪টি সহায়ক কাগজপত্র আপলোড করুন।',
    supportingDocumentsTooMany: 'সর্বোচ্চ ৪টি সহায়ক কাগজপত্র আপলোড করা যাবে।',
    requestPhotoChange: 'ছবি পরিবর্তনের আবেদন',
    requestPhotoChangeHelp: 'শুধু এনআইডি ছবি পরিবর্তন করতে চাইলে এটি নির্বাচন করুন।',
    noOcrOrFaceVerification: 'সংশোধনের আবেদন জমা দিতে OCR বা ফেস ভেরিফিকেশন চালু হবে না।',
    passportPhotoOptional: 'পাসপোর্ট সাইজের ছবি',
    passportPhotoRequired: 'পাসপোর্ট সাইজের ছবি *',
    passportPhotoHint: 'পর্যালোচনার জন্য নতুন পাসপোর্ট সাইজের ছবি আপলোড করুন।',
    passportPhotoRequiredError: 'পর্যালোচনার জন্য নতুন পাসপোর্ট সাইজের ছবি আপলোড করুন।',
    photoChangeNotRequested: 'ছবি পরিবর্তনের আবেদন করা হয়নি',
    yes: 'হ্যাঁ',
    no: 'না'
  }
};

const SUBMIT_STAGES = {
  verifying_birth_certificate: {
    label: 'Verifying birth certificate...',
    subtext: 'We are checking your uploaded certificate.',
    buttonText: 'Verifying document...'
  },
  reading_document_text: {
    label: 'Reading document text...',
    subtext: 'Reading your birth certificate. Please wait.',
    buttonText: 'Verifying document...'
  },
  matching_certificate_information: {
    label: 'Matching certificate information...',
    subtext: 'Matching the certificate with your form details.',
    buttonText: 'Verifying document...'
  },
  birth_certificate_verified: {
    label: 'Birth certificate verified',
    subtext: 'Document verification completed successfully. Preparing face verification.',
    buttonText: 'Preparing face verification...'
  },
  preparing_face_verification: {
    label: 'Preparing face verification...',
    subtext: 'Document verification is complete. Face verification is being prepared.',
    buttonText: 'Preparing face verification...'
  },
  starting_face_verification: {
    label: 'Starting face verification...',
    subtext: 'Follow the next instructions to continue.',
    buttonText: 'Starting face verification...'
  },
  creating_application: {
    label: 'Creating application...',
    subtext: 'Your application record is being created.',
    buttonText: 'Submitting...'
  },
  checking_eligibility: {
    label: 'Checking application eligibility...',
    subtext: 'Please wait while we confirm your current application status.',
    buttonText: 'Checking...'
  },
  uploading_documents: {
    label: 'Uploading documents...',
    subtext: 'Your files are being uploaded securely.',
    buttonText: 'Submitting...'
  },
  birth_certificate_verified: {
    label: 'Birth certificate verified',
    subtext: 'Document verification completed successfully. Preparing face verification.',
    buttonText: 'Preparing face verification...'
  }
};

const DEFAULT_SUBMIT_BUTTON_TEXT = 'Submit Application';
const REISSUE_REMOVED_MESSAGE = 'Reissue is not available. Use Digital NID or delivery services when eligible.';

const ACTIVE_APPLICATION_SUBMIT_BLOCKING_STATUSES = new Set([
  'draft',
  'submitted',
  'under_review',
  'correction_required',
  'approved',
  'printed',
  'dispatched'
]);

const NEW_NID_SUBMIT_BLOCKING_STATUSES = new Set([
  ...ACTIVE_APPLICATION_SUBMIT_BLOCKING_STATUSES,
  'delivered'
]);

const NEW_NID_SOURCE_LOCKED_FIELDS = new Set([
  'fullNameEnglish',
  'fullNameBangla',
  'dateOfBirth',
  'gender',
  'birthRegistrationNumber'
]);

const CORRECTION_BIRTH_CERTIFICATE_LOCKED_FIELDS = new Set([
  'fullNameEnglish',
  'fullNameBangla',
  'fatherName',
  'motherName',
  'dateOfBirth',
  'gender',
  'birthRegistrationNumber'
]);

const CORRECTION_OFFICIAL_RECORD_LOCKED_FIELDS = new Set([
  'existingNidNumber'
]);

const isNewNidApplication = (application = {}) =>
  String(application.applicationType || 'new').toLowerCase() === 'new';

const getApplicationTimeValue = (application = {}) => {
  const time = new Date(application.updatedAt || application.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getActiveApplicationSubmitBlockMessage = (application) => {
  if (!application) {
    return 'Another application is already active.';
  }

  return `You already have an active application (#${application.applicationId || application._id || 'N/A'
    }). Please wait before submitting another application.`;
};

const getNewNidSubmitBlockMessage = (application) => {
  if (isCorrectionEligible(application)) {
    return 'You already have an issued Smart NID. Please use Correction if needed.';
  }

  if (application?.status === 'approved') {
    return 'Application approved. Complete your appointment and wait for printing.';
  }

  if (application?.status === 'delivered') {
    return 'You already have a delivered Smart NID. Use Correction if needed.';
  }

  if (application) {
    return `You already have a New NID application (#${application.applicationId || application._id || 'N/A'
      }). Please wait before submitting another New NID application.`;
  }

  return 'New NID application is not allowed right now. Please use Correction if needed.';
};

const getNewNidLockedToastMessage = (application) => {
  if (isCorrectionEligible(application)) {
    return 'New NID already exists. Use Correction if needed.';
  }

  if (application?.status === 'approved') {
    return 'Book biometric appointment as the next step.';
  }

  if (application?.status === 'delivered') {
    return 'New NID already exists. Use Correction if needed.';
  }

  if (application) {
    return 'A New NID application is already active.';
  }

  return 'New NID is not available now.';
};

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

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getDocumentVerificationUnavailableMessage = (error) => {
  const responseData = error?.response?.data || {};
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

  if (code === 'DOCUMENT_VERIFICATION_UNAVAILABLE') {
    return getDocumentVerificationUnavailableMessage(error);
  }

  return (
    BIOMETRIC_ERROR_MESSAGES[code] ||
    APPLICATION_ERROR_MESSAGES[code] ||
    error?.response?.data?.message ||
    error?.response?.data?.errors?.[0]?.msg ||
    error?.message ||
    'Application could not be submitted.'
  );
};

const ApplicationForm = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [birthCertPreview, setBirthCertPreview] = useState(null);
  const [correctionProofPreviews, setCorrectionProofPreviews] = useState([]);
  const [correctionBaseApplication, setCorrectionBaseApplication] = useState(null);
  const [isCorrectionPrefillLoading, setIsCorrectionPrefillLoading] = useState(false);
  const [activeCorrectionBlock, setActiveCorrectionBlock] = useState(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [selectedPresentDivision, setSelectedPresentDivision] = useState('');
  const [selectedPermanentDivision, setSelectedPermanentDivision] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({
    photograph: null,
    signature: null,
    birthCertificate: null,
    correctionProofs: []
  });

  const [hasIssuedNid, setHasIssuedNid] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [isNidEligibilityLoading, setIsNidEligibilityLoading] = useState(true);
  const [activeApplicationSubmitBlock, setActiveApplicationSubmitBlock] =
    useState(null);
  const [newNidSubmitBlock, setNewNidSubmitBlock] = useState(null);
  const [isActiveApplicationChecking, setIsActiveApplicationChecking] =
    useState(true);

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
      photoChangeRequested: false,
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
  const photoChangeRequested = Boolean(watch('photoChangeRequested'));
  const bloodGroupValue = watch('bloodGroup');
  const occupationValue = watch('occupation');
  const currentEmailValue = watch('email');
  const emailVerification = useEmailVerification({
    purpose: 'correction_email_change',
    recipientName: user?.fullName || ''
  });
  const correctionOriginalEmail = normalizeVerificationEmail(
    correctionBaseApplication?.prefill?.email || ''
  );
  const correctionEmailChanged =
    applicationType === 'correction' &&
    Boolean(correctionBaseApplication) &&
    normalizeVerificationEmail(currentEmailValue) !== correctionOriginalEmail;
  const correctionEmailVerified =
    !correctionEmailChanged || emailVerification.isVerified(currentEmailValue);

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
    if (submitInProgressRef.current || isSubmitting) {
      return;
    }

    scrollToApplicationTop();
  }, [currentStep, isSubmitting]);

  const correctionUnlockApplication =
    newNidSubmitBlock &&
      eligibility?.correctionEligible &&
      String(newNidSubmitBlock?._id || '') ===
      String(eligibility?.correctionEligibleApplicationId || '')
      ? newNidSubmitBlock
      : null;
  const isCorrectionBlockedByActiveRequest = Boolean(activeCorrectionBlock);
  const hasCorrectionBaseNid =
    Boolean(eligibility?.correctionEligible) ||
    hasIssuedNid ||
    Boolean(correctionUnlockApplication);
  const canUseCorrectionServices = hasCorrectionBaseNid && !isCorrectionBlockedByActiveRequest;
  const isCorrectionServiceLocked = !canUseCorrectionServices;
  const isNewNidEligibilityBlocked = eligibility?.canApplyNewNid === false;
  const newNidBlocked =
    applicationType === 'new' && isNewNidEligibilityBlocked;
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
  const isSubmitBlockedByActiveApplication =
    applicationType === 'new' &&
    (isActiveApplicationChecking || Boolean(activeApplicationSubmitBlock));
  const isSubmitBlockedByDeliveredNewNid =
    applicationType === 'new' && Boolean(newNidSubmitBlock);
  const activeApplicationBlockedReason = isActiveApplicationChecking
    ? 'Checking active application...'
    : getActiveApplicationSubmitBlockMessage(activeApplicationSubmitBlock);
  const deliveredNewNidBlockedReason = getNewNidSubmitBlockMessage(newNidSubmitBlock);
  const correctionCopy = CORRECTION_FORM_COPY[language === 'bn' ? 'bn' : 'en'];
  const latestCorrectionRequest = eligibility?.latestCorrectionRequest || null;
  const latestCorrectionRejected =
    latestCorrectionRequest?.status === 'rejected' ? latestCorrectionRequest : null;
  const isNewNidTypeLocked =
    Boolean(newNidSubmitBlock) ||
    Boolean(activeApplicationSubmitBlock) ||
    isNewNidEligibilityBlocked;
  const canSubmitNewNidType = !isNewNidTypeLocked && !isActiveApplicationChecking;
  const hasAnyApplicationTypeAvailable = canSubmitNewNidType || canUseCorrectionServices;
  const isSelectedApplicationTypeAvailable =
    applicationType === 'correction'
      ? canUseCorrectionServices
      : applicationType === 'new'
        ? canSubmitNewNidType
        : false;
  const shouldShowApplicantInformation =
    !isNidEligibilityLoading && isSelectedApplicationTypeAvailable;
  const shouldShowNoApplicationTypeMessage =
    !isNidEligibilityLoading && !hasAnyApplicationTypeAvailable;
  const submitBlockedReason = isSubmitBlockedByActiveApplication
    ? activeApplicationBlockedReason
    : isSubmitBlockedByDeliveredNewNid
      ? deliveredNewNidBlockedReason
      : isNidEligibilityLoading
        ? 'Checking New NID eligibility...'
        : newNidBlockedMessage;
  const idleSubmitButtonText =
    isSubmitBlockedByNewNidEligibility || isSubmitBlockedByDeliveredNewNid
      ? isNidEligibilityLoading
        ? 'Checking eligibility...'
        : 'New NID unavailable'
      : t('apply.submitApplication');
  const isApplicationFieldLocked = (fieldName) => {
    if (
      applicationType === 'new' &&
      NEW_NID_SOURCE_LOCKED_FIELDS.has(fieldName)
    ) {
      return true;
    }

    if (applicationType === 'correction') {
      return (
        CORRECTION_BIRTH_CERTIFICATE_LOCKED_FIELDS.has(fieldName) ||
        CORRECTION_OFFICIAL_RECORD_LOCKED_FIELDS.has(fieldName)
      );
    }

    return false;
  };

  const getLockedCorrectionValue = (fieldName, fallback = '') => {
    if (applicationType !== 'correction') return fallback;

    const prefill = correctionBaseApplication?.prefill || {};

    if (fieldName === 'existingNidNumber') {
      return prefill.existingNidNumber || correctionBaseApplication?.nidNumber || fallback;
    }

    return prefill[fieldName] ?? fallback;
  };

  const activeSubmitStage = submitStage ? SUBMIT_STAGES[submitStage] : null;


  useEffect(() => {
    if (!isSubmitting || !submitStage || currentStep !== 4) {
      return;
    }

    const timerId = window.setTimeout(() => {
      document
        .getElementById('application-submit-progress')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
    }, 180);

    return () => window.clearTimeout(timerId);
  }, [isSubmitting, submitStage, currentStep]);

  const submitButtonText =
    activeSubmitStage?.buttonText || t('apply.submitApplication');
  const submitLockReason =
    activeSubmitStage?.label ||
    'Submission is in progress. Please wait before changing steps.';

  const blockLockedSelect = (event) => {
    if (event.currentTarget?.getAttribute('aria-disabled') !== 'true') return;
    event.preventDefault();
  };

  const handleLockedApplicationTypeClick = (event) => {
    if (!isCorrectionServiceLocked) return;

    event.preventDefault();

    if (isCorrectionBlockedByActiveRequest) {
      toast.info('Correction request already submitted.');
      return;
    }

    setValue('applicationType', 'new', { shouldValidate: true });
    toast.info('Correction will be available after your card is printed.');
  };

  const handleLockedNewNidTypeClick = (event) => {
    event.preventDefault();
    toast.error(getNewNidLockedToastMessage(newNidSubmitBlock));
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

  const waitForUiStep = (delayMs = 700) =>
    new Promise((resolve) => setTimeout(resolve, delayMs));

  const resetSubmitProgress = () => {
    clearSubmitStageTimers();
    setSubmitStage('');
    setIsSubmitting(false);
  };

  const loadActiveApplicationSubmitBlock = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setActiveApplicationSubmitBlock(null);
      setNewNidSubmitBlock(null);
      setIsActiveApplicationChecking(false);
      return { activeBlock: null, newNidBlock: null };
    }

    if (!silent) {
      setIsActiveApplicationChecking(true);
    }

    try {
      const response = await api.get('/applications/my');
      const applicationList = Array.isArray(response?.data?.applications)
        ? response.data.applications
        : [];

      const sortedApplicationList = [...applicationList].sort((first, second) =>
        getApplicationTimeValue(second) - getApplicationTimeValue(first)
      );

      const blockingApplication =
        sortedApplicationList.find((application) =>
          ACTIVE_APPLICATION_SUBMIT_BLOCKING_STATUSES.has(application?.status)
        ) || null;

      const newNidBlockingApplication =
        sortedApplicationList.find(
          (application) =>
            isNewNidApplication(application) &&
            NEW_NID_SUBMIT_BLOCKING_STATUSES.has(application?.status)
        ) || null;

      setActiveApplicationSubmitBlock(blockingApplication);
      setNewNidSubmitBlock(newNidBlockingApplication);
      return {
        activeBlock: blockingApplication,
        newNidBlock: newNidBlockingApplication
      };
    } catch (error) {
      console.error('Failed to check active applications:', error);
      setActiveApplicationSubmitBlock(null);
      setNewNidSubmitBlock(null);
      return { activeBlock: null, newNidBlock: null };
    } finally {
      if (!silent) {
        setIsActiveApplicationChecking(false);
      }
    }
  }, [user]);

  const loadNidEligibility = useCallback(async ({ intent = '' } = {}) => {
    if (user) {
      setIsNidEligibilityLoading(true);

      try {
        const response = await api.get('/applications/eligibility', {
          params: intent ? { intent } : undefined
        });
        const nextEligibility = response?.data?.data || null;
        const hasEligibleNid = Boolean(
          nextEligibility?.correctionEligible ||
          nextEligibility?.canRequestCorrection ||
          nextEligibility?.issuedNewApplication
        );

        setEligibility(nextEligibility);
        setHasIssuedNid(hasEligibleNid);
        setActiveCorrectionBlock(nextEligibility?.activeCorrectionRequest || null);

        if (!hasEligibleNid) {
          setValue('applicationType', 'new', { shouldValidate: true });
        }

        return nextEligibility;
      } catch (error) {
        console.error('Failed to check NID eligibility:', error);
        setEligibility(null);
        setHasIssuedNid(false);
        setActiveCorrectionBlock(null);
        setValue('applicationType', 'new', { shouldValidate: true });
        return null;
      } finally {
        setIsNidEligibilityLoading(false);
      }
    }

    setEligibility(null);
    setHasIssuedNid(false);
    setActiveCorrectionBlock(null);
    setIsNidEligibilityLoading(false);
    return null;
  }, [user, setValue]);

  useEffect(() => {
    loadNidEligibility();
  }, [loadNidEligibility]);

  useEffect(() => {
    loadActiveApplicationSubmitBlock();
  }, [loadActiveApplicationSubmitBlock]);

  useEffect(() => {
    if (isCorrectionServiceLocked && applicationType === 'correction') {
      setValue('applicationType', 'new', { shouldValidate: true });
    }
  }, [applicationType, isCorrectionServiceLocked, setValue]);

  useEffect(() => {
    if (applicationType === 'reissue') {
      setValue('applicationType', canUseCorrectionServices ? 'correction' : 'new', { shouldValidate: true });
      toast.info(REISSUE_REMOVED_MESSAGE);
    }
  }, [applicationType, canUseCorrectionServices, setValue]);

  useEffect(() => {
    if (newNidSubmitBlock && canUseCorrectionServices && applicationType === 'new') {
      setValue('applicationType', 'correction', { shouldValidate: true });
    }
  }, [applicationType, canUseCorrectionServices, newNidSubmitBlock, setValue]);

  useEffect(() => {
    if (submitInProgressRef.current || isSubmitting) {
      return;
    }

    if (!shouldShowApplicantInformation && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [currentStep, shouldShowApplicantInformation, isSubmitting]);

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
    const loadCorrectionPrefill = async () => {
      if (!user || applicationType !== 'correction' || isCorrectionServiceLocked) {
        return;
      }

      try {
        setIsCorrectionPrefillLoading(true);
        const response = await api.get('/corrections/prefill');
        const data = response?.data?.data || {};
        const prefill = data.prefill || {};

        setCorrectionBaseApplication(data);
        setValue('fullNameEnglish', prefill.fullNameEnglish || '');
        setValue('fullNameBangla', prefill.fullNameBangla || '');
        setValue('fatherName', prefill.fatherName || '');
        setValue('motherName', prefill.motherName || '');
        setValue('spouseName', prefill.spouseName || '');
        setValue('dateOfBirth', toDateInputValue(prefill.dateOfBirth));
        setValue('gender', prefill.gender || '');
        setValue('bloodGroup', prefill.bloodGroup || '');
        setValue('maritalStatus', prefill.maritalStatus || 'single');
        setValue('birthRegistrationNumber', prefill.birthRegistrationNumber || '');
        setValue('existingNidNumber', prefill.existingNidNumber || data.nidNumber || '');
        setValue('phone', prefill.phone || '');
        setValue('email', prefill.email || '');
        setValue('occupation', prefill.occupation || '');

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
        setCorrectionBaseApplication(null);
        toast.error(error?.response?.data?.message || 'Correction data could not be loaded.');
      } finally {
        setIsCorrectionPrefillLoading(false);
      }
    };

    loadCorrectionPrefill();
  }, [applicationType, isCorrectionServiceLocked, setValue, user]);

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
    `application-form-input form-input w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${hasError
      ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
      : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const getSelectClass = (hasError = false) =>
    `application-form-select form-select w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:ring-4 ${hasError
      ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
      : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo size must be 2MB or less.');
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
      toast.error('Signature size must be 1MB or less.');
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
      toast.error('Birth certificate size must be 5MB or less.');
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
    const incomingFiles = Array.from(event.target.files || []);
    if (incomingFiles.length === 0) return;

    const existingFiles = selectedFiles.correctionProofs || [];
    const remainingSlots = Math.max(
      0,
      CORRECTION_SUPPORTING_DOCUMENT_MAX - existingFiles.length
    );

    if (remainingSlots === 0) {
      toast.error(correctionCopy.supportingDocumentsTooMany);
      event.target.value = '';
      return;
    }

    const acceptedFiles = [];

    for (const file of incomingFiles.slice(0, remainingSlots)) {
      if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
        toast.error(`${file.name} is not supported. Use JPG, PNG, or PDF.`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} must be 5MB or less.`);
        continue;
      }

      acceptedFiles.push(file);
    }

    if (incomingFiles.length > remainingSlots) {
      toast.info(correctionCopy.supportingDocumentsTooMany);
    }

    if (acceptedFiles.length === 0) {
      event.target.value = '';
      return;
    }

    const nextFiles = [...existingFiles, ...acceptedFiles];

    setSelectedFiles((prevState) => ({
      ...prevState,
      correctionProofs: nextFiles
    }));
    setValue('correctionProofs', nextFiles);
    setCorrectionProofPreviews(nextFiles.map((file) => file.name));
    event.target.value = '';
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

  useEffect(() => {
    if (applicationType === 'correction' && !photoChangeRequested && selectedFiles.photograph) {
      resetPhotoSelection();
    }
  }, [applicationType, photoChangeRequested, selectedFiles.photograph]);

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
    setCorrectionProofPreviews([]);
    setSelectedFiles((prevState) => ({
      ...prevState,
      correctionProofs: []
    }));
    setValue('correctionProofs', []);

    if (correctionProofInputRef.current) {
      correctionProofInputRef.current.value = '';
    }
  };

  const removeCorrectionProofSelection = (indexToRemove) => {
    const nextFiles = (selectedFiles.correctionProofs || []).filter(
      (_, index) => index !== indexToRemove
    );

    setSelectedFiles((prevState) => ({
      ...prevState,
      correctionProofs: nextFiles
    }));
    setValue('correctionProofs', nextFiles);
    setCorrectionProofPreviews(nextFiles.map((file) => file.name));
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
            error?.response?.data?.message || 'Face verification status could not be checked.'
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

  const uploadSelectedCorrectionDocuments = async (correctionObjectId) => {
    const uploadQueue = [];

    if (photoChangeRequested && selectedFiles.photograph) {
      uploadQueue.push({
        documentType: 'photograph',
        file: selectedFiles.photograph
      });
    }

    (selectedFiles.correctionProofs || []).forEach((file) => {
      uploadQueue.push({
        documentType: 'correctionProof',
        file
      });
    });

    const failedUploads = [];

    for (const item of uploadQueue) {
      try {
        await uploadCitizenCorrectionDocument({
          correctionId: correctionObjectId,
          documentType: item.documentType,
          file: item.file
        });
      } catch (error) {
        failedUploads.push(getCitizenDocumentLabel(item.documentType));
        console.error(
          `Failed to upload correction ${item.documentType}:`,
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

      if (applicationType === 'correction') {
        fields.push('existingNidNumber', 'correctionReason');
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

  const getCorrectionSupportingDocumentError = () => {
    const supportingDocumentCount = (selectedFiles.correctionProofs || []).length;

    if (supportingDocumentCount < CORRECTION_SUPPORTING_DOCUMENT_MIN) {
      return correctionCopy.supportingDocumentsRequired;
    }

    if (supportingDocumentCount > CORRECTION_SUPPORTING_DOCUMENT_MAX) {
      return correctionCopy.supportingDocumentsTooMany;
    }

    return '';
  };

  const validateDocumentStep = () => {
    // File inputs are handled by React state, so we validate them manually here.
    if (applicationType === 'new' && (!selectedFiles.photograph || !photoPreview)) {
      toast.error(t('apply.uploadPhoto'));
      return false;
    }

    if (applicationType === 'new' && (!selectedFiles.signature || !signaturePreview)) {
      toast.error(t('apply.uploadSignature'));
      return false;
    }

    if (applicationType === 'new' && !selectedFiles.birthCertificate) {
      toast.error(t('apply.uploadBirthCertificate'));
      return false;
    }

    if (applicationType === 'correction') {
      const supportingDocumentError = getCorrectionSupportingDocumentError();

      if (supportingDocumentError) {
        toast.error(supportingDocumentError);
        return false;
      }

      if (photoChangeRequested && (!selectedFiles.photograph || !photoPreview)) {
        toast.error(correctionCopy.passportPhotoRequiredError);
        return false;
      }
    }

    return true;
  };

  const handleVerifyCorrectionEmail = async () => {
    const valid = await trigger('email', { shouldFocus: true });
    if (!valid) return;

    await emailVerification.startVerification(
      currentEmailValue,
      watch('fullNameEnglish') || user?.fullName || ''
    );
  };

  const nextStep = async () => {
    if (currentStep === 1 || currentStep === 2) {
      const fieldsToValidate = getStepValidationFields(currentStep);
      const isStepValid = await trigger(fieldsToValidate, { shouldFocus: true });

      if (!isStepValid) {
        toast.error(t('apply.fillRequired'));
        return;
      }
    }

    if (
      currentStep === 1 &&
      applicationType === 'correction' &&
      correctionEmailChanged &&
      !emailVerification.isVerified(currentEmailValue)
    ) {
      toast.error('Please verify the changed email address before continuing.');
      return;
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

    submitInProgressRef.current = true;
    setCurrentStep(4);
    setIsSubmitting(true);
    setSubmitStage(
      data.applicationType === 'new'
        ? 'verifying_birth_certificate'
        : 'creating_application'
    );


    await waitForUiStep(400);
    setSubmitStage('checking_eligibility');
    // scrollToApplicationTop();
    await waitForUiStep(250);

    const latestSubmitBlocks = await loadActiveApplicationSubmitBlock({ silent: true });
    const blockingApplication =
      data.applicationType === 'new'
        ? activeApplicationSubmitBlock || latestSubmitBlocks?.activeBlock || null
        : null;
    const newNidBlockingApplication =
      data.applicationType === 'new'
        ? newNidSubmitBlock || latestSubmitBlocks?.newNidBlock || null
        : null;

    if (blockingApplication) {
      toast.error(getActiveApplicationSubmitBlockMessage(blockingApplication));
      cancelSubmitAttempt(1);
      return;
    }

    if (newNidBlockingApplication) {
      toast.error(getNewNidSubmitBlockMessage(newNidBlockingApplication));
      setCurrentStep(1);
      return;
    }

    if (data.applicationType === 'reissue') {
      toast.error(REISSUE_REMOVED_MESSAGE);
      setValue('applicationType', canUseCorrectionServices ? 'correction' : 'new', { shouldValidate: true });
      setCurrentStep(1);
      return;
    }

    if (isCorrectionServiceLocked && data.applicationType === 'correction') {
      toast.error('Correction will be available after your card is printed.');
      setValue('applicationType', 'new', { shouldValidate: true });
      setCurrentStep(1);
      return;
    }

    if (data.applicationType === 'correction') {
      const latestEligibility = await loadNidEligibility({ intent: 'submit' });

      if (!latestEligibility?.canRequestCorrection) {
        toast.error(
          latestEligibility?.correctionBlockedReasonMessage ||
          latestEligibility?.blockedReasonMessage ||
          correctionCopy.lockedMessage
        );
        setCurrentStep(1);
        return;
      }
    }

    if (data.applicationType === 'new') {
      const latestEligibility = await loadNidEligibility({ intent: 'submit' });

      if (!latestEligibility) {
        toast.error('Eligibility check failed. Please try again.');
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

    if (data.applicationType === 'new' && (!selectedFiles.photograph || !photoPreview)) {
      toast.error(t('apply.uploadPhoto'));
      setCurrentStep(3);
      return;
    }

    if (data.applicationType === 'new' && (!selectedFiles.signature || !signaturePreview)) {
      toast.error(t('apply.uploadSignature'));
      setCurrentStep(3);
      return;
    }

    if (data.applicationType === 'new' && !selectedFiles.birthCertificate) {
      toast.error(t('apply.uploadBirthCertificate'));
      cancelSubmitAttempt(3);
      return;
    }

    if (data.applicationType === 'correction') {
      const supportingDocumentError = getCorrectionSupportingDocumentError();

      if (supportingDocumentError) {
        toast.error(supportingDocumentError);
        setCurrentStep(3);
        return;
      }

      if (photoChangeRequested && (!selectedFiles.photograph || !photoPreview)) {
        toast.error(correctionCopy.passportPhotoRequiredError);
        setCurrentStep(3);
        return;
      }
    }

    if (data.applicationType === 'correction' && !data.correctionReason?.trim()) {
      toast.error('Please enter a correction reason.');
      setCurrentStep(1);
      return;
    }



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
        fullNameEnglish:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('fullNameEnglish', data.fullNameEnglish)
            : data.fullNameEnglish,
        fullNameBangla:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('fullNameBangla', data.fullNameBangla || '')
            : data.fullNameBangla || '',
        fatherName:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('fatherName', data.fatherName)
            : data.fatherName,
        motherName:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('motherName', data.motherName)
            : data.motherName,
        spouseName: data.spouseName || '',
        dateOfBirth:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('dateOfBirth', data.dateOfBirth)
            : data.dateOfBirth,
        gender:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('gender', data.gender)
            : data.gender,
        bloodGroup: data.bloodGroup || '',
        maritalStatus: data.maritalStatus || 'single',
        birthRegistrationNumber:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('birthRegistrationNumber', data.birthRegistrationNumber || '')
            : data.birthRegistrationNumber || '',
        existingNidNumber:
          data.applicationType === 'correction'
            ? getLockedCorrectionValue('existingNidNumber', data.existingNidNumber || '')
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
              ? (selectedFiles.correctionProofs || []).map((file) => file.name).join(', ')
              : '',
          photo:
            data.applicationType === 'new' || photoChangeRequested
              ? selectedFiles.photograph?.name || ''
              : '',
          signature: data.applicationType === 'new' ? selectedFiles.signature?.name || '' : ''
        }
      };

      if (payload.applicationType === 'correction') {
        const submittedCorrectionEmail = normalizeVerificationEmail(payload.email);
        const submittedCorrectionEmailChanged =
          submittedCorrectionEmail !== correctionOriginalEmail;

        if (
          submittedCorrectionEmailChanged &&
          !emailVerification.isVerified(submittedCorrectionEmail)
        ) {
          toast.error('Please verify the changed email address before continuing.');
          setCurrentStep(1);
          return;
        }

        if (submittedCorrectionEmailChanged) {
          payload.emailVerificationToken =
            emailVerification.getProofToken(submittedCorrectionEmail);
        }

        payload.correctionInfo = {
          reason: data.correctionReason?.trim() || '',
          photoChangeRequested,
          supportingDocumentCount: (selectedFiles.correctionProofs || []).length
        };
        payload.photoChangeRequested = photoChangeRequested;
        payload.supportingDocumentCount = (selectedFiles.correctionProofs || []).length;
      }

      if (payload.applicationType === 'correction') {
        finalApplicationSubmitCalled = true;
        setSubmitStage('creating_application');

        const response = await api.post('/corrections', {
          ...payload,
          reason: data.correctionReason?.trim() || ''
        });
        const createdCorrection = response?.data?.data || response?.data?.correction;
        const createdCorrectionId = createdCorrection?._id;

        if (!createdCorrectionId) {
          throw new Error('Correction request created but no correction id was returned');
        }

        setSubmitStage('uploading_documents');
        const failedUploads = await uploadSelectedCorrectionDocuments(createdCorrectionId);

        if (failedUploads.length > 0) {
          toast.warning(
            `Correction submitted, but these uploads failed: ${failedUploads.join(
              ', '
            )}. Contact support if needed.`
          );
        } else {
          toast.success('Correction submitted successfully.');
        }

        navigate('/dashboard');
        return;
      }

      if (payload.applicationType === 'new') {
        clearSubmitStageTimers();

        setCurrentStep(4);
        setSubmitStage('verifying_birth_certificate');
        await waitForUiStep(500);

        queueSubmitStage('reading_document_text', 700);
        queueSubmitStage('matching_certificate_information', 1800);

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
          throw new Error('Birth certificate verification could not be completed.');
        }

        setSubmitStage('birth_certificate_verified');
        await waitForUiStep(1000);

        payload.birthCertificateVerificationToken =
          documentVerificationResponse.verificationToken;
      }

      setSubmitStage('preparing_face_verification');
      await waitForUiStep(800);

      const deviceType = isMobileDevice() ? 'mobile' : 'desktop';
      const verificationMethod =
        deviceType === 'mobile' ? 'camera' : await waitForVerificationMethodChoice();

      setSubmitStage('starting_face_verification');

      let biometricSession = await createBiometricSession(
        deviceType,
        verificationMethod === 'qr'
      );

      if (!biometricSession?.sessionId) {
        throw new Error('Face verification session could not be created.');
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
            throw new Error('Face verification session could not be created.');
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
          )}. Contact support if needed.`
        );
      } else {
        toast.success('Application submitted successfully.');
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
          <h1 className="application-form-title text-[2rem] font-semibold text-[#1F2937]">
            {t('apply.title')}
          </h1>
          <p className="application-form-subtitle text-[#6B7280]">
            {t('apply.subtitle')}
          </p>
        </div>

        <div className="progress-steps application-progress-steps mb-10 flex items-center justify-center px-2">
          <div
            className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''
              }`}
          >
            <div className="step-circle">{currentStep > 1 ? <FaCheck /> : '1'}</div>
            <span>{t('apply.progressPersonal')}</span>
          </div>
          <div className="step-line" />
          <div
            className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''
              }`}
          >
            <div className="step-circle">{currentStep > 2 ? <FaCheck /> : '2'}</div>
            <span>{t('apply.progressAddress')}</span>
          </div>
          <div className="step-line" />
          <div
            className={`progress-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''
              }`}
          >
            <div className="step-circle">{currentStep > 3 ? <FaCheck /> : '3'}</div>
            <span>{t('apply.progressDocuments')}</span>
          </div>
          <div className="step-line" />
          <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-circle">4</div>
            <span>{t('apply.progressReview')}</span>
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
                <FaIdCard /> {t('apply.step1Title')}
              </h2>
              <p className="step-description">
                {t('apply.step1Description')}
              </p>

              {/* 
                Application type cards:
                Correction stays locked in logic until the user is eligible,
                but the extra visible "Locked" text is hidden for a cleaner UI.
              */}
              <div className="application-types mb-8 grid gap-5 md:grid-cols-2">
                <label
                  className={`type-card ${applicationType === 'new' ? 'selected' : ''
                    } ${isNewNidTypeLocked ? 'locked-type' : ''}`}
                  onClick={isNewNidTypeLocked ? handleLockedNewNidTypeClick : undefined}
                  aria-disabled={isNewNidTypeLocked}
                >
                  <input
                    type="radio"
                    value="new"
                    disabled={isNewNidTypeLocked}
                    {...register('applicationType')}
                  />
                  <div className="type-content">
                    {isNewNidTypeLocked ? (
                      <span className="type-lock-badge">
                        <FaLock /> Locked
                      </span>
                    ) : null}
                    <div className="type-icon new-icon">
                      <FaIdCard />
                    </div>
                    <h4>{t('apply.newNidTitle')}</h4>
                    <p>{t('apply.newNidDescription')}</p>
                  </div>
                </label>

                <label
                  className={`type-card ${applicationType === 'correction' ? 'selected' : ''
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
                    {isCorrectionServiceLocked ? (
                      <span className="type-lock-badge">
                        <FaLock />
                        {isCorrectionBlockedByActiveRequest ? ' Pending' : ' Locked'}
                      </span>
                    ) : null}
                    <div className="type-icon correction-icon">
                      <FaIdCard />
                    </div>
                    <h4>{t('apply.correctionTitle')}</h4>
                    <p>{t('apply.correctionDescription')}</p>
                  </div>
                </label>
              </div>

              {showNewNidResubmissionNotice ? (
                <div className="application-eligibility-note resubmission" role="note">
                  <strong>{t('apply.rejectedNoticeTitle')}</strong>
                  <span>
                    You can apply again after correcting the issues.
                  </span>
                  <div className="application-eligibility-meta">
                    {(latestRejectionNotice.applicationId ||
                      eligibility?.latestRejectedApplicationId) && (
                        <span>
                          {t('apply.previous')}:{' '}
                          {latestRejectionNotice.applicationId ||
                            eligibility.latestRejectedApplicationId}
                        </span>
                      )}
                    {(latestRejectionNotice.rejectedAt ||
                      eligibility?.latestRejectedAt) && (
                        <span>
                          {t('apply.rejected')}:{' '}
                          {formatEligibilityDate(
                            latestRejectionNotice.rejectedAt ||
                            eligibility.latestRejectedAt
                          )}
                        </span>
                      )}
                    {(latestRejectionNotice.rejectionReason ||
                      eligibility?.latestRejectionReason) && (
                        <span>
                          {t('apply.reason')}:{' '}
                          {latestRejectionNotice.rejectionReason ||
                            eligibility.latestRejectionReason}
                        </span>
                      )}
                  </div>
                </div>
              ) : null}

              {shouldShowNoApplicationTypeMessage ? (
                <div
                  className={`application-eligibility-note ${isCorrectionBlockedByActiveRequest ? 'pending' : 'blocked'
                    }`}
                  role="note"
                >
                  <strong>
                    {isCorrectionBlockedByActiveRequest
                      ? correctionCopy.pendingTitle
                      : correctionCopy.lockedTitle}
                  </strong>
                  <span>
                    {isCorrectionBlockedByActiveRequest
                      ? correctionCopy.pendingMessage
                      : correctionCopy.lockedMessage}
                  </span>
                </div>
              ) : null}

              {applicationType === 'correction' && canUseCorrectionServices ? (
                <>
                  {latestCorrectionRejected ? (
                    <div className="application-eligibility-note resubmission" role="note">
                      <strong>{correctionCopy.rejectedTitle}</strong>
                      <span>{correctionCopy.rejectedMessage}</span>
                      {latestCorrectionRejected.rejectionReason ? (
                        <div className="application-eligibility-meta">
                          <span>
                            {correctionCopy.rejectionReason}:{' '}
                            {latestCorrectionRejected.rejectionReason}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="correction-prefill-note" role="note">
                    <strong>
                      {isCorrectionPrefillLoading
                        ? 'Loading current official data...'
                        : correctionCopy.currentDataReady}
                    </strong>
                    <span>{correctionCopy.currentDataHelp}</span>
                  </div>
                </>
              ) : null}

              {shouldShowApplicantInformation ? (
                <>
                  <div className="info-section applicant-info-section">
                    <h3>{t('apply.applicantInfo')}</h3>

                    <div className="form-row grid gap-5 md:grid-cols-2">
                      <div className="form-group">
                        <FieldLabel icon={FaUser}>{t('apply.fullNameEnglish')}</FieldLabel>
                        <input
                          type="text"
                          readOnly={isApplicationFieldLocked('fullNameEnglish')}
                          aria-readonly={isApplicationFieldLocked('fullNameEnglish')}
                          className={`${getInputClass(!!errors.fullNameEnglish)} ${isApplicationFieldLocked('fullNameEnglish') ? 'locked-input' : ''
                            }`}
                          placeholder={t('apply.enterFullNameEnglish')}
                          {...register('fullNameEnglish', {
                            required: 'Full name in English is required'
                          })}
                        />
                        {errors.fullNameEnglish && (
                          <span className="form-error">{errors.fullNameEnglish.message}</span>
                        )}
                      </div>

                      <div className="form-group">
                        <FieldLabel icon={FaUser}>{t('apply.fullNameBangla')}</FieldLabel>
                        <input
                          type="text"
                          readOnly={isApplicationFieldLocked('fullNameBangla')}
                          aria-readonly={isApplicationFieldLocked('fullNameBangla')}
                          className={`${getInputClass(false)} ${isApplicationFieldLocked('fullNameBangla') ? 'locked-input' : ''
                            }`}
                          placeholder={t('apply.enterFullNameBangla')}
                          {...register('fullNameBangla')}
                        />
                      </div>
                    </div>

                    <div className="form-row grid gap-5 md:grid-cols-2">
                      <div className="form-group">
                        <FieldLabel icon={FaCalendar}>{t('apply.dateOfBirth')}</FieldLabel>
                        <input
                          type="date"
                          readOnly={isApplicationFieldLocked('dateOfBirth')}
                          aria-readonly={isApplicationFieldLocked('dateOfBirth')}
                          className={`${getInputClass(!!errors.dateOfBirth)} ${isApplicationFieldLocked('dateOfBirth') ? 'locked-input' : ''
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
                        <FieldLabel icon={FaVenusMars}>{t('apply.gender')}</FieldLabel>
                        <select
                          aria-disabled={isApplicationFieldLocked('gender')}
                          tabIndex={isApplicationFieldLocked('gender') ? -1 : 0}
                          className={`${getSelectClass(!!errors.gender)} ${isApplicationFieldLocked('gender') ? 'locked-input' : ''
                            }`}
                          onMouseDown={blockLockedSelect}
                          onTouchStart={blockLockedSelect}
                          onKeyDown={blockLockedSelect}
                          {...register('gender', {
                            required: 'Gender is required'
                          })}
                        >
                          <option value="">{t('apply.selectGender')}</option>
                          <option value="male">{t('apply.male')}</option>
                          <option value="female">{t('apply.female')}</option>
                          <option value="other">{t('apply.other')}</option>
                        </select>
                        {errors.gender && (
                          <span className="form-error">{errors.gender.message}</span>
                        )}
                      </div>
                    </div>

                    <div className="form-row grid gap-5 md:grid-cols-2">
                      <div className="form-group">
                        <FieldLabel icon={FaIdCard}>{t('apply.birthRegistrationNumber')}</FieldLabel>
                        <input
                          type="text"
                          readOnly={isApplicationFieldLocked('birthRegistrationNumber')}
                          aria-readonly={isApplicationFieldLocked('birthRegistrationNumber')}
                          className={`${getInputClass(!!errors.birthRegistrationNumber)} ${isApplicationFieldLocked('birthRegistrationNumber') ? 'locked-input' : ''
                            }`}
                          placeholder={t('apply.birthRegistrationPlaceholder')}
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
                        <FieldLabel icon={FaTint}>{t('apply.bloodGroup')}</FieldLabel>
                        <select
                          className={getSelectClass(showBloodGroupError)}
                          {...register('bloodGroup', {
                            required: 'Blood group is required'
                          })}
                        >
                          <option value="">{t('apply.selectBloodGroup')}</option>
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
                        <FieldLabel icon={FaPhone}>{t('apply.phoneNumber')}</FieldLabel>
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
                        <FieldLabel icon={FaEnvelope}>{t('apply.email')}</FieldLabel>
                        <div className="relative">
                          <input
                            type="email"
                            className={`${getInputClass(!!errors.email)} ${
                              correctionEmailChanged ? 'pr-[108px]' : ''
                            }`}
                            placeholder={t('apply.emailPlaceholder')}
                            {...register('email', {
                              pattern: {
                                value: /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i,
                                message: 'Enter a valid email address'
                              }
                            })}
                          />
                          {correctionEmailChanged ? (
                            correctionEmailVerified ? (
                              <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-xs font-semibold text-emerald-700">
                                <FaCheck /> Verified
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleVerifyCorrectionEmail}
                                disabled={emailVerification.isStarting}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {emailVerification.isStarting ? 'Checking...' : 'Verify'}
                              </button>
                            )
                          ) : null}
                        </div>
                        {errors.email && (
                          <span className="form-error">{errors.email.message}</span>
                        )}
                      </div>
                    </div>

                    <div className="form-row grid gap-5 md:grid-cols-2">
                      <div className="form-group">
                        <FieldLabel icon={FaUser}>{t('apply.maritalStatus')}</FieldLabel>
                        <select className={getSelectClass(false)} {...register('maritalStatus')}>
                          <option value="single">{t('apply.single')}</option>
                          <option value="married">{t('apply.married')}</option>
                          <option value="divorced">{t('apply.divorced')}</option>
                          <option value="widowed">{t('apply.widowed')}</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <FieldLabel icon={FaBriefcase}>{t('apply.occupation')}</FieldLabel>
                        <input
                          type="text"
                          className={getInputClass(showOccupationError)}
                          placeholder={t('apply.occupationPlaceholder')}
                          {...register('occupation', {
                            required: 'Occupation is required',
                            validate: (value) =>
                              value.trim().length > 0 || 'Occupation is required'
                          })}
                        />
                      </div>
                    </div>

                    {applicationType === 'correction' && (
                      <div className="form-group">
                        <FieldLabel icon={FaIdCard}>{t('apply.existingNidNumber')}</FieldLabel>
                        <input
                          type="text"
                          readOnly={isApplicationFieldLocked('existingNidNumber')}
                          aria-readonly={isApplicationFieldLocked('existingNidNumber')}
                          className={`${getInputClass(!!errors.existingNidNumber)} ${isApplicationFieldLocked('existingNidNumber') ? 'locked-input' : ''
                            }`}
                          placeholder={t('apply.existingNidPlaceholder')}
                          {...register('existingNidNumber', {
                            required:
                              applicationType === 'correction'
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
                        <FieldLabel icon={FaFileAlt}>{t('apply.correctionReason')}</FieldLabel>
                        <textarea
                          rows={3}
                          className={getInputClass(!!errors.correctionReason)}
                          placeholder={t('apply.correctionReasonPlaceholder')}
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
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={nextStep}
                      disabled={!correctionEmailVerified}
                      title={
                        correctionEmailVerified
                          ? undefined
                          : 'Verify the changed email address to continue'
                      }
                    >
                      {t('apply.continue')}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {currentStep === 2 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaMapMarkerAlt /> {t('apply.step2Title')}
              </h2>
              <p className="step-description">
                {t('apply.step2Description')}
              </p>

              <div className="info-section">
                <h3>{t('apply.presentAddress')}</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.division')}</FieldLabel>
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
                      <option value="">{t('apply.selectDivision')}</option>
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
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.district')}</FieldLabel>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.district)}
                      {...register('presentAddress.district', {
                        required: 'Present address district is required'
                      })}
                    >
                      <option value="">{t('apply.selectDistrict')}</option>
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
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.upazila')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(!!errors.presentAddress?.upazila)}
                      placeholder={t('apply.enterUpazila')}
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
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.unionWard')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('apply.enterUnionWard')}
                      {...register('presentAddress.unionOrWard')}
                    />
                  </div>
                </div>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.villageArea')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('apply.enterVillageArea')}
                      {...register('presentAddress.villageOrArea')}
                    />
                  </div>

                  <div className="form-group">
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.postOffice')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('apply.enterPostOffice')}
                      {...register('presentAddress.postOffice')}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <FieldLabel icon={FaMapMarkerAlt}>{t('apply.postalCode')}</FieldLabel>
                  <input
                    type="text"
                    className={getInputClass(false)}
                    placeholder={t('apply.enterPostalCode')}
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
                  <span>{t('apply.sameAddress')}</span>
                </label>
              </div>

              {!sameAddress && (
                <div className="info-section">
                  <h3>{t('apply.permanentAddress')}</h3>

                  <div className="form-row grid gap-5 md:grid-cols-2">
                    <div className="form-group">
                      <FieldLabel icon={FaMapMarkerAlt}>{t('apply.division')}</FieldLabel>
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
                        <option value="">{t('apply.selectDivision')}</option>
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
                      <FieldLabel icon={FaMapMarkerAlt}>{t('apply.district')}</FieldLabel>
                      <select
                        className={getSelectClass(!!errors.permanentAddress?.district)}
                        {...register('permanentAddress.district', {
                          required: !sameAddress
                            ? 'Permanent address district is required'
                            : false
                        })}
                      >
                        <option value="">{t('apply.selectDistrict')}</option>
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
                      <FieldLabel icon={FaMapMarkerAlt}>{t('apply.upazila')}</FieldLabel>
                      <input
                        type="text"
                        className={getInputClass(!!errors.permanentAddress?.upazila)}
                        placeholder={t('apply.enterUpazila')}
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
                      <FieldLabel icon={FaMapMarkerAlt}>{t('apply.unionWard')}</FieldLabel>
                      <input
                        type="text"
                        className={getInputClass(false)}
                        placeholder={t('apply.enterUnionWard')}
                        {...register('permanentAddress.unionOrWard')}
                      />
                    </div>
                  </div>

                  <div className="form-row grid gap-5 md:grid-cols-2">
                    <div className="form-group">
                      <FieldLabel icon={FaMapMarkerAlt}>{t('apply.villageArea')}</FieldLabel>
                      <input
                        type="text"
                        className={getInputClass(false)}
                        placeholder={t('apply.enterVillageArea')}
                        {...register('permanentAddress.villageOrArea')}
                      />
                    </div>

                    <div className="form-group">
                      <FieldLabel icon={FaMapMarkerAlt}>{t('apply.postOffice')}</FieldLabel>
                      <input
                        type="text"
                        className={getInputClass(false)}
                        placeholder={t('apply.enterPostOffice')}
                        {...register('permanentAddress.postOffice')}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <FieldLabel icon={FaMapMarkerAlt}>{t('apply.postalCode')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('apply.enterPostalCode')}
                      {...register('permanentAddress.postalCode')}
                    />
                  </div>
                </div>
              )}

              <div className="info-section">
                <h3>{t('apply.fatherInfo')}</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <FieldLabel icon={FaUser}>{t('apply.fatherName')}</FieldLabel>
                    <input
                      type="text"
                      readOnly={isApplicationFieldLocked('fatherName')}
                      aria-readonly={isApplicationFieldLocked('fatherName')}
                      className={`${getInputClass(!!errors.fatherName)} ${isApplicationFieldLocked('fatherName') ? 'locked-input' : ''
                        }`}
                      placeholder={t('apply.enterFatherName')}
                      {...register('fatherName', {
                        required: "Father's name is required"
                      })}
                    />
                    {errors.fatherName && (
                      <span className="form-error">{errors.fatherName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <FieldLabel icon={FaIdCard}>{t('apply.fatherNidOptional')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(!!errors.fatherNID)}
                      placeholder={t('apply.nidPlaceholder')}
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
                <h3>{t('apply.motherInfo')}</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <FieldLabel icon={FaUser}>{t('apply.motherName')}</FieldLabel>
                    <input
                      type="text"
                      readOnly={isApplicationFieldLocked('motherName')}
                      aria-readonly={isApplicationFieldLocked('motherName')}
                      className={`${getInputClass(!!errors.motherName)} ${isApplicationFieldLocked('motherName') ? 'locked-input' : ''
                        }`}
                      placeholder={t('apply.enterMotherName')}
                      {...register('motherName', {
                        required: "Mother's name is required"
                      })}
                    />
                    {errors.motherName && (
                      <span className="form-error">{errors.motherName.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <FieldLabel icon={FaIdCard}>{t('apply.motherNidOptional')}</FieldLabel>
                    <input
                      type="text"
                      className={getInputClass(!!errors.motherNID)}
                      placeholder={t('apply.nidPlaceholder')}
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
                <h3>{t('apply.spouseInfo')}</h3>

                <div className="form-group">
                  <FieldLabel icon={FaUser}>{t('apply.spouseName')}</FieldLabel>
                  <input
                    type="text"
                    className={getInputClass(false)}
                    placeholder={t('apply.enterSpouseName')}
                    {...register('spouseName')}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={prevStep}>
                  {t('apply.previousButton')}
                </button>
                <button type="button" className="btn btn-primary" onClick={nextStep}>
                  {t('apply.continue')}
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaUpload /> {t('apply.step3Title')}
              </h2>
              <p className="step-description">
                {t('apply.step3Description')}
              </p>

              {applicationType === 'correction' ? (
                <div className="correction-photo-change-toggle">
                  <label className="register-checkbox-label flex items-start gap-3 text-sm text-[#374151]">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-[#D1D5DB] text-[#16A34A] focus:ring-[#16A34A]"
                      {...register('photoChangeRequested')}
                    />
                    <span>
                      <strong>{correctionCopy.requestPhotoChange}</strong>
                      <small>{correctionCopy.requestPhotoChangeHelp}</small>
                    </span>
                  </label>
                </div>
              ) : null}

              <div className="upload-section">
                {(applicationType === 'new' ||
                  (applicationType === 'correction' && photoChangeRequested)) && (
                    <div className="upload-card">
                      <div className="upload-header">
                        <FaCamera className="upload-icon" />
                        <div>
                          <h4>
                            {applicationType === 'correction'
                              ? correctionCopy.passportPhotoRequired
                              : t('apply.passportPhoto')}
                          </h4>
                          <p>
                            {applicationType === 'correction'
                              ? correctionCopy.passportPhotoHint
                              : t('apply.passportPhotoHint')}
                          </p>
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
                  )}

                {applicationType === 'new' && (
                  <div className="upload-card">
                    <div className="upload-header">
                      <FaSignature className="upload-icon" />
                      <div>
                        <h4>{t('apply.signature')}</h4>
                        <p>{t('apply.signatureHint')}</p>
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
                )}

                {applicationType === 'new' && (
                  <div className="upload-card">
                    <div className="upload-header">
                      <FaIdCard className="upload-icon" />
                      <div>
                        <h4>{t('apply.birthCertificate')}</h4>
                        <p>{t('apply.birthCertificateHint')}</p>
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
                        <h4>{correctionCopy.supportingDocumentsTitle}</h4>
                        <p>{correctionCopy.supportingDocumentsHint}</p>
                      </div>
                    </div>

                    <div
                      className="upload-area"
                      onClick={() => correctionProofInputRef.current?.click()}
                    >
                      {correctionProofPreviews.length > 0 ? (
                        <div className="correction-proof-list">
                          {correctionProofPreviews.map((fileName, index) => (
                            <div className="file-uploaded" key={`${fileName}-${index}`}>
                              <FaCheck className="success-icon" />
                              <span>{fileName}</span>
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeCorrectionProofSelection(index);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          {correctionProofPreviews.length < CORRECTION_SUPPORTING_DOCUMENT_MAX && (
                            <small className="correction-proof-add-more">
                              {correctionCopy.supportingDocumentsAddMore}
                            </small>
                          )}
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <FaUpload />
                          <span>{correctionCopy.supportingDocumentsPlaceholder}</span>
                          <small>{correctionCopy.supportingDocumentsSmall}</small>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={correctionProofInputRef}
                      accept="image/jpeg,image/png,application/pdf"
                      multiple
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
                  {applicationType === 'correction' ? (
                    <>
                      <li>{correctionCopy.supportingDocumentsHint}</li>
                      <li>{correctionCopy.requestPhotoChangeHelp}</li>
                      <li>{correctionCopy.noOcrOrFaceVerification}</li>
                    </>
                  ) : (
                    <>
                      <li>Passport-size photo and signature preview will work normally</li>
                      <li>{t('apply.faceVerificationNotePoint1')}</li>
                      <li>Required documents will be uploaded after the application is created</li>
                      <li>If any document upload fails after submission, the application will still be created and you can contact support</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={prevStep}>
                  {t('apply.previousButton')}
                </button>
                <button type="button" className="btn btn-primary" onClick={nextStep}>
                  {t('apply.reviewApplication')}
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaCheck /> {t('apply.step4Title')}
              </h2>
              <p className="step-description">
                Please review your application before submitting.
              </p>

              <div className="review-section">
                <div className="review-card">
                  <h4>{t('apply.applicationType')}</h4>
                  <p className="review-value">
                    {watch('applicationType')?.toUpperCase()} {t('apply.nidApplication')}
                  </p>
                </div>

                <div className="review-card">
                  <h4>{t('apply.personalInformation')}</h4>
                  <div className="review-grid">
                    <div className="review-item">
                      <label>{t('apply.fullNameEnglish').replace(' *', '')}</label>
                      <p>{watch('fullNameEnglish')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.fullNameBanglaReview')}</label>
                      <p>{watch('fullNameBangla') || t('apply.na')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.dobReview')}</label>
                      <p>{watch('dateOfBirth') || t('apply.na')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.gender').replace(' *', '')}</label>
                      <p>{watch('gender') || t('apply.na')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.phone')}</label>
                      <p>{watch('phone')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.email')}</label>
                      <p>{watch('email') || t('apply.na')}</p>
                    </div>
                  </div>
                </div>

                <div className="review-card">
                  <h4>{t('apply.addressInformation')}</h4>
                  <div className="review-grid">
                    <div className="review-item">
                      <label>{t('apply.presentAddress')}</label>
                      <p>
                        {watch('presentAddress.division')},{' '}
                        {watch('presentAddress.district')},{' '}
                        {watch('presentAddress.upazila')}
                      </p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.permanentAddress')}</label>
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
                  <h4>{t('apply.familyInformation')}</h4>
                  <div className="review-grid">
                    <div className="review-item">
                      <label>{t('apply.fatherNameReview')}</label>
                      <p>{watch('fatherName')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.motherNameReview')}</label>
                      <p>{watch('motherName')}</p>
                    </div>
                    <div className="review-item">
                      <label>{t('apply.spouseNameReview')}</label>
                      <p>{watch('spouseName') || t('apply.na')}</p>
                    </div>
                  </div>
                </div>

                <div className="review-card">
                  <h4>{t('apply.uploadedDocuments')}</h4>
                  <div className="documents-preview">
                    {(applicationType === 'new' ||
                      (applicationType === 'correction' && photoChangeRequested)) ? (
                      <div className="doc-item">
                        <span>
                          {applicationType === 'correction'
                            ? correctionCopy.passportPhotoRequired
                            : t('apply.passportPhoto')}
                        </span>
                        {photoPreview ? (
                          <img src={photoPreview} alt="Photo" className="doc-thumb" />
                        ) : (
                          <span className="doc-missing">Not uploaded</span>
                        )}
                      </div>
                    ) : applicationType === 'correction' ? (
                      <div className="doc-item">
                        <span>{correctionCopy.passportPhotoOptional}</span>
                        <span className="doc-missing">{correctionCopy.photoChangeNotRequested}</span>
                      </div>
                    ) : null}

                    {applicationType === 'new' && (
                      <div className="doc-item">
                        <span>{t('apply.signature').replace(' *', '')}</span>
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
                    )}

                    {applicationType === 'new' && (
                      <div className="doc-item">
                        <span>{t('apply.birthCertificate').replace(' *', '')}</span>
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
                        <span>{correctionCopy.supportingDocumentsTitle.replace(' *', '')}</span>
                        {correctionProofPreviews.length > 0 ? (
                          <span className="doc-uploaded">
                            <FaCheck /> {correctionProofPreviews.join(', ')}
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
                    {t('apply.mustAgree')}
                  </span>
                )}
              </div>

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
                  {t('apply.previousButton')}
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary btn-lg ${isSubmitBlockedByActiveApplication || isSubmitBlockedByDeliveredNewNid
                      ? 'submit-disabled-by-active-application'
                      : ''
                    }`}
                  disabled={
                    isSubmitting ||
                    isSubmitBlockedByNewNidEligibility ||
                    isSubmitBlockedByActiveApplication ||
                    isSubmitBlockedByDeliveredNewNid
                  }
                  title={
                    isSubmitting
                      ? submitLockReason
                      : isSubmitBlockedByNewNidEligibility ||
                        isSubmitBlockedByActiveApplication ||
                        isSubmitBlockedByDeliveredNewNid
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

        <EmailVerificationModal
          open={emailVerification.modalOpen}
          email={emailVerification.targetEmail}
          verifying={emailVerification.isVerifyingOtp}
          resending={emailVerification.isResending}
          onVerify={emailVerification.verifyOtp}
          onResend={emailVerification.resendOtp}
          onClose={emailVerification.closeModal}
        />
      </div>
    </div>
  );
};

export default ApplicationForm;
