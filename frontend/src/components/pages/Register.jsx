import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCalendar,
  FaMapMarkerAlt,
  FaVenusMars
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { bangladeshLocations } from '../utils/helpers';
import '../styles/Auth.css';

const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPresentDivision, setSelectedPresentDivision] = useState('');
  const [selectedPermanentDivision, setSelectedPermanentDivision] = useState('');
  const [sameAddress, setSameAddress] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm();

  const password = watch('password');

  const getInputClass = (hasError = false) =>
    `register-form-input form-input w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${
      hasError
        ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const getSelectClass = (hasError = false) =>
    `register-form-select form-select w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:ring-4 ${
      hasError
        ? 'error border-red-600 focus:border-red-600 focus:ring-red-600/10'
        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  const getStepClass = (stepNumber) => {
    const isActive = currentStep >= stepNumber;
    const isCompleted = currentStep > stepNumber;

    return `register-step-item flex flex-1 items-center gap-3 rounded-xl border px-3 py-3 transition ${
      isActive ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-[#E5E7EB] bg-white'
    } ${isCompleted ? 'register-step-completed' : ''}`;
  };

  const handleSameAddress = (e) => {
    setSameAddress(e.target.checked);

    if (e.target.checked) {
      const presentAddress = watch('presentAddress');
      setValue('permanentAddress', presentAddress);
      setSelectedPermanentDivision(selectedPresentDivision);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const formattedData = {
        fullName: data.fullName,
        fullNameBangla: data.fullNameBangla,
        birthRegNumber: data.birthRegNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        placeOfBirth: data.placeOfBirth,
        mobile: data.mobile,
        email: data.email || undefined,
        password: data.password,
        presentAddress: {
          division: data.presentAddress.division,
          district: data.presentAddress.district,
          upazila: data.presentAddress.upazila,
          union: data.presentAddress.union || '',
          village: data.presentAddress.village || '',
          postCode: data.presentAddress.postCode || ''
        },
        permanentAddress: sameAddress
          ? {
              division: data.presentAddress.division,
              district: data.presentAddress.district,
              upazila: data.presentAddress.upazila,
              union: data.presentAddress.union || '',
              village: data.presentAddress.village || '',
              postCode: data.presentAddress.postCode || ''
            }
          : {
              division: data.permanentAddress.division,
              district: data.permanentAddress.district,
              upazila: data.permanentAddress.upazila,
              union: data.permanentAddress.union || '',
              village: data.permanentAddress.village || '',
              postCode: data.permanentAddress.postCode || ''
            }
      };

      const result = await registerUser(formattedData);
      const verificationToken =
        result?.verificationToken || result?.data?.verificationToken;

      if (!verificationToken) {
        throw new Error('Verification token not found. Please try again.');
      }

      toast.success('Registration successful! Please verify your mobile number.');

      navigate('/verify-otp', {
        state: {
          phone: data.mobile,
          mobile: data.mobile,
          verificationToken
        }
      });
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="register-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8 flex items-center justify-center">
      <div className="register-container w-full max-w-[860px]">
        <div className="register-card-panel rounded-2xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.1)] sm:p-8 lg:p-10">
          <div className="register-header-block mb-8 text-center">
            <div className="register-logo-wrap mb-4 flex justify-center">
              <img
                src="https://i.ibb.co.com/99gnCXfN/logo.png"
                alt="Logo"
                className="register-brand-logo h-[60px] w-auto object-contain"
              />
            </div>

            <h1 className="register-title-text mb-2 text-[1.75rem] font-bold text-[#1F2937]">
              Create Account
            </h1>

            <p className="register-subtitle-text text-[0.95rem] text-[#6B7280]">
              Register for Smart NID services
            </p>
          </div>

          <div className="register-steps-wrap mb-8 grid gap-3 sm:grid-cols-3">
            <div className={getStepClass(1)}>
              <span className="register-step-number flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-sm font-semibold text-white">
                1
              </span>
              <span className="register-step-label text-sm font-medium text-[#374151]">
                Personal Info
              </span>
            </div>

            <div className={getStepClass(2)}>
              <span className="register-step-number flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-sm font-semibold text-white">
                2
              </span>
              <span className="register-step-label text-sm font-medium text-[#374151]">
                Address
              </span>
            </div>

            <div className={getStepClass(3)}>
              <span className="register-step-number flex h-9 w-9 items-center justify-center rounded-full bg-[#16A34A] text-sm font-semibold text-white">
                3
              </span>
              <span className="register-step-label text-sm font-medium text-[#374151]">
                Security
              </span>
            </div>
          </div>

          <form className="register-form-wrapper space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {currentStep === 1 && (
              <div className="register-step-panel space-y-5">
                <h3 className="register-step-title text-lg font-semibold text-[#1F2937]">
                  Personal Information
                </h3>

                <div className="register-form-group">
                  <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaUser className="text-[#16A34A]" />
                    <span>Full Name (English) *</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.fullName)}
                    placeholder="Enter your full name"
                    {...register('fullName', {
                      required: 'Full name is required',
                      minLength: {
                        value: 3,
                        message: 'Name must be at least 3 characters'
                      }
                    })}
                  />
                  {errors.fullName && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.fullName.message}
                    </span>
                  )}
                </div>

                <div className="register-form-group">
                  <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaUser className="text-[#16A34A]" />
                    <span>Full Name (বাংলা) *</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.fullNameBangla)}
                    placeholder="আপনার পুরো নাম লিখুন"
                    {...register('fullNameBangla', {
                      required: 'Bangla name is required'
                    })}
                  />
                  {errors.fullNameBangla && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.fullNameBangla.message}
                    </span>
                  )}
                </div>

                <div className="register-form-group">
                  <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaIdCard className="text-[#16A34A]" />
                    <span>Birth Registration Number *</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.birthRegNumber)}
                    placeholder="17-digit Birth Registration Number"
                    {...register('birthRegNumber', {
                      required: 'Birth registration number is required',
                      pattern: {
                        value: /^[0-9]{17}$/,
                        message: 'Enter a valid 17-digit Birth Registration Number'
                      }
                    })}
                  />
                  {errors.birthRegNumber && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.birthRegNumber.message}
                    </span>
                  )}
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                      <FaCalendar className="text-[#16A34A]" />
                      <span>Date of Birth *</span>
                    </label>
                    <input
                      type="date"
                      className={getInputClass(!!errors.dateOfBirth)}
                      {...register('dateOfBirth', {
                        required: 'Date of birth is required'
                      })}
                    />
                    {errors.dateOfBirth && (
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.dateOfBirth.message}
                      </span>
                    )}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                      <FaVenusMars className="text-[#16A34A]" />
                      <span>Gender *</span>
                    </label>
                    <select
                      className={getSelectClass(!!errors.gender)}
                      {...register('gender', {
                        required: 'Gender is required'
                      })}
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && (
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.gender.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="register-form-group">
                  <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaMapMarkerAlt className="text-[#16A34A]" />
                    <span>Place of Birth *</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.placeOfBirth)}
                    placeholder="District/City of birth"
                    {...register('placeOfBirth', {
                      required: 'Place of birth is required'
                    })}
                  />
                  {errors.placeOfBirth && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.placeOfBirth.message}
                    </span>
                  )}
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                      <FaPhone className="text-[#16A34A]" />
                      <span>Mobile Number *</span>
                    </label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.mobile)}
                      placeholder="01XXXXXXXXX"
                      {...register('mobile', {
                        required: 'Mobile number is required',
                        pattern: {
                          value: /^01[0-9]{9}$/,
                          message: 'Enter a valid Bangladeshi mobile number'
                        }
                      })}
                    />
                    {errors.mobile && (
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.mobile.message}
                      </span>
                    )}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                      <FaEnvelope className="text-[#16A34A]" />
                      <span>Email (Optional)</span>
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
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.email.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="register-actions-row flex justify-end">
                  <button
                    type="button"
                    className="register-next-button inline-flex items-center justify-center rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                    onClick={nextStep}
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="register-step-panel space-y-5">
                <h3 className="register-step-title text-lg font-semibold text-[#1F2937]">
                  Present Address
                </h3>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                      Division *
                    </label>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.division)}
                      {...register('presentAddress.division', {
                        required: 'Division is required'
                      })}
                      onChange={(e) => setSelectedPresentDivision(e.target.value)}
                    >
                      <option value="">Select Division</option>
                      {bangladeshLocations.divisions.map((div) => (
                        <option key={div} value={div}>
                          {div}
                        </option>
                      ))}
                    </select>
                    {errors.presentAddress?.division && (
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.presentAddress.division.message}
                      </span>
                    )}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                      District *
                    </label>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.district)}
                      {...register('presentAddress.district', {
                        required: 'District is required'
                      })}
                    >
                      <option value="">Select District</option>
                      {selectedPresentDivision &&
                        bangladeshLocations.districts[selectedPresentDivision]?.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                    </select>
                    {errors.presentAddress?.district && (
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.presentAddress.district.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                      Upazila/Thana *
                    </label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.presentAddress?.upazila)}
                      placeholder="Enter Upazila/Thana"
                      {...register('presentAddress.upazila', {
                        required: 'Upazila is required'
                      })}
                    />
                    {errors.presentAddress?.upazila && (
                      <span className="register-form-error mt-2 block text-sm text-red-600">
                        {errors.presentAddress.upazila.message}
                      </span>
                    )}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                      Post Code
                    </label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Post Code"
                      {...register('presentAddress.postCode')}
                    />
                  </div>
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                      Union/Ward
                    </label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Union/Ward Name"
                      {...register('presentAddress.union')}
                    />
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                      Village/House
                    </label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder="Village/House/Road"
                      {...register('presentAddress.village')}
                    />
                  </div>
                </div>

                <div className="register-checkbox-group rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
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
                  <div className="register-permanent-address-block space-y-5">
                    <h3 className="register-step-title text-lg font-semibold text-[#1F2937]">
                      Permanent Address
                    </h3>

                    <div className="register-form-row grid gap-5 md:grid-cols-2">
                      <div className="register-form-group">
                        <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                          Division *
                        </label>
                        <select
                          className={getSelectClass(!!errors.permanentAddress?.division)}
                          {...register('permanentAddress.division', {
                            required: !sameAddress ? 'Division is required' : false
                          })}
                          onChange={(e) => setSelectedPermanentDivision(e.target.value)}
                        >
                          <option value="">Select Division</option>
                          {bangladeshLocations.divisions.map((div) => (
                            <option key={div} value={div}>
                              {div}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="register-form-group">
                        <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                          District *
                        </label>
                        <select
                          className={getSelectClass(!!errors.permanentAddress?.district)}
                          {...register('permanentAddress.district', {
                            required: !sameAddress ? 'District is required' : false
                          })}
                        >
                          <option value="">Select District</option>
                          {selectedPermanentDivision &&
                            bangladeshLocations.districts[selectedPermanentDivision]?.map((dist) => (
                              <option key={dist} value={dist}>
                                {dist}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="register-form-row grid gap-5 md:grid-cols-2">
                      <div className="register-form-group">
                        <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                          Upazila/Thana *
                        </label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder="Enter Upazila/Thana"
                          {...register('permanentAddress.upazila', {
                            required: !sameAddress ? 'Upazila is required' : false
                          })}
                        />
                      </div>

                      <div className="register-form-group">
                        <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                          Post Code
                        </label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder="Post Code"
                          {...register('permanentAddress.postCode')}
                        />
                      </div>
                    </div>

                    <div className="register-form-row grid gap-5 md:grid-cols-2">
                      <div className="register-form-group">
                        <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                          Union/Ward
                        </label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder="Union/Ward Name"
                          {...register('permanentAddress.union')}
                        />
                      </div>

                      <div className="register-form-group">
                        <label className="register-form-label mb-2 block text-sm font-medium text-[#374151]">
                          Village/House
                        </label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder="Village/House/Road"
                          {...register('permanentAddress.village')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="register-actions-row flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    className="register-prev-button inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-6 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                    onClick={prevStep}
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    className="register-next-button inline-flex items-center justify-center rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                    onClick={nextStep}
                  >
                    Next Step →
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="register-step-panel space-y-5">
                <h3 className="register-step-title text-lg font-semibold text-[#1F2937]">
                  Create Password
                </h3>

                <div className="register-form-group">
                  <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaLock className="text-[#16A34A]" />
                    <span>Password *</span>
                  </label>

                  <div className="register-password-field relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${getInputClass(!!errors.password)} pr-12`}
                      placeholder="Create a strong password"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                          message: 'Password must contain uppercase, lowercase and number'
                        }
                      })}
                    />
                    <button
                      type="button"
                      className="register-password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#16A34A]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {errors.password && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.password.message}
                    </span>
                  )}

                  <div className="register-password-hints mt-3 rounded-xl bg-[#F9FAFB] px-4 py-3 text-sm text-[#6B7280]">
                    <span className="mb-2 block font-medium text-[#374151]">
                      Password must contain:
                    </span>
                    <ul className="list-inside list-disc space-y-1">
                      <li>At least 6 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                    </ul>
                  </div>
                </div>

                <div className="register-form-group">
                  <label className="register-form-label mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaLock className="text-[#16A34A]" />
                    <span>Confirm Password *</span>
                  </label>

                  <div className="register-password-field relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`${getInputClass(!!errors.confirmPassword)} pr-12`}
                      placeholder="Confirm your password"
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) => value === password || 'Passwords do not match'
                      })}
                    />
                    <button
                      type="button"
                      className="register-password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#16A34A]"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>

                  {errors.confirmPassword && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </span>
                  )}
                </div>

                <div className="register-checkbox-group rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
                  <label className="register-checkbox-label flex items-start gap-3 text-sm text-[#374151]">
                    <input
                      type="checkbox"
                      {...register('agreeTerms', {
                        required: 'You must agree to the terms and conditions'
                      })}
                      className="mt-1 h-4 w-4 rounded border-[#D1D5DB] text-[#16A34A] focus:ring-[#16A34A]"
                    />
                    <span>
                      I agree to the{' '}
                      <a href="#" className="text-[#16A34A] hover:text-[#15803D]">
                        Terms and Conditions
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-[#16A34A] hover:text-[#15803D]">
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  {errors.agreeTerms && (
                    <span className="register-form-error mt-2 block text-sm text-red-600">
                      {errors.agreeTerms.message}
                    </span>
                  )}
                </div>

                <div className="register-actions-row flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    className="register-prev-button inline-flex items-center justify-center rounded-lg border border-[#D1D5DB] bg-white px-6 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                    onClick={prevStep}
                  >
                    ← Previous
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="register-submit-button inline-flex items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <FaSpinner className="register-spinner animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="register-footer-block mt-8 border-t border-[#E5E7EB] pt-6 text-center">
            <p className="register-footer-text text-[#6B7280]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="register-login-link font-semibold text-[#16A34A] transition hover:text-[#15803D]"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;