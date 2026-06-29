// Common validation helpers

export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

export const validateRequired = (value, label = 'This field') => {
  if (isEmpty(value)) {
    return `${label} is required`;
  }
  return '';
};

export const validateEmail = (email) => {
  if (isEmpty(email)) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? '' : 'Enter a valid email address';
};

export const validateBangladeshiPhone = (phone) => {
  if (isEmpty(phone)) return 'Mobile number is required';
  const phoneRegex = /^01[3-9]\d{8}$/;
  return phoneRegex.test(phone) ? '' : 'Enter a valid Bangladeshi mobile number';
};

export const validateBirthRegistrationNumber = (value) => {
  if (isEmpty(value)) return 'Birth registration number is required';
  const birthRegRegex = /^\d{17}$/;
  return birthRegRegex.test(value)
    ? ''
    : 'Birth registration number must be 17 digits';
};

export const validateNidNumber = (value) => {
  if (isEmpty(value)) return '';
  const nidRegex = /^(\d{10}|\d{13}|\d{17})$/;
  return nidRegex.test(value) ? '' : 'NID number must be 10, 13, or 17 digits';
};

export const validatePassword = (password) => {
  if (isEmpty(password)) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return 'Password must contain uppercase, lowercase and number';
  }

  return '';
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (isEmpty(confirmPassword)) return 'Confirm password is required';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
};

export const validateDateOfBirth = (dateOfBirth) => {
  if (isEmpty(dateOfBirth)) return 'Date of birth is required';

  const parsedDate = new Date(dateOfBirth);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Enter a valid date of birth';
  }

  const today = new Date();

  if (parsedDate > today) {
    return 'Date of birth cannot be in the future';
  }

  return '';
};

export const calculateAge = (dateOfBirth) => {
  if (isEmpty(dateOfBirth)) return 0;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
};

export const validateMinimumAge = (dateOfBirth, minimumAge = 18) => {
  const dateError = validateDateOfBirth(dateOfBirth);
  if (dateError) return dateError;

  const age = calculateAge(dateOfBirth);
  if (age < minimumAge) {
    return `Applicant must be at least ${minimumAge} years old`;
  }

  return '';
};

export const validateTextLength = (
  value,
  label = 'Field',
  minLength = 0,
  maxLength = Infinity
) => {
  if (isEmpty(value)) return '';

  const trimmedValue = value.trim();

  if (trimmedValue.length < minLength) {
    return `${label} must be at least ${minLength} characters`;
  }

  if (trimmedValue.length > maxLength) {
    return `${label} must be less than ${maxLength} characters`;
  }

  return '';
};

export const validateFileSize = (file, maxSizeInMB = 5) => {
  if (!file) return '';
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  return file.size <= maxSizeInBytes
    ? ''
    : `File size must be less than ${maxSizeInMB} MB`;
};

export const validateFileType = (file, allowedTypes = []) => {
  if (!file) return '';
  if (!allowedTypes.length) return '';

  return allowedTypes.includes(file.type)
    ? ''
    : 'Unsupported file type';
};

export const validateImageFile = (file) => {
  const typeError = validateFileType(file, [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]);

  if (typeError) return 'Only JPG, PNG or WEBP image is allowed';

  return validateFileSize(file, 5);
};

export const validatePdfFile = (file) => {
  const typeError = validateFileType(file, ['application/pdf']);

  if (typeError) return 'Only PDF file is allowed';

  return validateFileSize(file, 10);
};

export const validateAddress = (address = {}, prefix = 'Address') => {
  const errors = {};

  if (isEmpty(address.division)) {
    errors.division = `${prefix} division is required`;
  }

  if (isEmpty(address.district)) {
    errors.district = `${prefix} district is required`;
  }

  if (isEmpty(address.upazila)) {
    errors.upazila = `${prefix} upazila is required`;
  }

  return errors;
};

export const validateLoginData = (data = {}) => {
  const errors = {};

  const emailError = validateEmail(data.email);
  const passwordError = validateRequired(data.password, 'Password');

  if (isEmpty(data.email)) {
    errors.email = 'Email is required';
  } else if (emailError) {
    errors.email = emailError;
  }

  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
};

export const validateRegisterData = (data = {}) => {
  const errors = {};

  const fullNameError =
    validateRequired(data.fullName, 'Full name') ||
    validateTextLength(data.fullName, 'Full name', 3, 100);

  const fullNameBanglaError =
    validateRequired(data.fullNameBangla, 'Full name (Bangla)');

  const birthRegError = validateBirthRegistrationNumber(data.birthRegNumber);
  const phoneError = validateBangladeshiPhone(data.mobile || data.phone);
  const emailError = validateEmail(data.email);
  const passwordError = validatePassword(data.password);
  const confirmPasswordError = validateConfirmPassword(
    data.password,
    data.confirmPassword
  );
  const dobError = validateDateOfBirth(data.dateOfBirth);

  if (fullNameError) errors.fullName = fullNameError;
  if (fullNameBanglaError) errors.fullNameBangla = fullNameBanglaError;
  if (birthRegError) errors.birthRegNumber = birthRegError;
  if (phoneError) errors.mobile = phoneError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
  if (dobError) errors.dateOfBirth = dobError;

  if (isEmpty(data.gender)) {
    errors.gender = 'Gender is required';
  }

  if (isEmpty(data.placeOfBirth)) {
    errors.placeOfBirth = 'Place of birth is required';
  }

  const presentAddressErrors = validateAddress(
    data.presentAddress,
    'Present address'
  );

  if (Object.keys(presentAddressErrors).length > 0) {
    errors.presentAddress = presentAddressErrors;
  }

  if (!data.sameAddress) {
    const permanentAddressErrors = validateAddress(
      data.permanentAddress,
      'Permanent address'
    );

    if (Object.keys(permanentAddressErrors).length > 0) {
      errors.permanentAddress = permanentAddressErrors;
    }
  }

  if (data.agreeTerms === false) {
    errors.agreeTerms = 'You must agree to the terms and conditions';
  }

  return errors;
};

export const validateApplicationData = (data = {}) => {
  const errors = {};

  if (isEmpty(data.fullNameEnglish)) {
    errors.fullNameEnglish = 'Full name in English is required';
  }

  if (isEmpty(data.fullNameBangla)) {
    errors.fullNameBangla = 'Full name in Bangla is required';
  }

  if (isEmpty(data.fatherName)) {
    errors.fatherName = "Father's name is required";
  }

  if (isEmpty(data.motherName)) {
    errors.motherName = "Mother's name is required";
  }

  if (isEmpty(data.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth is required';
  }

  const nidError = validateNidNumber(data.existingNidNumber);
  if (nidError) {
    errors.existingNidNumber = nidError;
  }

  const phoneError = validateBangladeshiPhone(data.phone || data.mobile);
  if (phoneError) {
    errors.phone = phoneError;
  }

  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
};

export const hasValidationErrors = (errors = {}) => {
  return Object.values(errors).some((value) => {
    if (!value) return false;
    if (typeof value === 'object' && value !== null) {
      return hasValidationErrors(value);
    }
    return true;
  });
};

export const getFirstValidationError = (errors = {}) => {
  for (const value of Object.values(errors)) {
    if (!value) continue;

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      const nestedError = getFirstValidationError(value);
      if (nestedError) return nestedError;
    }
  }

  return '';
};