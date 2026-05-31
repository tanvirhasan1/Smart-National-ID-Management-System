import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

export const languageOptions = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'bn', label: 'বাংলা', shortLabel: 'BN' }
];

const translations = {
  en: {
    nav: {
      home: 'Home',
      login: 'Login',
      register: 'Register',
      dashboard: 'Dashboard',
      applyNid: 'Apply NID',
      trackStatus: 'Track Status',
      support: 'Support',
      language: 'Language',
      profile: 'Profile',
      logout: 'Logout',
      toggleNavigation: 'Toggle navigation menu'
    },
    footer: {
      brandTitle: 'Smart NID',
      brandSubtitle: 'Digital identity service portal',
      dashboard: 'Dashboard',
      trackStatus: 'Track Status',
      support: 'Support',
      copyright: '© {year} Smart NID Management System. Academic prototype.',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      description:
        'Academic prototype for Smart National ID registration, application tracking, biometric appointments, and citizen support services.',
      note: 'Built for digital public service management.',
      quickLinks: 'Quick Links',
      home: 'Home',
      register: 'Register',
      login: 'Login',
      services: 'Services',
      contact: 'Contact'
    },
    apply: {
      title: 'Smart NID Application',
      subtitle: 'Complete all steps to submit your application',
      progressPersonal: 'Personal Info',
      progressAddress: 'Address & Family',
      progressDocuments: 'Documents',
      progressReview: 'Review',

      step1Title: 'Application & Personal Information',
      step1Description: 'Select application type and provide your core information.',
      newNidTitle: 'New NID',
      newNidDescription: 'First-time NID application',
      correctionTitle: 'Correction',
      correctionDescription: 'Correct existing NID information',
      reissueTitle: 'Reissue',
      reissueDescription: 'Reissue lost or damaged NID',

      rejectedNoticeTitle: 'Your previous New NID application was rejected.',
      rejectedNoticeDescription: 'You can apply again after correcting the issues.',
      previous: 'Previous',
      rejected: 'Rejected',
      reason: 'Reason',
      applicantInfo: 'Applicant Information',
      fullNameEnglish: 'Full Name (English) *',
      fullNameBangla: 'Full Name (বাংলা)',
      dateOfBirth: 'Date of Birth *',
      gender: 'Gender *',
      birthRegistrationNumber: 'Birth Registration Number',
      bloodGroup: 'Blood Group *',
      phoneNumber: 'Phone Number *',
      email: 'Email',
      maritalStatus: 'Marital Status',
      occupation: 'Occupation *',
      existingNidNumber: 'Existing NID Number *',
      correctionReason: 'Correction Reason *',

      enterFullNameEnglish: 'Enter full name in English',
      enterFullNameBangla: 'পূর্ণ নাম লিখুন',
      selectGender: 'Select gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      birthRegistrationPlaceholder: '17 digit birth registration number',
      selectBloodGroup: 'Select blood group',
      emailPlaceholder: 'email@example.com',
      single: 'Single',
      married: 'Married',
      divorced: 'Divorced',
      widowed: 'Widowed',
      occupationPlaceholder: 'Enter your occupation',
      existingNidPlaceholder: 'Enter your current NID number',
      correctionReasonPlaceholder: 'Explain what information needs correction',

      step2Title: 'Address & Family Information',
      step2Description: 'Provide your address and family information.',
      presentAddress: 'Present Address',
      permanentAddress: 'Permanent Address',
      division: 'Division *',
      district: 'District *',
      upazila: 'Upazila/Thana *',
      unionWard: 'Union/Ward',
      villageArea: 'Village/Area',
      postOffice: 'Post Office',
      postalCode: 'Postal Code',
      selectDivision: 'Select division',
      selectDistrict: 'Select district',
      enterUpazila: 'Enter upazila or thana',
      enterUnionWard: 'Enter union or ward',
      enterVillageArea: 'Enter village or area',
      enterPostOffice: 'Enter post office',
      enterPostalCode: 'Enter postal code',
      sameAddress: 'Permanent address same as present address',
      fatherInfo: "Father's Information",
      fatherName: "Father's Name *",
      fatherNidOptional: "Father's NID (Optional)",
      motherInfo: "Mother's Information",
      motherName: "Mother's Name *",
      motherNidOptional: "Mother's NID (Optional)",
      spouseInfo: 'Spouse Information (Optional)',
      spouseName: 'Spouse Name',
      enterFatherName: "Enter father's name",
      enterMotherName: "Enter mother's name",
      enterSpouseName: 'Enter spouse name',
      nidPlaceholder: '10 or 17 digit NID',

      step3Title: 'Upload Documents',
      step3Description: 'Upload your documents. This step keeps the current UI and preview.',
      passportPhoto: 'Passport-size photo *',
      passportPhotoHint: 'Recent passport-size photo with white background',
      signature: 'Signature *',
      signatureHint: 'Clear signature on white paper',
      birthCertificate: 'Birth Certificate *',
      birthCertificateHint: 'Scan copy of birth certificate',
      correctionProof: 'Correction Proof *',
      correctionProofHint: 'Supporting document for requested correction',
      chooseFile: 'Choose file',
      faceVerificationNoteTitle: 'Face verification required',
      faceVerificationNotePoint1:
        'Face verification will start when you submit the application',
      reviewApplication: 'Review Application →',

      step4Title: 'Review & Submit',
      step4Description: 'Please review your information before submitting.',
      applicationType: 'Application Type',
      nidApplication: 'NID Application',
      personalInformation: 'Personal Information',
      fullNameBanglaReview: 'Full Name (Bangla)',
      dobReview: 'Date of Birth',
      phone: 'Phone',
      addressInformation: 'Address Information',
      familyInformation: 'Family Information',
      uploadedDocuments: 'Uploaded Documents',
      fatherNameReview: "Father's Name",
      motherNameReview: "Mother's Name",
      spouseNameReview: 'Spouse Name',
      na: 'N/A',
      declaration:
        'I declare that the information provided is true and correct to the best of my knowledge.',
      mustAgree: 'You must agree to the declaration',

      continue: 'Continue →',
      previousButton: '← Previous',
      submitApplication: 'Submit Application',
      submitting: 'Submitting...',
      fillRequired: 'Please fill all required fields before continuing.',
      uploadPhoto: 'Please upload your passport-size photo',
      uploadSignature: 'Please upload your signature',
      uploadBirthCertificate: 'Please upload your birth certificate',
      uploadCorrectionProof: 'Please upload correction proof'
    }
  },

  bn: {
    nav: {
      home: 'হোম',
      login: 'লগইন',
      register: 'রেজিস্টার',
      dashboard: 'ড্যাশবোর্ড',
      applyNid: 'এনআইডি আবেদন',
      trackStatus: 'স্ট্যাটাস দেখুন',
      support: 'সাপোর্ট',
      language: 'ভাষা',
      profile: 'প্রোফাইল',
      logout: 'লগআউট',
      toggleNavigation: 'নেভিগেশন মেনু খুলুন/বন্ধ করুন'
    },
    footer: {
      brandTitle: 'স্মার্ট এনআইডি',
      brandSubtitle: 'ডিজিটাল পরিচয় সেবা পোর্টাল',
      dashboard: 'ড্যাশবোর্ড',
      trackStatus: 'স্ট্যাটাস দেখুন',
      support: 'সাপোর্ট',
      copyright: '© {year} স্মার্ট এনআইডি ম্যানেজমেন্ট সিস্টেম। একাডেমিক প্রোটোটাইপ।',
      privacyPolicy: 'প্রাইভেসি পলিসি',
      termsOfService: 'টার্মস অব সার্ভিস',
      description:
        'স্মার্ট জাতীয় পরিচয়পত্র নিবন্ধন, আবেদন ট্র্যাকিং, বায়োমেট্রিক অ্যাপয়েন্টমেন্ট এবং নাগরিক সাপোর্ট সেবার একাডেমিক প্রোটোটাইপ।',
      note: 'ডিজিটাল পাবলিক সার্ভিস ম্যানেজমেন্টের জন্য তৈরি।',
      quickLinks: 'দ্রুত লিংক',
      home: 'হোম',
      register: 'রেজিস্টার',
      login: 'লগইন',
      services: 'সেবা',
      contact: 'যোগাযোগ'
    },
    apply: {
      title: 'স্মার্ট এনআইডি আবেদন',
      subtitle: 'আবেদন জমা দিতে সব ধাপ সম্পন্ন করুন',
      progressPersonal: 'ব্যক্তিগত তথ্য',
      progressAddress: 'ঠিকানা ও পরিবার',
      progressDocuments: 'ডকুমেন্ট',
      progressReview: 'রিভিউ',

      step1Title: 'আবেদন ও ব্যক্তিগত তথ্য',
      step1Description: 'আবেদনের ধরন নির্বাচন করুন এবং প্রয়োজনীয় তথ্য দিন।',
      newNidTitle: 'নতুন এনআইডি',
      newNidDescription: 'প্রথমবারের জাতীয় পরিচয়পত্র আবেদন',
      correctionTitle: 'সংশোধন',
      correctionDescription: 'বিদ্যমান এনআইডির তথ্য সংশোধন করুন',
      reissueTitle: 'রিইস্যু',
      reissueDescription: 'হারানো বা ক্ষতিগ্রস্ত এনআইডি পুনরায় ইস্যু করুন',

      rejectedNoticeTitle: 'আপনার আগের নতুন এনআইডি আবেদনটি বাতিল হয়েছে।',
      rejectedNoticeDescription: 'সমস্যাগুলো ঠিক করার পর আপনি আবার আবেদন করতে পারবেন।',
      previous: 'পূর্ববর্তী',
      rejected: 'বাতিল',
      reason: 'কারণ',
      applicantInfo: 'আবেদনকারীর তথ্য',
      fullNameEnglish: 'পূর্ণ নাম (ইংরেজি) *',
      fullNameBangla: 'পূর্ণ নাম (বাংলা)',
      dateOfBirth: 'জন্ম তারিখ *',
      gender: 'লিঙ্গ *',
      birthRegistrationNumber: 'জন্ম নিবন্ধন নম্বর',
      bloodGroup: 'রক্তের গ্রুপ *',
      phoneNumber: 'ফোন নম্বর *',
      email: 'ইমেইল',
      maritalStatus: 'বৈবাহিক অবস্থা',
      occupation: 'পেশা *',
      existingNidNumber: 'বর্তমান এনআইডি নম্বর *',
      correctionReason: 'সংশোধনের কারণ *',

      enterFullNameEnglish: 'ইংরেজিতে পূর্ণ নাম লিখুন',
      enterFullNameBangla: 'পূর্ণ নাম লিখুন',
      selectGender: 'লিঙ্গ নির্বাচন করুন',
      male: 'পুরুষ',
      female: 'নারী',
      other: 'অন্যান্য',
      birthRegistrationPlaceholder: '১৭ সংখ্যার জন্ম নিবন্ধন নম্বর',
      selectBloodGroup: 'রক্তের গ্রুপ নির্বাচন করুন',
      emailPlaceholder: 'email@example.com',
      single: 'অবিবাহিত',
      married: 'বিবাহিত',
      divorced: 'তালাকপ্রাপ্ত',
      widowed: 'বিধবা/বিপত্নীক',
      occupationPlaceholder: 'আপনার পেশা লিখুন',
      existingNidPlaceholder: 'আপনার বর্তমান এনআইডি নম্বর লিখুন',
      correctionReasonPlaceholder: 'কোন তথ্য সংশোধন করতে চান তা লিখুন',

      step2Title: 'ঠিকানা ও পারিবারিক তথ্য',
      step2Description: 'আপনার ঠিকানা ও পারিবারিক তথ্য দিন।',
      presentAddress: 'বর্তমান ঠিকানা',
      permanentAddress: 'স্থায়ী ঠিকানা',
      division: 'বিভাগ *',
      district: 'জেলা *',
      upazila: 'উপজেলা/থানা *',
      unionWard: 'ইউনিয়ন/ওয়ার্ড',
      villageArea: 'গ্রাম/এলাকা',
      postOffice: 'ডাকঘর',
      postalCode: 'পোস্টাল কোড',
      selectDivision: 'বিভাগ নির্বাচন করুন',
      selectDistrict: 'জেলা নির্বাচন করুন',
      enterUpazila: 'উপজেলা বা থানা লিখুন',
      enterUnionWard: 'ইউনিয়ন বা ওয়ার্ড লিখুন',
      enterVillageArea: 'গ্রাম বা এলাকা লিখুন',
      enterPostOffice: 'ডাকঘর লিখুন',
      enterPostalCode: 'পোস্টাল কোড লিখুন',
      sameAddress: 'স্থায়ী ঠিকানা বর্তমান ঠিকানার মতোই',
      fatherInfo: 'পিতার তথ্য',
      fatherName: 'পিতার নাম *',
      fatherNidOptional: 'পিতার এনআইডি (ঐচ্ছিক)',
      motherInfo: 'মাতার তথ্য',
      motherName: 'মাতার নাম *',
      motherNidOptional: 'মাতার এনআইডি (ঐচ্ছিক)',
      spouseInfo: 'স্বামী/স্ত্রীর তথ্য (ঐচ্ছিক)',
      spouseName: 'স্বামী/স্ত্রীর নাম',
      enterFatherName: 'পিতার নাম লিখুন',
      enterMotherName: 'মাতার নাম লিখুন',
      enterSpouseName: 'স্বামী/স্ত্রীর নাম লিখুন',
      nidPlaceholder: '১০ বা ১৭ সংখ্যার এনআইডি',

      step3Title: 'ডকুমেন্ট আপলোড',
      step3Description: 'আপনার প্রয়োজনীয় ডকুমেন্ট আপলোড করুন।',
      passportPhoto: 'পাসপোর্ট সাইজ ছবি *',
      passportPhotoHint: 'সাদা ব্যাকগ্রাউন্ডসহ সাম্প্রতিক পাসপোর্ট সাইজ ছবি',
      signature: 'স্বাক্ষর *',
      signatureHint: 'সাদা কাগজে পরিষ্কার স্বাক্ষর',
      birthCertificate: 'জন্ম সনদ *',
      birthCertificateHint: 'জন্ম সনদের স্ক্যান কপি',
      correctionProof: 'সংশোধনের প্রমাণ *',
      correctionProofHint: 'সংশোধনের জন্য সহায়ক ডকুমেন্ট',
      chooseFile: 'ফাইল নির্বাচন করুন',
      faceVerificationNoteTitle: 'ফেস ভেরিফিকেশন প্রয়োজন',
      faceVerificationNotePoint1: 'আবেদন জমা দেওয়ার সময় ফেস ভেরিফিকেশন শুরু হবে',
      reviewApplication: 'আবেদন রিভিউ করুন →',

      step4Title: 'রিভিউ ও জমা দিন',
      step4Description: 'জমা দেওয়ার আগে আপনার তথ্যগুলো যাচাই করুন।',
      applicationType: 'আবেদনের ধরন',
      nidApplication: 'এনআইডি আবেদন',
      personalInformation: 'ব্যক্তিগত তথ্য',
      fullNameBanglaReview: 'পূর্ণ নাম (বাংলা)',
      dobReview: 'জন্ম তারিখ',
      phone: 'ফোন',
      addressInformation: 'ঠিকানার তথ্য',
      familyInformation: 'পারিবারিক তথ্য',
      uploadedDocuments: 'আপলোড করা ডকুমেন্ট',
      fatherNameReview: 'পিতার নাম',
      motherNameReview: 'মাতার নাম',
      spouseNameReview: 'স্বামী/স্ত্রীর নাম',
      na: 'প্রযোজ্য নয়',
      declaration:
        'আমি ঘোষণা করছি যে আমার দেওয়া তথ্য আমার জ্ঞান অনুযায়ী সত্য ও সঠিক।',
      mustAgree: 'ঘোষণায় সম্মতি দেওয়া আবশ্যক',

      continue: 'চালিয়ে যান →',
      previousButton: '← পূর্ববর্তী',
      submitApplication: 'আবেদন জমা দিন',
      submitting: 'জমা হচ্ছে...',
      fillRequired: 'চালিয়ে যেতে প্রয়োজনীয় তথ্যগুলো পূরণ করুন।',
      uploadPhoto: 'অনুগ্রহ করে আপনার পাসপোর্ট সাইজ ছবি আপলোড করুন',
      uploadSignature: 'অনুগ্রহ করে আপনার স্বাক্ষর আপলোড করুন',
      uploadBirthCertificate: 'অনুগ্রহ করে জন্ম সনদ আপলোড করুন',
      uploadCorrectionProof: 'অনুগ্রহ করে সংশোধনের প্রমাণ আপলোড করুন'
    }
  }
};

const getNestedValue = (source, key) =>
  key.split('.').reduce((value, part) => value?.[part], source);

const interpolate = (text, variables = {}) =>
  Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    text
  );

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('smartNidLanguage') || 'en';
  });

  const setLanguage = useCallback((nextLanguage) => {
    const isSupported = languageOptions.some((item) => item.code === nextLanguage);
    setLanguageState(isSupported ? nextLanguage : 'en');
  }, []);

  useEffect(() => {
    localStorage.setItem('smartNidLanguage', language);
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
  }, [language]);

  const t = useCallback(
    (key, variables = {}) => {
      const translatedText =
        getNestedValue(translations[language], key) ||
        getNestedValue(translations.en, key) ||
        key;

      return typeof translatedText === 'string'
        ? interpolate(translatedText, variables)
        : key;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languageOptions,
      t,
      isBangla: language === 'bn'
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return context;
};
