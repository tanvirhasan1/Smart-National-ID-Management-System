// Profile Page Start
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaFileAlt,
  FaIdCard,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaPhone,
  FaSave,
  FaSpinner,
  FaUser,
  FaUserCheck
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import EmailVerificationModal from '../common/EmailVerificationModal';
import useEmailVerification, { normalizeVerificationEmail } from '../common/useEmailVerification';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import '../styles/Profile.css';

const ISSUE_READY_STATUSES = ['printed', 'dispatched', 'delivered'];

const normalizeKey = (value = '') =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');

const getProfilePayload = (response) => response?.data?.user || response?.data || null;

const normalizeListResponse = (response, keys = []) => {
  const payload = response?.data || {};
  const dataPayload = payload?.data || {};

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
    if (Array.isArray(dataPayload?.[key])) {
      return dataPayload[key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const sortByLatest = (items = []) =>
  [...items].sort((first, second) => {
    const firstDate = new Date(
      first?.updatedAt || first?.createdAt || first?.submittedAt || first?.applicationDate || 0
    ).getTime();
    const secondDate = new Date(
      second?.updatedAt || second?.createdAt || second?.submittedAt || second?.applicationDate || 0
    ).getTime();

    return secondDate - firstDate;
  });

const getInitials = (name = '') => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'U';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getOfficialPhotoUrl = (application = {}) => {
  const assets = application?.documentAssets || {};
  const docs = application?.documents || {};
  const photograph = assets?.photograph || {};
  const cloudinary = photograph?.cloudinary || {};
  const current = photograph?.current || {};

  return (
    current?.secureUrl ||
    current?.url ||
    current?.path ||
    cloudinary?.secureUrl ||
    cloudinary?.url ||
    photograph?.secureUrl ||
    photograph?.url ||
    photograph?.path ||
    assets?.applicantPhoto?.current?.secureUrl ||
    assets?.applicantPhoto?.current?.url ||
    assets?.photo?.current?.secureUrl ||
    assets?.photo?.current?.url ||
    docs?.photograph?.secureUrl ||
    docs?.photograph?.url ||
    docs?.applicantPhoto?.secureUrl ||
    docs?.applicantPhoto?.url ||
    docs?.photo?.secureUrl ||
    docs?.photo?.url ||
    docs?.photo ||
    application?.photoUrl ||
    application?.photo ||
    ''
  );
};

const getFirstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return '';
};

const getAddressParts = (address = {}) => {
  if (!address) {
    return [];
  }

  if (typeof address === 'string') {
    return address.trim() ? [address.trim()] : [];
  }

  return [
    address.villageOrArea || address.village || address.addressLine,
    address.unionOrWard || address.union,
    address.postOffice,
    address.upazila || address.thana,
    address.district,
    address.division
  ].filter(Boolean);
};

const Profile = () => {
  const { user, setUser } = useAuth();
  const { language, getTranslation } = useLanguage();
  const copy = getTranslation('profilePage');

  const [profileLoading, setProfileLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [applicationPrefill, setApplicationPrefill] = useState(null);
  const [applications, setApplications] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    trigger,
    formState: { errors, isDirty }
  } = useForm({
    defaultValues: {
      email: '',
      phone: ''
    }
  });

  const emailVerification = useEmailVerification({
    purpose: 'profile_email_change',
    recipientName: profileData?.fullName || user?.fullName || ''
  });
  const currentEmailValue = watch('email');
  const profileEmailChanged =
    Boolean(profileData) &&
    normalizeVerificationEmail(currentEmailValue) !==
      normalizeVerificationEmail(profileData?.email);
  const profileEmailVerified =
    !profileEmailChanged || emailVerification.isVerified(currentEmailValue);

  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';

  const formatDateTime = useCallback(
    (value, options = {}) => {
      if (!value) {
        return copy.na;
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return String(value);
      }

      return new Intl.DateTimeFormat(locale, {
        dateStyle: options.dateStyle || 'medium',
        ...(options.withTime ? { timeStyle: 'short' } : {})
      }).format(date);
    },
    [copy.na, locale]
  );

  const getLabel = useCallback(
    (group, value, fallback) => {
      const key = normalizeKey(value);
      return copy?.[group]?.[key] || fallback || value || copy.na;
    },
    [copy]
  );

  const fetchProfileBundle = useCallback(
    async () => {
      try {
        setProfileLoading(true);

        const profileResponse = await api.get('/users/profile');
        const currentProfile = getProfilePayload(profileResponse);
        const normalizedProfile = currentProfile || user || null;
        const isCitizen = normalizeKey(normalizedProfile?.role || user?.role) === 'citizen';

        setProfileData(normalizedProfile);
        reset({
          email: normalizedProfile?.email || '',
          phone: normalizedProfile?.phone || ''
        });

        if (!isCitizen) {
          setApplications([]);
          setApplicationPrefill(null);
          return;
        }

        const [applicationsResult, prefillResult] = await Promise.allSettled([
          api.get('/applications/my'),
          api.get('/applications/prefill')
        ]);

        setApplications(
          applicationsResult.status === 'fulfilled'
            ? normalizeListResponse(applicationsResult.value, ['applications'])
            : []
        );

        setApplicationPrefill(
          prefillResult.status === 'fulfilled'
            ? prefillResult.value?.data?.prefill || prefillResult.value?.data?.data?.prefill || null
            : null
        );
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error(error?.response?.data?.message || copy.loadFailed);
      } finally {
        setProfileLoading(false);
      }
    },
    [copy.loadFailed, reset, user]
  );

  useEffect(() => {
    fetchProfileBundle();
  }, [fetchProfileBundle]);

  const derived = useMemo(() => {
    const sortedApplications = sortByLatest(applications || []);
    const latestApplication = sortedApplications[0] || null;
    const issuedApplication =
      sortedApplications.find(
        (application) =>
          ISSUE_READY_STATUSES.includes(normalizeKey(application?.status)) && application?.nidNumber
      ) ||
      sortedApplications.find((application) => application?.nidNumber) ||
      null;

    const currentNidNumber =
      issuedApplication?.nidNumber ||
      latestApplication?.nidNumber ||
      latestApplication?.existingNidNumber ||
      null;

    return {
      latestApplication,
      issuedApplication,
      currentNidNumber,
      officialApplication: issuedApplication || latestApplication || {}
    };
  }, [applications]);

  const displayName =
    language === 'bn'
      ? profileData?.fullNameBangla ||
        applicationPrefill?.fullNameBangla ||
        profileData?.fullName ||
        applicationPrefill?.fullNameEnglish ||
        user?.fullNameBangla ||
        user?.fullName
      : profileData?.fullName ||
        applicationPrefill?.fullNameEnglish ||
        user?.fullName ||
        profileData?.fullNameBangla ||
        applicationPrefill?.fullNameBangla ||
        user?.fullNameBangla;

  const roleLabel = getLabel('roleLabels', profileData?.role || user?.role || 'citizen');
  const officialPhotoUrl = derived.issuedApplication
    ? getOfficialPhotoUrl(derived.issuedApplication)
    : '';
  const addressText = getAddressParts(
    derived.officialApplication?.presentAddress || applicationPrefill?.presentAddress || profileData?.presentAddress || {}
  ).join(', ');

  const permanentAddressText = getAddressParts(
    derived.officialApplication?.permanentAddress || applicationPrefill?.permanentAddress || profileData?.permanentAddress || {}
  ).join(', ');

  const accountLockedFields = [
    {
      icon: <FaUser />,
      label: copy.form.fullName,
      value: displayName || copy.na
    },
    {
      icon: <FaCalendarAlt />,
      label: copy.sidebar.joined,
      value: formatDateTime(profileData?.createdAt)
    }
  ];

  const officialLockedFields = [
    {
      icon: <FaIdCard />,
      label: copy.official.nidNumber,
      value: derived.currentNidNumber || copy.notIssuedYet
    },
    {
      icon: <FaFileAlt />,
      label: copy.official.birthRegistrationNumber,
      value: getFirstValue(
        derived.officialApplication?.birthRegistrationNumber,
        applicationPrefill?.birthRegistrationNumber,
        profileData?.birthRegistrationNumber,
        profileData?.birthRegNumber,
        copy.na
      )
    },
    {
      icon: <FaCalendarAlt />,
      label: copy.official.dateOfBirth,
      value: formatDateTime(
        getFirstValue(
          derived.officialApplication?.dateOfBirth,
          applicationPrefill?.dateOfBirth,
          profileData?.dateOfBirth
        )
      )
    },
    {
      icon: <FaUser />,
      label: copy.official.fatherName || "Father's Name",
      value: getFirstValue(
        derived.officialApplication?.fatherName,
        applicationPrefill?.fatherName,
        profileData?.fatherName,
        copy.na
      )
    },
    {
      icon: <FaUser />,
      label: copy.official.motherName || "Mother's Name",
      value: getFirstValue(
        derived.officialApplication?.motherName,
        applicationPrefill?.motherName,
        profileData?.motherName,
        copy.na
      )
    },
    {
      icon: <FaMapMarkerAlt />,
      label: copy.official.placeOfBirth || (language === 'bn' ? 'জন্মস্থান' : 'Place of Birth'),
      value: getFirstValue(
        derived.officialApplication?.placeOfBirth,
        applicationPrefill?.placeOfBirth,
        profileData?.placeOfBirth,
        copy.na
      )
    },
    {
      icon: <FaUserCheck />,
      label: copy.official.gender,
      value: getLabel(
        'genderLabels',
        getFirstValue(
          derived.officialApplication?.gender,
          applicationPrefill?.gender,
          profileData?.gender
        ),
        copy.na
      )
    },
    {
      icon: <FaInfoCircle />,
      label: copy.official.bloodGroup,
      value: getFirstValue(
        derived.officialApplication?.bloodGroup,
        applicationPrefill?.bloodGroup,
        profileData?.bloodGroup,
        copy.na
      )
    },
    ...(derived.latestApplication?.applicationId
      ? [
          {
            icon: <FaFileAlt />,
            label: copy.official.applicationId,
            value: derived.latestApplication.applicationId
          }
        ]
      : [])
  ];

  const onSubmit = async (formData) => {
    const submittedEmail = normalizeVerificationEmail(formData.email);
    const emailChanged =
      submittedEmail !== normalizeVerificationEmail(profileData?.email);

    if (emailChanged && !emailVerification.isVerified(submittedEmail)) {
      toast.error('Please verify the changed email address before saving.');
      return;
    }

    setSaveLoading(true);

    try {
      const payload = {
        email: formData.email?.trim(),
        phone: formData.phone?.trim(),
        ...(emailChanged
          ? { emailVerificationToken: emailVerification.getProofToken(submittedEmail) }
          : {})
      };

      const response = await api.put('/users/profile', payload);
      const updatedUser = getProfilePayload(response);
      const nextProfile = updatedUser || { ...profileData, ...payload };

      setProfileData(nextProfile);
      reset({
        email: nextProfile?.email || '',
        phone: nextProfile?.phone || ''
      });

      if (setUser) {
        setUser(nextProfile);
      }

      emailVerification.reset();
      toast.success(copy.updateSuccess);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.msg ||
          copy.updateFailed
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleVerifyProfileEmail = async () => {
    const valid = await trigger('email', { shouldFocus: true });
    if (!valid) return;

    await emailVerification.startVerification(
      currentEmailValue,
      displayName || profileData?.fullName || user?.fullName || ''
    );
  };

  const getInputClass = (hasError = false) =>
    `profile-form-input w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${
      hasError
        ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10'
        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const lockedInputClass =
    'profile-form-input w-full cursor-not-allowed rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-[15px] font-medium text-[#4B5563] outline-none';

  if (profileLoading) {
    return (
      <div className="profile-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text={copy.loading} />
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper min-h-[calc(100vh-140px)] bg-[#F8FAFC] px-4 py-8">
      <div className="profile-page-shell mx-auto w-full max-w-[1180px]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.06)] lg:p-8"
        >
          <div className="mb-8 border-b border-[#E5E7EB] pb-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#16A34A_0%,#047857_100%)] text-3xl font-bold text-white shadow-[0_16px_35px_rgba(22,163,74,0.25)]">
                  {officialPhotoUrl ? (
                    <img
                      src={officialPhotoUrl}
                      alt={displayName || copy.citizenUser}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {displayName ? getInitials(displayName) : <FaUser />}
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="profile-page-title text-[2rem] font-bold leading-tight text-[#111827] md:text-[2.35rem]">
                    {displayName || copy.citizenUser}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#6B7280]">
                    <span className="inline-flex items-center gap-2">
                      <FaEnvelope className="text-[#16A34A]" />
                      {profileData?.email || copy.na}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <FaIdCard className="text-[#16A34A]" />
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>


            </div>
          </div>

          <div className="space-y-8">
            <section>
              <div className="grid gap-5 md:grid-cols-2">
                {accountLockedFields.map((field) => (
                  <div key={field.label}>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                      <span className="text-[#16A34A]">{field.icon}</span>
                      <span>{field.label}</span>
                    </label>
                    <input
                      type="text"
                      value={field.value}
                      disabled
                      readOnly
                      className={lockedInputClass}
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaEnvelope className="text-[#16A34A]" />
                    <span>{copy.form.email}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className={`${getInputClass(!!errors.email)} ${
                        profileEmailChanged ? 'pr-[108px]' : ''
                      }`}
                      placeholder={copy.form.emailPlaceholder}
                      {...register('email', {
                        pattern: {
                          value: /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i,
                          message: copy.form.emailInvalid
                        }
                      })}
                    />
                    {profileEmailChanged ? (
                      profileEmailVerified ? (
                        <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-xs font-semibold text-emerald-700">
                          <FaCheckCircle /> Verified
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleVerifyProfileEmail}
                          disabled={emailVerification.isStarting}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {emailVerification.isStarting ? 'Checking...' : 'Verify'}
                        </button>
                      )
                    ) : null}
                  </div>
                  {errors.email && (
                    <span className="mt-2 block text-sm text-red-600">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaPhone className="text-[#16A34A]" />
                    <span>{copy.form.phone}</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.phone)}
                    placeholder={copy.form.phonePlaceholder}
                    {...register('phone', {
                      required: copy.form.phoneRequired,
                      pattern: {
                        value: /^01[0-9]{9}$/,
                        message: copy.form.phoneInvalid
                      }
                    })}
                  />
                  {errors.phone && (
                    <span className="mt-2 block text-sm text-red-600">
                      {errors.phone.message}
                    </span>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-[#111827]">
                <FaIdCard className="text-[#16A34A]" />
                <span>{copy.official.informationTitle || copy.official.title}</span>
              </h3>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {officialLockedFields.map((field) => (
                  <div key={field.label}>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                      <span className="text-[#16A34A]">{field.icon}</span>
                      <span>{field.label}</span>
                    </label>
                    <input
                      type="text"
                      value={field.value}
                      disabled
                      readOnly
                      className={lockedInputClass}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaMapMarkerAlt className="text-[#16A34A]" />
                    <span>{copy.official.presentAddress}</span>
                  </label>
                  <textarea
                    value={addressText || copy.na}
                    disabled
                    readOnly
                    rows={3}
                    className={`${lockedInputClass} min-h-[96px] resize-none`}
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaMapMarkerAlt className="text-[#16A34A]" />
                    <span>{copy.official.permanentAddress || 'Permanent Address'}</span>
                  </label>
                  <textarea
                    value={permanentAddressText || copy.na}
                    disabled
                    readOnly
                    rows={3}
                    className={`${lockedInputClass} min-h-[96px] resize-none`}
                  />
                </div>
              </div>
            </section>
            <div className="flex flex-col gap-3 border-t border-[#E5E7EB] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#6B7280]">
                {isDirty ? copy.unsavedChanges : copy.noUnsavedChanges}
              </p>
              <button
                type="submit"
                disabled={saveLoading || !isDirty || !profileEmailVerified}
                title={
                  profileEmailVerified
                    ? undefined
                    : 'Verify the changed email address to save changes'
                }
                className="profile-save-button inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>{copy.saving}</span>
                  </>
                ) : (
                  <>
                    <FaSave />
                    <span>{copy.saveChanges}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

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
  );
};

export default Profile;
// Profile Page End
