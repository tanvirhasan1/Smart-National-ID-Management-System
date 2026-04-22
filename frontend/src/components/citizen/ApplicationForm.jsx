import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUser,
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
  FaVenusMars
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { bangladeshLocations } from '../utils/helpers';
import api from '../api/axios';
import {
  uploadCitizenApplicationDocument,
  getCitizenDocumentLabel
} from '../../services/applicationDocumentService';
import '../styles/ApplicationForm.css';

const ApplicationForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [birthCertPreview, setBirthCertPreview] = useState(null);
  const [sameAddress, setSameAddress] = useState(false);
  const [selectedPresentDivision, setSelectedPresentDivision] = useState('');
  const [selectedPermanentDivision, setSelectedPermanentDivision] = useState('');
  const [selectedFiles, setSelectedFiles] = useState({
    photograph: null,
    signature: null,
    birthCertificate: null
  });

  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const birthCertInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors }
  } = useForm({
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
        setValue(
          'birthRegistrationNumber',
          prefill.birthRegistrationNumber || ''
        );
        setValue('phone', prefill.phone || '');
        setValue('email', prefill.email || '');

        setValue(
          'presentAddress.division',
          prefill.presentAddress?.division || ''
        );
        setValue(
          'presentAddress.district',
          prefill.presentAddress?.district || ''
        );
        setValue(
          'presentAddress.upazila',
          prefill.presentAddress?.upazila || ''
        );
        setValue(
          'presentAddress.unionOrWard',
          prefill.presentAddress?.unionOrWard || ''
        );
        setValue(
          'presentAddress.villageOrArea',
          prefill.presentAddress?.villageOrArea || ''
        );
        setValue(
          'presentAddress.postOffice',
          prefill.presentAddress?.postOffice || ''
        );
        setValue(
          'presentAddress.postalCode',
          prefill.presentAddress?.postalCode || ''
        );

        setValue(
          'permanentAddress.division',
          prefill.permanentAddress?.division || ''
        );
        setValue(
          'permanentAddress.district',
          prefill.permanentAddress?.district || ''
        );
        setValue(
          'permanentAddress.upazila',
          prefill.permanentAddress?.upazila || ''
        );
        setValue(
          'permanentAddress.unionOrWard',
          prefill.permanentAddress?.unionOrWard || ''
        );
        setValue(
          'permanentAddress.villageOrArea',
          prefill.permanentAddress?.villageOrArea || ''
        );
        setValue(
          'permanentAddress.postOffice',
          prefill.permanentAddress?.postOffice || ''
        );
        setValue(
          'permanentAddress.postalCode',
          prefill.permanentAddress?.postalCode || ''
        );

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
      toast.error('Photo size must be less than 2MB');
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
        file: selectedFiles.birthCertificate
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

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const onSubmit = async (data) => {
    if (!selectedFiles.photograph || !photoPreview) {
      toast.error('Please upload your photograph');
      setCurrentStep(3);
      return;
    }

    if (!selectedFiles.signature || !signaturePreview) {
      toast.error('Please upload your signature');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);

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
          birthCertificate: selectedFiles.birthCertificate?.name || '',
          fatherNid: data.fatherNID || '',
          motherNid: data.motherNID || '',
          photo: selectedFiles.photograph?.name || '',
          signature: selectedFiles.signature?.name || ''
        }
      };

      const response = await api.post('/applications', payload);
      const createdApplication = response?.data?.application;
      const createdApplicationId = createdApplication?._id;

      if (!createdApplicationId) {
        throw new Error('Application created but no application id was returned');
      }

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
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.msg ||
          error?.message ||
          'Failed to create application'
      );
    } finally {
      setIsSubmitting(false);
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
        >
          {currentStep === 1 && (
            <div className="form-step application-step-panel">
              <h2 className="step-title">
                <FaIdCard /> Application & Personal Information
              </h2>
              <p className="step-description">
                Select application type and provide your core information.
              </p>

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
                  }`}
                >
                  <input
                    type="radio"
                    value="correction"
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
                  }`}
                >
                  <input type="radio" value="reissue" {...register('applicationType')} />
                  <div className="type-content">
                    <div className="type-icon renewal-icon">
                      <FaIdCard />
                    </div>
                    <h4>Reissue</h4>
                    <p>Reissue lost or damaged NID</p>
                  </div>
                </label>
              </div>

              <div className="info-section">
                <h3>Applicant Information</h3>

                <div className="form-row grid gap-5 md:grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Full Name (English) *</label>
                    <input
                      type="text"
                      readOnly={applicationType === 'new'}
                      className={`input-field ${
                        applicationType === 'new' ? 'locked-input' : ''
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
                      readOnly={applicationType === 'new'}
                      className={`input-field ${
                        applicationType === 'new' ? 'locked-input' : ''
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
                      readOnly={applicationType === 'new'}
                      className={`input-field ${
                        applicationType === 'new' ? 'locked-input' : ''
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
                      disabled={applicationType === 'new'}
                      className={`input-field ${
                        applicationType === 'new' ? 'locked-input' : ''
                      }`}
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
                      readOnly={applicationType === 'new'}
                      className={`input-field ${
                        applicationType === 'new' ? 'locked-input' : ''
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
                    <label className="form-label">Blood Group</label>
                    <select className={getSelectClass(false)} {...register('bloodGroup')}>
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
                        Occupation
                      </span>
                    </label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Enter your occupation"
                      {...register('occupation')}
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
                      onChange={(e) => setSelectedPresentDivision(e.target.value)}
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
                        onChange={(e) => setSelectedPermanentDivision(e.target.value)}
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
                      <h4>Photograph *</h4>
                      <p>Recent passport size photo with white background</p>
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
                        <span>Click to upload photo</span>
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

                <div className="upload-card">
                  <div className="upload-header">
                    <FaIdCard className="upload-icon" />
                    <div>
                      <h4>Birth Certificate (Optional)</h4>
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
              </div>

              <div className="upload-guidelines">
                <h4>
                  <FaExclamationTriangle /> Important Note
                </h4>
                <ul>
                  <li>Photo and signature preview will work normally</li>
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
                      <span>Photograph</span>
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

                    <div className="doc-item">
                      <span>Birth Certificate</span>
                      {birthCertPreview ? (
                        <span className="doc-uploaded">
                          <FaCheck /> {birthCertPreview}
                        </span>
                      ) : (
                        <span className="doc-optional">Not provided</span>
                      )}
                    </div>
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

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={prevStep}>
                  ← Previous
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <FaSpinner className="spinner" /> Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;