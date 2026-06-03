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
import { useLanguage } from '../context/LanguageContext';
import { bangladeshLocations } from '../utils/helpers';
import '../styles/Register.css';

const Register = () => {
  const { register: registerUser } = useAuth();
  const { t, isBangla } = useLanguage();
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
    trigger,
    clearErrors,
    formState: { errors }
  } = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange'
  });

  const password = watch('newPassword');

  const getInputClass = (hasError = false) =>
    `register-form-input w-full border bg-white px-4 py-3 outline-none transition ${
      hasError
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/10'
    }`;

  const getSelectClass = (hasError = false) =>
    `register-form-select w-full border bg-white px-4 py-3 outline-none transition ${
      hasError
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10'
        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/10'
    }`;

  const getStepClass = (stepNumber) => {
    const isActive = currentStep === stepNumber;
    const isComplete = currentStep > stepNumber;

    return `register-step-item flex items-center gap-3 ${
      isActive || isComplete ? 'register-step-item-active' : ''
    }`;
  };

  const handleSameAddress = (e) => {
    const checked = e.target.checked;
    setSameAddress(checked);

    if (checked) {
      const presentAddress = watch('presentAddress');
      setValue('permanentAddress', presentAddress);
      setSelectedPermanentDivision(selectedPresentDivision);

      clearErrors([
        'permanentAddress.division',
        'permanentAddress.district',
        'permanentAddress.upazila'
      ]);
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
        password: data.newPassword,
        presentAddress: {
          division: data.presentAddress?.division,
          district: data.presentAddress?.district,
          upazila: data.presentAddress?.upazila,
          union: data.presentAddress?.union || '',
          village: data.presentAddress?.village || '',
          postCode: data.presentAddress?.postCode || ''
        },
        permanentAddress: sameAddress
          ? {
              division: data.presentAddress?.division,
              district: data.presentAddress?.district,
              upazila: data.presentAddress?.upazila,
              union: data.presentAddress?.union || '',
              village: data.presentAddress?.village || '',
              postCode: data.presentAddress?.postCode || ''
            }
          : {
              division: data.permanentAddress?.division,
              district: data.permanentAddress?.district,
              upazila: data.permanentAddress?.upazila,
              union: data.permanentAddress?.union || '',
              village: data.permanentAddress?.village || '',
              postCode: data.permanentAddress?.postCode || ''
            }
      };

      const result = await registerUser(formattedData);
      const verificationToken = result?.verificationToken || result?.data?.verificationToken;

      if (!verificationToken) {
        throw new Error(t('register.verificationTokenMissing'));
      }

      toast.success(t('register.registrationSuccess'));

      navigate('/verify-otp', {
        state: {
          email: result?.recipientEmail || data.email,
          verificationToken
        }
      });
    } catch (error) {
      toast.error(error.message || t('register.registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToRegisterTop = () => {
    // Step change er pore form/card er top ta show korai better UX.
    window.requestAnimationFrame(() => {
      const registerCard = document.querySelector('.register-card-panel');

      if (registerCard) {
        registerCard.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        return;
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  };

  const getCurrentStepFields = () => {
    if (currentStep === 1) {
      return [
        'fullName',
        'fullNameBangla',
        'birthRegNumber',
        'dateOfBirth',
        'gender',
        'placeOfBirth',
        'mobile',
        'email'
      ];
    }

    if (currentStep === 2) {
      const addressFields = [
        'presentAddress.division',
        'presentAddress.district',
        'presentAddress.upazila'
      ];

      if (!sameAddress) {
        addressFields.push(
          'permanentAddress.division',
          'permanentAddress.district',
          'permanentAddress.upazila'
        );
      }

      return addressFields;
    }

    return [];
  };

  const nextStep = async () => {
    const fieldsToCheck = getCurrentStepFields();

    // Field empty thakle next step e jabe na.
    // Missing fields er input/select border red hobe, fill korle abar normal hoye jabe.
    const isStepValid = await trigger(fieldsToCheck, { shouldFocus: true });

    if (!isStepValid) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
    scrollToRegisterTop();
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    scrollToRegisterTop();
  };

  return (
    <div className="register-page-wrapper min-h-[calc(100vh-140px)] px-4 py-10">
      <div className="register-container mx-auto w-full max-w-[860px]">
        <div className="register-card-panel rounded-[28px] bg-white p-6 sm:p-8 lg:p-10">
          <div className="register-header-block text-center">
            <h1 className="register-title-text">{t('register.title')}</h1>
            <p className="register-subtitle-text">{t('register.subtitle')}</p>
          </div>

          <form className="register-form-wrapper" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
            {currentStep === 1 && (
              <div className="register-step-panel">
                <h3 className="register-step-title">{t('register.personalInformation')}</h3>

                <div className="register-form-group">
                  <label className="register-form-label">
                    <FaUser />
                    <span>{t('register.fullNameEnglish')}</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.fullName)}
                    placeholder={t('register.fullNameEnglishPlaceholder')}
                    {...register('fullName', {
                      required: t('register.fullNameRequired'),
                      minLength: { value: 3, message: t('register.fullNameMin') }
                    })}
                  />
                  {errors.fullName && <span className="register-form-error">{errors.fullName.message}</span>}
                </div>

                <div className="register-form-group">
                  <label className="register-form-label">
                    <FaUser />
                    <span>{t('register.fullNameBangla')}</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.fullNameBangla)}
                    placeholder={t('register.fullNameBanglaPlaceholder')}
                    {...register('fullNameBangla', {
                      required: t('register.fullNameBanglaRequired')
                    })}
                  />
                  {errors.fullNameBangla && <span className="register-form-error">{errors.fullNameBangla.message}</span>}
                </div>

                <div className="register-form-group">
                  <label className="register-form-label">
                    <FaIdCard />
                    <span>{t('register.birthRegNumber')}</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.birthRegNumber)}
                    placeholder={t('register.birthRegNumberPlaceholder')}
                    {...register('birthRegNumber', {
                      required: t('register.birthRegNumberRequired'),
                      pattern: {
                        value: /^[0-9]{17}$/,
                        message: t('register.birthRegNumberInvalid')
                      }
                    })}
                  />
                  {errors.birthRegNumber && <span className="register-form-error">{errors.birthRegNumber.message}</span>}
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label">
                      <FaCalendar />
                      <span>{t('register.dateOfBirth')}</span>
                    </label>
                    <input
                      type="date"
                      className={getInputClass(!!errors.dateOfBirth)}
                      {...register('dateOfBirth', { required: t('register.dateOfBirthRequired') })}
                    />
                    {errors.dateOfBirth && <span className="register-form-error">{errors.dateOfBirth.message}</span>}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label">
                      <FaVenusMars />
                      <span>{t('register.gender')}</span>
                    </label>
                    <select
                      className={getSelectClass(!!errors.gender)}
                      {...register('gender', { required: t('register.genderRequired') })}
                    >
                      <option value="">{t('register.selectGender')}</option>
                      <option value="male">{t('register.male')}</option>
                      <option value="female">{t('register.female')}</option>
                      <option value="other">{t('register.other')}</option>
                    </select>
                    {errors.gender && <span className="register-form-error">{errors.gender.message}</span>}
                  </div>
                </div>

                <div className="register-form-group">
                  <label className="register-form-label">
                    <FaMapMarkerAlt />
                    <span>{t('register.placeOfBirth')}</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.placeOfBirth)}
                    placeholder={t('register.placeOfBirthPlaceholder')}
                    {...register('placeOfBirth', {
                      required: t('register.placeOfBirthRequired')
                    })}
                  />
                  {errors.placeOfBirth && <span className="register-form-error">{errors.placeOfBirth.message}</span>}
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label">
                      <FaPhone />
                      <span>{t('register.mobile')}</span>
                    </label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.mobile)}
                      placeholder="01XXXXXXXXX"
                      {...register('mobile', {
                        required: t('register.mobileRequired'),
                        pattern: {
                          value: /^01[0-9]{9}$/,
                          message: t('register.mobileInvalid')
                        }
                      })}
                    />
                    {errors.mobile && <span className="register-form-error">{errors.mobile.message}</span>}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label">
                      <FaEnvelope />
                      <span>{t('register.email')}</span>
                    </label>
                    <input
                      type="email"
                      className={getInputClass(!!errors.email)}
                      placeholder={t('register.emailPlaceholder')}
                      {...register('email', {
                        required: t('register.emailRequired'),
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: t('register.emailInvalid')
                        }
                      })}
                    />
                    {errors.email && <span className="register-form-error">{errors.email.message}</span>}
                  </div>
                </div>

                <div className="register-actions-row register-actions-row-end">
                  <button type="button" className="register-next-button" onClick={nextStep}>
                    {t('register.nextStep')}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="register-step-panel">
                <h3 className="register-step-title">{t('register.presentAddress')}</h3>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label label-no-icon"><span>{t('register.division')}</span></label>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.division)}
                      {...register('presentAddress.division', { required: t('register.divisionRequired') })}
                      onChange={(e) => setSelectedPresentDivision(e.target.value)}
                    >
                      <option value="">{t('register.selectDivision')}</option>
                      {bangladeshLocations.divisions.map((div) => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                    {errors.presentAddress?.division && <span className="register-form-error">{errors.presentAddress.division.message}</span>}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label label-no-icon"><span>{t('register.district')}</span></label>
                    <select
                      className={getSelectClass(!!errors.presentAddress?.district)}
                      {...register('presentAddress.district', { required: t('register.districtRequired') })}
                    >
                      <option value="">{t('register.selectDistrict')}</option>
                      {selectedPresentDivision && bangladeshLocations.districts[selectedPresentDivision]?.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                    {errors.presentAddress?.district && <span className="register-form-error">{errors.presentAddress.district.message}</span>}
                  </div>
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label label-no-icon"><span>{t('register.upazila')}</span></label>
                    <input
                      type="text"
                      className={getInputClass(!!errors.presentAddress?.upazila)}
                      placeholder={t('register.upazilaPlaceholder')}
                      {...register('presentAddress.upazila', { required: t('register.upazilaRequired') })}
                    />
                    {errors.presentAddress?.upazila && <span className="register-form-error">{errors.presentAddress.upazila.message}</span>}
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label label-no-icon"><span>{t('register.postCode')}</span></label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('register.postCodePlaceholder')}
                      {...register('presentAddress.postCode')}
                    />
                  </div>
                </div>

                <div className="register-form-row grid gap-5 md:grid-cols-2">
                  <div className="register-form-group">
                    <label className="register-form-label label-no-icon"><span>{t('register.unionWard')}</span></label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('register.unionWardPlaceholder')}
                      {...register('presentAddress.union')}
                    />
                  </div>

                  <div className="register-form-group">
                    <label className="register-form-label label-no-icon"><span>{t('register.villageHouse')}</span></label>
                    <input
                      type="text"
                      className={getInputClass(false)}
                      placeholder={t('register.villageHousePlaceholder')}
                      {...register('presentAddress.village')}
                    />
                  </div>
                </div>

                <div className="register-checkbox-group">
                  <label className="register-checkbox-label">
                    <input
                      type="checkbox"
                      checked={sameAddress}
                      onChange={handleSameAddress}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span>{t('register.sameAddress')}</span>
                  </label>
                </div>

                {!sameAddress && (
                  <div className="register-permanent-address-block">
                    <h3 className="register-step-title">{t('register.permanentAddress')}</h3>

                    <div className="register-form-row grid gap-5 md:grid-cols-2">
                      <div className="register-form-group">
                        <label className="register-form-label label-no-icon"><span>{t('register.division')}</span></label>
                        <select
                          className={getSelectClass(!!errors.permanentAddress?.division)}
                          {...register('permanentAddress.division', { required: !sameAddress ? t('register.divisionRequired') : false })}
                          onChange={(e) => setSelectedPermanentDivision(e.target.value)}
                        >
                          <option value="">{t('register.selectDivision')}</option>
                          {bangladeshLocations.divisions.map((div) => (
                            <option key={div} value={div}>{div}</option>
                          ))}
                        </select>
                      </div>

                      <div className="register-form-group">
                        <label className="register-form-label label-no-icon"><span>{t('register.district')}</span></label>
                        <select
                          className={getSelectClass(!!errors.permanentAddress?.district)}
                          {...register('permanentAddress.district', { required: !sameAddress ? t('register.districtRequired') : false })}
                        >
                          <option value="">{t('register.selectDistrict')}</option>
                          {selectedPermanentDivision && bangladeshLocations.districts[selectedPermanentDivision]?.map((dist) => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="register-form-row grid gap-5 md:grid-cols-2">
                      <div className="register-form-group">
                        <label className="register-form-label label-no-icon"><span>{t('register.upazila')}</span></label>
                        <input
                          type="text"
                          className={getInputClass(!!errors.permanentAddress?.upazila)}
                          placeholder={t('register.upazilaPlaceholder')}
                          {...register('permanentAddress.upazila', { required: !sameAddress ? t('register.upazilaRequired') : false })}
                        />
                      </div>

                      <div className="register-form-group">
                        <label className="register-form-label label-no-icon"><span>{t('register.postCode')}</span></label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder={t('register.postCodePlaceholder')}
                          {...register('permanentAddress.postCode')}
                        />
                      </div>
                    </div>

                    <div className="register-form-row grid gap-5 md:grid-cols-2">
                      <div className="register-form-group">
                        <label className="register-form-label label-no-icon"><span>{t('register.unionWard')}</span></label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder={t('register.unionWardPlaceholder')}
                          {...register('permanentAddress.union')}
                        />
                      </div>

                      <div className="register-form-group">
                        <label className="register-form-label label-no-icon"><span>{t('register.villageHouse')}</span></label>
                        <input
                          type="text"
                          className={getInputClass(false)}
                          placeholder={t('register.villageHousePlaceholder')}
                          {...register('permanentAddress.village')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="register-actions-row register-actions-row-between">
                  <button type="button" className="register-prev-button" onClick={prevStep}>
                    {t('register.previous')}
                  </button>

                  <button type="button" className="register-next-button" onClick={nextStep}>
                    {t('register.nextStep')}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="register-step-panel">
                <h3 className="register-step-title">{t('register.createPassword')}</h3>

                <div className="register-form-group">
                  <label className="register-form-label">
                    <FaLock />
                    <span>{t('register.password')}</span>
                  </label>

                  <div className="register-password-field relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${getInputClass(!!errors.newPassword)} pr-12`}
                      placeholder={t('register.passwordPlaceholder')}
                      autoComplete="new-password"
                      {...register('newPassword', {
                        required: t('register.passwordRequired'),
                        minLength: { value: 6, message: t('register.passwordMin') },
                        pattern: {
                          value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                          message: t('register.passwordPattern')
                        }
                      })}
                    />
                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.newPassword && <span className="register-form-error">{errors.newPassword.message}</span>}

                  <div className="register-password-hints">
                    <span className="register-password-hints-title">{t('register.passwordHintsTitle')}</span>
                    <ul>
                      <li>{t('register.passwordHintLength')}</li>
                      <li>{t('register.passwordHintUpper')}</li>
                      <li>{t('register.passwordHintLower')}</li>
                      <li>{t('register.passwordHintNumber')}</li>
                    </ul>
                  </div>
                </div>

                <div className="register-form-group">
                  <label className="register-form-label">
                    <FaLock />
                    <span>{t('register.confirmPassword')}</span>
                  </label>

                  <div className="register-password-field relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`${getInputClass(!!errors.confirmNewPassword)} pr-12`}
                      placeholder={t('register.confirmPasswordPlaceholder')}
                      autoComplete="new-password"
                      {...register('confirmNewPassword', {
                        required: t('register.confirmPasswordRequired'),
                        validate: (value) => value === password || t('register.passwordMismatch')
                      })}
                    />
                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.confirmNewPassword && <span className="register-form-error">{errors.confirmNewPassword.message}</span>}
                </div>

                <div className="register-checkbox-group">
                  <label className="register-checkbox-label">
                    <input
                      type="checkbox"
                      {...register('agreeTerms', { required: t('register.agreeTermsRequired') })}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                    />
                    <span>
                      {t('register.agreePrefix')} <a href="#" className="register-inline-link">{t('register.termsAndConditions')}</a> {t('register.and')} <a href="#" className="register-inline-link">{t('register.privacyPolicy')}</a>{' '}{t('register.agreeSuffix')}
                    </span>
                  </label>
                  {errors.agreeTerms && <span className="register-form-error">{errors.agreeTerms.message}</span>}
                </div>

                <div className="register-actions-row register-actions-row-between">
                  <button type="button" className="register-prev-button" onClick={prevStep}>
                    {t('register.previous')}
                  </button>

                  <button type="submit" disabled={isLoading} className="register-submit-button">
                    {isLoading ? (
                      <>
                        <FaSpinner className="register-spinner animate-spin" />
                        <span>{t('register.registering')}</span>
                      </>
                    ) : (
                      t('register.completeRegistration')
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="register-footer-block">
            <p className="register-footer-text">
              {t('register.alreadyHaveAccount')}{' '}
              <Link to="/login" className="register-login-link">
                {t('register.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
