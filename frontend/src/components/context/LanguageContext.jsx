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
    login: {
      logoAria: 'Smart NID home',
      secureBadge: 'Secure citizen access',
      title: 'Welcome Back',
      subtitle: 'Login to continue your Smart NID service.',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email address',
      emailRequired: 'Email is required',
      emailInvalid: 'Enter a valid email address',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      passwordRequired: 'Password is required',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      helperText: 'Use your verified citizen account',
      forgotPassword: 'Forgot Password?',
      loginButton: 'Log in',
      loggingIn: 'Logging in...',
      noAccount: "Don't have an account?",
      registerNow: 'Register Now',
      success: 'Login successful.',
      invalidCredentials: 'Invalid email or password. Please try again.'
    },
    forgotPasswordPage: {
      requestTitle: 'Forgot Password',
      resetTitle: 'Reset Password',
      requestSubtitle: 'Enter your verified email to receive a reset code.',
      resetSubtitle: 'Enter the 6-digit code sent to {email}.',
      codeSentNote: 'Reset code sent successfully. Check your inbox.',
      emailLabel: 'Email Address',
      emailPlaceholder: 'Enter your email address',
      verificationCodeLabel: 'Verification Code',
      verificationCodePlaceholder: 'Enter 6-digit code',
      newPasswordLabel: 'New Password',
      newPasswordPlaceholder: 'Enter new password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm new password',
      sending: 'Sending...',
      sendResetCode: 'Send Reset Code',
      resetting: 'Resetting...',
      resetPassword: 'Reset Password',
      sendNewCode: 'Send New Code',
      rememberPassword: 'Remember your password?',
      backToLogin: 'Back to Login',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      enterEmail: 'Please enter your email address.',
      codeSentSuccess: 'Password reset code sent.',
      sendFailed: 'Reset code could not be sent.',
      enterCode: 'Please enter the 6-digit code.',
      passwordMin: 'Password must be at least 8 characters.',
      passwordsDoNotMatch: 'Passwords do not match.',
      sessionExpired: 'Reset session expired. Please request a new code.',
      resetSuccess: 'Password updated successfully.',
      resetFailed: 'Password could not be updated.'
    },

    register: {
      logoAlt: 'Smart NID Card Management System',
      title: 'Create Account',
      subtitle: 'Register for Smart NID services',
      stepPersonal: 'Personal Info',
      stepAddress: 'Address',
      stepSecurity: 'Security',
      personalInformation: 'Personal Information',
      fullNameEnglish: 'Full Name (English) *',
      fullNameEnglishPlaceholder: 'Enter your full name',
      fullNameBangla: 'Full Name (Bangla) *',
      fullNameBanglaPlaceholder: 'Enter full name in Bangla',
      birthRegNumber: 'Birth Registration Number *',
      birthRegNumberPlaceholder: '17-digit Birth Registration Number',
      dateOfBirth: 'Date of Birth *',
      gender: 'Gender *',
      selectGender: 'Select Gender',
      male: 'Male',
      female: 'Female',
      other: 'Other',
      placeOfBirth: 'Place of Birth *',
      placeOfBirthPlaceholder: 'District/City of birth',
      mobile: 'Mobile Number *',
      email: 'Email *',
      emailPlaceholder: 'email@example.com',
      nextStep: 'Next Step',
      previous: 'Previous',
      presentAddress: 'Present Address',
      permanentAddress: 'Permanent Address',
      division: 'Division *',
      district: 'District *',
      upazila: 'Upazila/Thana *',
      upazilaPlaceholder: 'Enter Upazila/Thana',
      postCode: 'Post Code',
      postCodePlaceholder: 'Post Code',
      unionWard: 'Union/Ward',
      unionWardPlaceholder: 'Union/Ward Name',
      villageHouse: 'Village/House',
      villageHousePlaceholder: 'Village/House/Road',
      selectDivision: 'Select Division',
      selectDistrict: 'Select District',
      sameAddress: 'Permanent address same as present address',
      createPassword: 'Create Password',
      password: 'Password *',
      passwordPlaceholder: 'Create a new password',
      confirmPassword: 'Confirm Password *',
      confirmPasswordPlaceholder: 'Confirm your new password',
      passwordHintsTitle: 'Password must contain:',
      passwordHintLength: 'At least 6 characters',
      passwordHintUpper: 'One uppercase letter',
      passwordHintLower: 'One lowercase letter',
      passwordHintNumber: 'One number',
      agreePrefix: 'I agree to the',
      termsAndConditions: 'Terms and Conditions',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      agreeSuffix: '',
      completeRegistration: 'Complete Registration',
      registering: 'Registering...',
      alreadyHaveAccount: 'Already have an account?',
      login: 'Login',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      verificationTokenMissing: 'Verification token not found. Please try again.',
      registrationSuccess: 'Registration successful. Please verify your email.',
      registrationFailed: 'Registration failed. Please try again.',
      fullNameRequired: 'Full name is required',
      fullNameMin: 'Name must be at least 3 characters',
      fullNameBanglaRequired: 'Bangla name is required',
      birthRegNumberRequired: 'Birth registration number is required',
      birthRegNumberInvalid: 'Enter a valid 17-digit Birth Registration Number',
      dateOfBirthRequired: 'Date of birth is required',
      genderRequired: 'Gender is required',
      placeOfBirthRequired: 'Place of birth is required',
      mobileRequired: 'Mobile number is required',
      mobileInvalid: 'Enter a valid Bangladeshi mobile number',
      emailRequired: 'Email address is required',
      emailInvalid: 'Enter a valid email address',
      divisionRequired: 'Division is required',
      districtRequired: 'District is required',
      upazilaRequired: 'Upazila/Thana is required',
      passwordRequired: 'Password is required',
      passwordMin: 'Password must be at least 6 characters',
      passwordPattern: 'Password must contain uppercase, lowercase and number',
      confirmPasswordRequired: 'Please confirm your password.',
      passwordMismatch: 'Passwords do not match',
      agreeTermsRequired: 'You must agree to the terms and conditions'
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
      trackApplication: 'Track Application',
      citizenServices: 'Citizen Services',
      applyForNid: 'Apply for NID',
      forgotPassword: 'Forgot Password',
      otpVerification: 'OTP Verification',
      services: 'Services',
      contact: 'Contact',
      phoneNumber: '+880 1000-000000',
      demoAddress: 'Demo Service Office, Dhaka, Bangladesh'
    },
    support: {
  title: 'Support Center',
  subtitle: 'Get help with your Smart NID application and service issues.',
  createNewTicket: 'Create New Ticket',
  createTicket: 'Create Ticket',
  myTickets: 'My Tickets',
  activeSupport: 'Active Support',
  noTicketsTitle: 'No support tickets yet',
  noTicketsDescription: 'Create your first ticket if you need help.',
  selectTicketTitle: 'Select a Ticket',
  selectTicketDescription:
    'Choose a ticket from the list to view full conversation and send replies.',
  openFirstTicket: 'Open First Ticket',
  loadingTickets: 'Loading support tickets...',
  loadingDetails: 'Loading ticket details...',
  category: 'Category',
  subject: 'Subject',
  created: 'Created',
  conversation: 'Conversation',
  you: 'You',
  supportTeam: 'Support Team',
  replyMessage: 'Reply Message',
  replyPlaceholder: 'Type your message...',
  sending: 'Sending...',
  sendMessage: 'Send Message',
  closedNote: 'This ticket is {status}. No new replies can be sent.',
  modalTitle: 'Create Support Ticket',
  modalSubtitle: 'Tell us about your issue and our team will help you.',
  subjectLabel: 'Subject *',
  subjectPlaceholder: 'Brief description of your issue',
  categoryLabel: 'Category *',
  selectCategory: 'Select category',
  priorityLabel: 'Priority',
  descriptionLabel: 'Description *',
  descriptionPlaceholder: 'Describe your issue in detail...',
  cancel: 'Cancel',
  creating: 'Creating...',
  statuses: {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  },
  categories: {
    application_issue: 'Application Issue',
    appointment: 'Appointment',
    payment: 'Payment',
    delivery: 'Delivery',
    technical: 'Technical Issue',
    other: 'Other'
  },
  priorities: {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  },
  validation: {
    subjectRequired: 'Subject is required',
    categoryRequired: 'Category is required',
    descriptionRequired: 'Description is required',
    descriptionMin: 'Description must be at least 20 characters'
  },
  toasts: {
    loadFailed: 'Support tickets could not be loaded.',
    detailsFailed: 'Ticket details could not be loaded.',
    createSuccess: 'Support ticket created successfully.',
    createFailed: 'Support ticket could not be created.',
    messageSuccess: 'Message sent successfully.',
    messageFailed: 'Message could not be sent.'
  }
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
      fullNameBangla: 'Full Name (Bangla)',
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
      enterFullNameBangla: 'Enter full name in Bangla',
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
      reviewApplication: 'Review Application',

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

      continue: 'Continue',
      previousButton: 'Previous',
      submitApplication: 'Submit Application',
      submitting: 'Submitting...',
      fillRequired: 'Please fill all required fields before continuing.',
      uploadPhoto: 'Please upload your passport-size photo.',
      uploadSignature: 'Please upload your signature.',
      uploadBirthCertificate: 'Please upload your birth certificate.',
      uploadCorrectionProof: 'Please upload correction proof.'
    },
    tracker: {
loadingApplications: 'Loading applications...',
    headerTitle: 'Track Your Smart NID Application',
    headerSubtitle: 'See every stage of your application journey in one place.',
    currentPrefix: 'Current:',
    syncing: 'Syncing...',
    autoSyncedPrefix: 'Auto synced:',
    myApplications: 'My Applications',
    myApplicationsHint: 'Open any application to see full progress.',
    noApplicationsFound: 'No applications found',
    noApplicationsHint: 'You have not submitted any application yet.',
    applyNow: 'Apply Now',
    applicationPrefix: 'Application',
    applicationType: 'Application Type',
    currentStatus: 'Current Status',
    submittedOn: 'Submitted On',
    lastUpdated: 'Last Updated',
    needActionTitle: 'Need to take action?',
    needActionHint: 'Available options will appear here based on the current application status.',
    contactSupport: 'Contact Support',
    openDigitalNid: 'View Digital NID',
    applyAgain: 'Apply Again',
    correctionRequest: 'Correction Request',
    officialRejectionReason: 'Official Rejection Reason',
    applicationProgress: 'Application Progress',
    applicationProgressHint: 'Official milestones are shown once in a compact timeline to avoid duplicate information.',
    selectApplication: 'Select an Application',
    selectApplicationHint: 'Choose an application from the left side to view details.',
    correctionRequestProgress: 'Correction Request Progress',
    correctionRequestHint: 'This section appears only because you submitted a correction request.',
    baseApplication: 'Base Application',
    changedFields: 'Changed Fields',
    correctionRejectionReason: 'Correction Rejection Reason',
    previousCorrectionRequests: 'Previous Correction Requests',
    submittedPrefix: 'Submitted:',
    updatedPrefix: 'Updated:',
    statusTime: 'Status Time',
    stepPrefix: 'Step',
    finalRejectedTitle: 'Final Review Result: Rejected',
    finalRejectedDescription: 'The application stopped after the review stage. It did not move to approval, printing, dispatch, or delivery.',
    finalCancelledTitle: 'Final Review Result: Cancelled',
    finalCancelledDescription: 'This application is no longer active and will not move to the next stages.',
    notAvailable: 'N/A',
    statusBadges: { current: 'Current', completed: 'Completed', pending: 'Pending' },
    statuses: {
      draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved',
      printed: 'Printed', dispatched: 'Dispatched', delivered: 'Delivered', rejected: 'Rejected',
      cancelled: 'Cancelled', new: 'NEW', correction: 'CORRECTION'
    },
    timeline: {
      submitted: { label: 'Submitted', description: 'Your application has been received successfully.', currentText: 'Submitted now' },
      waitingReview: { label: 'Waiting for Admin Review', description: 'Your application is queued for admin checking.', pendingText: 'Waiting for review' },
      decisionPending: { label: 'Decision Pending', description: 'Approval or rejection decision has not been made yet.', pendingText: 'Not decided yet' },
      adminReview: { label: 'Admin Review', description: 'Admin is checking your submitted information and documents.', currentText: 'In review' },
      decisionWaiting: { label: 'Decision Pending', description: 'Final approval or rejection decision is still pending.', pendingText: 'Waiting for decision' },
      reviewedRejected: { label: 'Reviewed & Rejected', description: 'Admin reviewed the application and rejected it.', badgeText: 'Rejected' },
      applicationClosed: { label: 'Application Closed', description: 'This application will not move to printing or delivery.', badgeText: 'Closed', pendingText: 'No next stage' },
      cancelled: { label: 'Application Cancelled', description: 'This application is no longer active.', badgeText: 'Cancelled' },
      processClosed: { label: 'Process Closed', description: 'No approval, printing, or delivery stage will run for this application.', badgeText: 'Closed', pendingText: 'No next stage' },
      reviewedApproved: { label: 'Reviewed & Approved', description: 'Admin reviewed your information and approved the application.' },
      cardPrinted: { label: 'Card Printed', description: 'Your Smart NID card has been printed. Digital NID and Correction are now available.' },
      deliveryPending: { label: 'Delivery Pending', description: 'Delivery update has not been added yet.', pendingText: 'Waiting for delivery' },
      printedCompleted: { label: 'Card Printed', description: 'Card printing has been completed.' },
      outForDelivery: { label: 'Out for Delivery', description: 'Your Smart NID card has been dispatched for delivery.', currentText: 'On the way' },
      outForDeliveryCompleted: { label: 'Out for Delivery', description: 'Your Smart NID card was dispatched for delivery.' },
      delivered: { label: 'Delivered', description: 'Your Smart NID card has been delivered successfully.', badgeText: 'Completed' }
    },
    correctionTimeline: {
      submitted: { label: 'Submitted', description: 'Your correction request has been received.' },
      reviewedApproved: { label: 'Reviewed & Approved', description: 'Admin reviewed your old and requested information, then approved the correction.' },
      changesApplied: { label: 'Changes Applied', description: 'Your approved changes have been applied to your NID record.', badgeText: 'Completed' },
      reviewedRejected: { label: 'Reviewed & Rejected', description: 'Admin reviewed the request and rejected it. Check the reason below.' },
      closed: { label: 'Closed', description: 'This correction request is now closed.', badgeText: 'Closed' },
      adminReview: { label: 'Admin Review', description: 'Admin is comparing your old and requested information side by side.' },
      waitingReview: { label: 'Waiting for Admin Review', description: 'Your request is queued for admin review. You will see the decision here.' },
      decisionPending: { label: 'Decision Pending', description: 'The final admin decision has not been made yet.' }
    },
    primary: {
      none: { title: 'No application selected', description: 'Select an application from the left side to see the full status timeline.' },
      processing: { title: 'Your application is currently under process', description: 'The authority is reviewing your submitted information and supporting documents.' },
      printed: { title: 'Your Smart NID card has been printed', description: 'Printing is complete. Digital NID and Correction are available while delivery continues.' },
      dispatched: { title: 'Your Smart NID card has been dispatched', description: 'Your card is now moving through delivery. Keep checking this tracker for the next update.' },
      delivered: { title: 'Your Smart NID card has been delivered', description: 'Delivery is complete. You can now keep the digital version for quick access if available.' },
      rejected: { title: 'Your application has been rejected', description: 'Please read the official rejection reason below. Fix the issue before you apply again.' },
      cancelled: { title: 'This application was cancelled', description: 'This application is no longer active. You can create a new application when needed.' },
      default: { title: 'Follow your latest application update', description: 'Open the timeline below to see the current stage of your application.' }
    },
    correctionPrimary: {
      submitted: { title: 'Correction request submitted', description: 'Your correction is waiting for admin review.' },
      under_review: { title: 'Correction is under review', description: 'Admin is comparing previous and requested information.' },
      approved: { title: 'Correction approved', description: 'Your requested correction has been approved and applied.' },
      rejected: { title: 'Correction rejected', description: 'Please check the rejection reason before applying again.' },
      default: { title: 'Correction update available', description: 'Track the latest correction status here.' }
    },
    timelineTime: { waitingNext: 'Waiting for next update', inProgress: 'In progress', completed: 'Completed' },
    lifecycle: {
    stages: {
      appointment_required: {
        label: 'Biometric appointment required',
        description:
          'Book and complete your biometric appointment before the card can enter printing.',
        currentText: 'Appointment needed'
      },
      appointment_booked: {
        label: 'Biometric appointment scheduled',
        description: 'Attend your appointment on the scheduled date and time.',
        currentText: 'Scheduled'
      },
      waiting_for_printing: {
        label: 'Waiting for card printing',
        description:
          'Your biometric verification is complete. Your card will be prepared for printing.',
        currentText: 'Waiting for printing'
      }
    },
    primary: {
      approvedRequired: {
        title: 'Your application has been approved',
        description:
          'Your review is complete. Book and complete your biometric appointment before printing can begin.'
      },
      approvedBooked: {
        title: 'Biometric appointment scheduled',
        description: 'Attend your appointment on the scheduled date and time.'
      },
      approvedCompleted: {
        title: 'Waiting for card printing',
        description:
          'Your biometric verification is complete. Your card will be prepared for printing.'
      }
    },
    action: {
      bookBiometric: 'Book Biometric Appointment',
      noActionWaiting:
        'No action is needed now. Your card is waiting for printing.',
      noBookingNeeded:
        'Your biometric appointment is already scheduled. No new booking is needed.'
    }
  }
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
    login: {
      logoAria: 'স্মার্ট এনআইডি হোম',
      secureBadge: 'নিরাপদ অ্যাক্সেস',
      title: 'স্বাগতম',
      subtitle: 'স্মার্ট এনআইডি সেবা চালিয়ে যেতে লগইন করুন।',
      emailLabel: 'ইমেইল ঠিকানা',
      emailPlaceholder: 'আপনার ইমেইল ঠিকানা লিখুন',
      emailRequired: 'ইমেইল ঠিকানা আবশ্যক',
      emailInvalid: 'সঠিক ইমেইল ঠিকানা লিখুন',
      passwordLabel: 'পাসওয়ার্ড',
      passwordPlaceholder: 'আপনার পাসওয়ার্ড লিখুন',
      passwordRequired: 'পাসওয়ার্ড আবশ্যক',
      showPassword: 'পাসওয়ার্ড দেখান',
      hidePassword: 'পাসওয়ার্ড লুকান',
      helperText: 'যাচাইকৃত অ্যাকাউন্ট ব্যবহার করুন',
      forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
      loginButton: 'লগইন',
      loggingIn: 'লগইন হচ্ছে...',
      noAccount: 'অ্যাকাউন্ট নেই?',
      registerNow: 'রেজিস্টার করুন',
      success: 'লগইন সফল হয়েছে।',
      invalidCredentials: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন।'
    },
    forgotPasswordPage: {
      requestTitle: 'পাসওয়ার্ড ভুলে গেছেন',
      resetTitle: 'পাসওয়ার্ড রিসেট',
      requestSubtitle: 'রিসেট কোড পেতে আপনার যাচাইকৃত ইমেইল লিখুন।',
      resetSubtitle: '{email} ঠিকানায় পাঠানো ৬ সংখ্যার কোড লিখুন।',
      codeSentNote: 'রিসেট কোড সফলভাবে পাঠানো হয়েছে। আপনার ইনবক্স দেখুন।',
      emailLabel: 'ইমেইল ঠিকানা',
      emailPlaceholder: 'আপনার ইমেইল ঠিকানা লিখুন',
      verificationCodeLabel: 'যাচাইকরণ কোড',
      verificationCodePlaceholder: '৬ সংখ্যার কোড লিখুন',
      newPasswordLabel: 'নতুন পাসওয়ার্ড',
      newPasswordPlaceholder: 'নতুন পাসওয়ার্ড লিখুন',
      confirmPasswordLabel: 'পাসওয়ার্ড নিশ্চিত করুন',
      confirmPasswordPlaceholder: 'নতুন পাসওয়ার্ড আবার লিখুন',
      sending: 'পাঠানো হচ্ছে...',
      sendResetCode: 'রিসেট কোড পাঠান',
      resetting: 'রিসেট হচ্ছে...',
      resetPassword: 'পাসওয়ার্ড রিসেট',
      sendNewCode: 'নতুন কোড পাঠান',
      rememberPassword: 'পাসওয়ার্ড মনে আছে?',
      backToLogin: 'লগইনে ফিরুন',
      showPassword: 'পাসওয়ার্ড দেখান',
      hidePassword: 'পাসওয়ার্ড লুকান',
      enterEmail: 'আপনার ইমেইল ঠিকানা লিখুন।',
      codeSentSuccess: 'পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে।',
      sendFailed: 'রিসেট কোড পাঠানো যায়নি।',
      enterCode: '৬ সংখ্যার কোড লিখুন।',
      passwordMin: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।',
      passwordsDoNotMatch: 'পাসওয়ার্ড মিলছে না।',
      sessionExpired: 'রিসেট সেশন শেষ হয়েছে। নতুন কোড অনুরোধ করুন।',
      resetSuccess: 'পাসওয়ার্ড আপডেট হয়েছে।',
      resetFailed: 'পাসওয়ার্ড আপডেট করা যায়নি।'
    },

    register: {
      logoAlt: 'স্মার্ট এনআইডি কার্ড ম্যানেজমেন্ট সিস্টেম',
      title: 'অ্যাকাউন্ট তৈরি',
      subtitle: 'স্মার্ট এনআইডি সেবার জন্য রেজিস্টার করুন',
      stepPersonal: 'ব্যক্তিগত তথ্য',
      stepAddress: 'ঠিকানা',
      stepSecurity: 'নিরাপত্তা',
      personalInformation: 'ব্যক্তিগত তথ্য',
      fullNameEnglish: 'পূর্ণ নাম (ইংরেজিতে) *',
      fullNameEnglishPlaceholder: 'ইংরেজিতে আপনার পূর্ণ নাম লিখুন',
      fullNameBangla: 'পূর্ণ নাম (বাংলায়) *',
      fullNameBanglaPlaceholder: 'আপনার পুরো নাম লিখুন',
      birthRegNumber: 'জন্ম নিবন্ধন নম্বর *',
      birthRegNumberPlaceholder: '১৭ সংখ্যার জন্ম নিবন্ধন নম্বর লিখুন',
      dateOfBirth: 'জন্ম তারিখ *',
      gender: 'লিঙ্গ *',
      selectGender: 'লিঙ্গ নির্বাচন করুন',
      male: 'পুরুষ',
      female: 'নারী',
      other: 'অন্যান্য',
      placeOfBirth: 'জন্মস্থান (ইংরেজিতে) *',
      placeOfBirthPlaceholder: 'ইংরেজিতে জেলা/শহরের নাম লিখুন',
      mobile: 'মোবাইল নম্বর *',
      email: 'ইমেইল (ইংরেজিতে) *',
      emailPlaceholder: 'email@example.com',
      nextStep: 'পরবর্তী ধাপ →',
      previous: '← পূর্ববর্তী',
      presentAddress: 'বর্তমান ঠিকানা',
      permanentAddress: 'স্থায়ী ঠিকানা',
      division: 'বিভাগ *',
      district: 'জেলা *',
      upazila: 'উপজেলা/থানা *',
      upazilaPlaceholder: 'উপজেলা/থানা লিখুন',
      postCode: 'পোস্ট কোড',
      postCodePlaceholder: 'পোস্ট কোড লিখুন',
      unionWard: 'ইউনিয়ন/ওয়ার্ড',
      unionWardPlaceholder: 'ইউনিয়ন/ওয়ার্ড লিখুন',
      villageHouse: 'গ্রাম/বাড়ি',
      villageHousePlaceholder: 'গ্রাম/বাড়ি/রাস্তা লিখুন',
      selectDivision: 'বিভাগ নির্বাচন করুন',
      selectDistrict: 'জেলা নির্বাচন করুন',
      sameAddress: 'স্থায়ী ঠিকানা বর্তমান ঠিকানার মতো',
      createPassword: 'পাসওয়ার্ড তৈরি',
      password: 'পাসওয়ার্ড *',
      passwordPlaceholder: 'নতুন পাসওয়ার্ড তৈরি করুন',
      confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন *',
      confirmPasswordPlaceholder: 'পাসওয়ার্ড আবার লিখুন',
      passwordHintsTitle: 'পাসওয়ার্ডে যা থাকতে হবে:',
      passwordHintLength: 'কমপক্ষে ৬ অক্ষর',
      passwordHintUpper: 'একটি বড় হাতের অক্ষর',
      passwordHintLower: 'একটি ছোট হাতের অক্ষর',
      passwordHintNumber: 'একটি সংখ্যা',
      agreePrefix: 'আমি',
      termsAndConditions: 'শর্তাবলি',
      and: 'এবং',
      privacyPolicy: 'গোপনীয়তা নীতি',
      agreeSuffix: 'তে সম্মত',
      completeRegistration: 'রেজিস্ট্রেশন সম্পন্ন করুন',
      registering: 'রেজিস্ট্রেশন হচ্ছে...',
      alreadyHaveAccount: 'আগে থেকেই অ্যাকাউন্ট আছে?',
      login: 'লগইন',
      showPassword: 'পাসওয়ার্ড দেখান',
      hidePassword: 'পাসওয়ার্ড লুকান',
      verificationTokenMissing: 'ভেরিফিকেশন টোকেন পাওয়া যায়নি। আবার চেষ্টা করুন।',
      registrationSuccess: 'রেজিস্ট্রেশন সফল হয়েছে। অনুগ্রহ করে ইমেইল যাচাই করুন।',
      registrationFailed: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
      fullNameRequired: 'পূর্ণ নাম আবশ্যক',
      fullNameMin: 'নাম কমপক্ষে ৩ অক্ষরের হতে হবে',
      fullNameBanglaRequired: 'বাংলা নাম আবশ্যক',
      birthRegNumberRequired: 'জন্ম নিবন্ধন নম্বর আবশ্যক',
      birthRegNumberInvalid: 'সঠিক ১৭ সংখ্যার জন্ম নিবন্ধন নম্বর লিখুন',
      dateOfBirthRequired: 'জন্ম তারিখ আবশ্যক',
      genderRequired: 'লিঙ্গ নির্বাচন করুন',
      placeOfBirthRequired: 'জন্মস্থান আবশ্যক',
      mobileRequired: 'মোবাইল নম্বর আবশ্যক',
      mobileInvalid: 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন',
      emailRequired: 'ইমেইল ঠিকানা আবশ্যক',
      emailInvalid: 'সঠিক ইমেইল ঠিকানা লিখুন',
      divisionRequired: 'বিভাগ নির্বাচন করুন',
      districtRequired: 'জেলা নির্বাচন করুন',
      upazilaRequired: 'উপজেলা/থানা আবশ্যক',
      passwordRequired: 'পাসওয়ার্ড আবশ্যক',
      passwordMin: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে',
      passwordPattern: 'পাসওয়ার্ডে বড় হাতের, ছোট হাতের অক্ষর এবং একটি সংখ্যা থাকতে হবে',
      confirmPasswordRequired: 'পাসওয়ার্ড নিশ্চিত করুন।',
      passwordMismatch: 'পাসওয়ার্ড মিলছে না',
      agreeTermsRequired: 'শর্তাবলিতে সম্মতি দিতে হবে'
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
      note: 'ডিজিটাল পাবলিক সার্ভিসের জন্য তৈরি।',
      quickLinks: 'দ্রুত লিংক',
      home: 'হোম',
      register: 'রেজিস্টার',
      login: 'লগইন',
      trackApplication: 'আবেদন ট্র্যাকিং',
      citizenServices: 'নাগরিক সেবা',
      applyForNid: 'এনআইডি আবেদন',
      forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন',
      otpVerification: 'OTP যাচাই',
      services: 'সেবা',
      contact: 'যোগাযোগ',
      phoneNumber: '+৮৮০ ১০০০-০০০০০০',
      demoAddress: 'ডেমো সার্ভিস অফিস, ঢাকা, বাংলাদেশ'
    },

    support: {
  title: 'সাপোর্ট সেন্টার',
  subtitle: 'আপনার স্মার্ট এনআইডি আবেদন ও সেবা সংক্রান্ত সমস্যার জন্য সহায়তা নিন।',
  createNewTicket: 'নতুন টিকিট তৈরি করুন',
  createTicket: 'টিকিট তৈরি করুন',
  myTickets: 'আমার টিকিট',
  activeSupport: 'সক্রিয় সাপোর্ট',
  noTicketsTitle: 'এখনো কোনো সাপোর্ট টিকিট নেই',
  noTicketsDescription: 'সহায়তা প্রয়োজন হলে আপনার প্রথম টিকিট তৈরি করুন।',
  selectTicketTitle: 'একটি টিকিট নির্বাচন করুন',
  selectTicketDescription:
    'সম্পূর্ণ কথোপকথন দেখতে এবং উত্তর পাঠাতে তালিকা থেকে একটি টিকিট নির্বাচন করুন।',
  openFirstTicket: 'প্রথম টিকিট খুলুন',
  loadingTickets: 'সাপোর্ট টিকিট লোড হচ্ছে...',
  loadingDetails: 'টিকিটের বিস্তারিত লোড হচ্ছে...',
  category: 'ক্যাটাগরি',
  subject: 'বিষয়',
  created: 'তৈরি হয়েছে',
  conversation: 'কথোপকথন',
  you: 'আপনি',
  supportTeam: 'সাপোর্ট টিম',
  replyMessage: 'উত্তর বার্তা',
  replyPlaceholder: 'আপনার বার্তা লিখুন...',
  sending: 'পাঠানো হচ্ছে...',
  sendMessage: 'বার্তা পাঠান',
  closedNote: 'এই টিকিটটি {status}। নতুন উত্তর পাঠানো যাবে না।',
  modalTitle: 'সাপোর্ট টিকিট তৈরি করুন',
  modalSubtitle: 'আপনার সমস্যাটি লিখুন, আমাদের টিম আপনাকে সহায়তা করবে।',
  subjectLabel: 'বিষয় *',
  subjectPlaceholder: 'আপনার সমস্যার সংক্ষিপ্ত বিবরণ',
  categoryLabel: 'ক্যাটাগরি *',
  selectCategory: 'ক্যাটাগরি নির্বাচন করুন',
  priorityLabel: 'অগ্রাধিকার',
  descriptionLabel: 'বিস্তারিত বিবরণ *',
  descriptionPlaceholder: 'আপনার সমস্যাটি বিস্তারিত লিখুন...',
  cancel: 'বাতিল',
  creating: 'তৈরি হচ্ছে...',
  statuses: {
    open: 'খোলা',
    in_progress: 'চলমান',
    resolved: 'সমাধান হয়েছে',
    closed: 'বন্ধ'
  },
  categories: {
    application_issue: 'আবেদন সংক্রান্ত সমস্যা',
    appointment: 'অ্যাপয়েন্টমেন্ট',
    payment: 'পেমেন্ট',
    delivery: 'ডেলিভারি',
    technical: 'টেকনিক্যাল সমস্যা',
    other: 'অন্যান্য'
  },
  priorities: {
    low: 'কম',
    medium: 'মাঝারি',
    high: 'উচ্চ',
    urgent: 'জরুরি'
  },
  validation: {
    subjectRequired: 'বিষয় লিখতে হবে',
    categoryRequired: 'ক্যাটাগরি নির্বাচন করতে হবে',
    descriptionRequired: 'বিস্তারিত বিবরণ লিখতে হবে',
    descriptionMin: 'বিস্তারিত বিবরণ কমপক্ষে ২০ অক্ষরের হতে হবে'
  },
  toasts: {
    loadFailed: 'সাপোর্ট টিকিট লোড করা যায়নি।',
    detailsFailed: 'টিকিটের বিস্তারিত লোড করা যায়নি।',
    createSuccess: 'সাপোর্ট টিকিট সফলভাবে তৈরি হয়েছে।',
    createFailed: 'সাপোর্ট টিকিট তৈরি করা যায়নি।',
    messageSuccess: 'বার্তা সফলভাবে পাঠানো হয়েছে।',
    messageFailed: 'বার্তা পাঠানো যায়নি।'
  }
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
      uploadPhoto: 'পাসপোর্ট সাইজ ছবি আপলোড করুন।',
      uploadSignature: 'স্বাক্ষর আপলোড করুন।',
      uploadBirthCertificate: 'জন্মনিবন্ধন সনদ আপলোড করুন।',
      uploadCorrectionProof: 'সংশোধনের প্রমাণ আপলোড করুন।'
    },
    tracker: {
loadingApplications: 'আবেদনসমূহ লোড হচ্ছে...',
    headerTitle: 'আপনার স্মার্ট NID আবেদন ট্র্যাক করুন',
    headerSubtitle: 'আপনার আবেদনের প্রতিটি ধাপ এক জায়গায় দেখুন।',
    currentPrefix: 'বর্তমান:',
    syncing: 'সিঙ্ক হচ্ছে...',
    autoSyncedPrefix: 'সর্বশেষ সিঙ্ক:',
    myApplications: 'আমার আবেদনসমূহ',
    myApplicationsHint: 'সম্পূর্ণ অগ্রগতি দেখতে একটি আবেদন খুলুন।',
    noApplicationsFound: 'কোনো আবেদন পাওয়া যায়নি',
    noApplicationsHint: 'আপনি এখনো কোনো আবেদন জমা দেননি।',
    applyNow: 'এখন আবেদন করুন',
    applicationPrefix: 'আবেদন',
    applicationType: 'আবেদনের ধরন',
    currentStatus: 'বর্তমান অবস্থা',
    submittedOn: 'জমা দেওয়ার সময়',
    lastUpdated: 'সর্বশেষ আপডেট',
    needActionTitle: 'কোনো পদক্ষেপ প্রয়োজন?',
    needActionHint: 'বর্তমান আবেদনের অবস্থার ভিত্তিতে এখানে অপশন দেখাবে।',
    contactSupport: 'সাপোর্টে যোগাযোগ',
    openDigitalNid: 'ডিজিটাল NID দেখুন',
    applyAgain: 'আবার আবেদন করুন',
    correctionRequest: 'সংশোধন আবেদন',
    officialRejectionReason: 'অফিসিয়াল প্রত্যাখ্যানের কারণ',
    applicationProgress: 'আবেদনের অগ্রগতি',
    applicationProgressHint: 'ডুপ্লিকেট তথ্য এড়াতে অফিসিয়াল ধাপগুলো একটি সংক্ষিপ্ত টাইমলাইনে দেখানো হয়েছে।',
    selectApplication: 'একটি আবেদন নির্বাচন করুন',
    selectApplicationHint: 'বিস্তারিত দেখতে বাম পাশ থেকে একটি আবেদন নির্বাচন করুন।',
    correctionRequestProgress: 'সংশোধন আবেদনের অগ্রগতি',
    correctionRequestHint: 'আপনি সংশোধন আবেদন জমা দিয়েছেন বলেই এই অংশটি দেখানো হচ্ছে।',
    baseApplication: 'মূল আবেদন',
    changedFields: 'পরিবর্তিত ফিল্ড',
    correctionRejectionReason: 'সংশোধন প্রত্যাখ্যানের কারণ',
    previousCorrectionRequests: 'আগের সংশোধন আবেদনসমূহ',
    submittedPrefix: 'জমা:',
    updatedPrefix: 'আপডেট:',
    statusTime: 'স্ট্যাটাস সময়',
    stepPrefix: 'ধাপ',
    finalRejectedTitle: 'চূড়ান্ত রিভিউ ফলাফল: প্রত্যাখ্যাত',
    finalRejectedDescription: 'রিভিউ ধাপের পর আবেদনটি বন্ধ হয়েছে। এটি অনুমোদন, প্রিন্টিং, ডিসপ্যাচ বা ডেলিভারি ধাপে যায়নি।',
    finalCancelledTitle: 'চূড়ান্ত রিভিউ ফলাফল: বাতিল',
    finalCancelledDescription: 'এই আবেদনটি আর সক্রিয় নয় এবং পরবর্তী ধাপে যাবে না।',
    notAvailable: 'প্রযোজ্য নয়',
    statusBadges: { current: 'চলমান', completed: 'সম্পন্ন', pending: 'অপেক্ষমাণ' },
    statuses: {
      draft: 'ড্রাফট', submitted: 'জমা হয়েছে', under_review: 'রিভিউ চলছে', approved: 'অনুমোদিত',
      printed: 'প্রিন্টেড', dispatched: 'ডিসপ্যাচড', delivered: 'ডেলিভার্ড', rejected: 'প্রত্যাখ্যাত',
      cancelled: 'বাতিল করা হয়েছে', new: 'নতুন', correction: 'সংশোধন'
    },
    timeline: {
      submitted: { label: 'জমা হয়েছে', description: 'আপনার আবেদন সফলভাবে গ্রহণ করা হয়েছে।', currentText: 'এখন জমা হয়েছে' },
      waitingReview: { label: 'অ্যাডমিন রিভিউয়ের অপেক্ষায়', description: 'আপনার আবেদন অ্যাডমিন যাচাইয়ের জন্য অপেক্ষমাণ আছে।', pendingText: 'রিভিউয়ের অপেক্ষায়' },
      decisionPending: { label: 'সিদ্ধান্ত অপেক্ষমাণ', description: 'অনুমোদন বা প্রত্যাখ্যানের সিদ্ধান্ত এখনো নেওয়া হয়নি।', pendingText: 'সিদ্ধান্ত হয়নি' },
      adminReview: { label: 'অ্যাডমিন রিভিউ', description: 'অ্যাডমিন আপনার জমা দেওয়া তথ্য ও ডকুমেন্ট যাচাই করছেন।', currentText: 'রিভিউ চলছে' },
      decisionWaiting: { label: 'সিদ্ধান্ত অপেক্ষমাণ', description: 'চূড়ান্ত অনুমোদন বা প্রত্যাখ্যানের সিদ্ধান্ত এখনো অপেক্ষমাণ।', pendingText: 'সিদ্ধান্তের অপেক্ষায়' },
      reviewedRejected: { label: 'রিভিউ শেষে প্রত্যাখ্যাত', description: 'অ্যাডমিন আবেদনটি রিভিউ করে প্রত্যাখ্যান করেছেন।', badgeText: 'প্রত্যাখ্যাত' },
      applicationClosed: { label: 'আবেদন বন্ধ', description: 'এই আবেদনটি প্রিন্টিং বা ডেলিভারি ধাপে যাবে না।', badgeText: 'বন্ধ', pendingText: 'পরবর্তী ধাপ নেই' },
      cancelled: { label: 'আবেদন বাতিল', description: 'এই আবেদনটি আর সক্রিয় নেই।', badgeText: 'বাতিল' },
      processClosed: { label: 'প্রক্রিয়া বন্ধ', description: 'এই আবেদনের জন্য অনুমোদন, প্রিন্টিং বা ডেলিভারি ধাপ চলবে না।', badgeText: 'বন্ধ', pendingText: 'পরবর্তী ধাপ নেই' },
      reviewedApproved: { label: 'রিভিউ শেষে অনুমোদিত', description: 'অ্যাডমিন আপনার তথ্য যাচাই করে আবেদনটি অনুমোদন করেছেন।' },
      cardPrinted: { label: 'কার্ড প্রিন্টেড', description: 'আপনার স্মার্ট NID কার্ড প্রিন্ট হয়েছে। এখন ডিজিটাল NID ও সংশোধন সুবিধা পাওয়া যাবে।' },
      deliveryPending: { label: 'ডেলিভারি অপেক্ষমাণ', description: 'ডেলিভারি আপডেট এখনো যোগ করা হয়নি।', pendingText: 'ডেলিভারির অপেক্ষায়' },
      printedCompleted: { label: 'কার্ড প্রিন্টেড', description: 'কার্ড প্রিন্টিং সম্পন্ন হয়েছে।' },
      outForDelivery: { label: 'ডেলিভারির পথে', description: 'আপনার স্মার্ট NID কার্ড ডেলিভারির জন্য পাঠানো হয়েছে।', currentText: 'পথে আছে' },
      outForDeliveryCompleted: { label: 'ডেলিভারির পথে', description: 'আপনার স্মার্ট NID কার্ড ডেলিভারির জন্য পাঠানো হয়েছিল।' },
      delivered: { label: 'ডেলিভার্ড', description: 'আপনার স্মার্ট NID কার্ড সফলভাবে ডেলিভারি হয়েছে।', badgeText: 'সম্পন্ন' }
    },
    correctionTimeline: {
      submitted: { label: 'জমা হয়েছে', description: 'আপনার সংশোধন আবেদন গ্রহণ করা হয়েছে।' },
      reviewedApproved: { label: 'রিভিউ শেষে অনুমোদিত', description: 'অ্যাডমিন পুরোনো ও নতুন তথ্য যাচাই করে সংশোধন অনুমোদন করেছেন।' },
      changesApplied: { label: 'পরিবর্তন প্রয়োগ হয়েছে', description: 'আপনার অনুমোদিত পরিবর্তন NID রেকর্ডে প্রয়োগ করা হয়েছে।', badgeText: 'সম্পন্ন' },
      reviewedRejected: { label: 'রিভিউ শেষে প্রত্যাখ্যাত', description: 'অ্যাডমিন আবেদনটি রিভিউ করে প্রত্যাখ্যান করেছেন। নিচে কারণ দেখুন।' },
      closed: { label: 'বন্ধ', description: 'এই সংশোধন আবেদনটি এখন বন্ধ।', badgeText: 'বন্ধ' },
      adminReview: { label: 'অ্যাডমিন রিভিউ', description: 'অ্যাডমিন আপনার পুরোনো ও নতুন তথ্য পাশাপাশি যাচাই করছেন।' },
      waitingReview: { label: 'অ্যাডমিন রিভিউয়ের অপেক্ষায়', description: 'আপনার আবেদন অ্যাডমিন রিভিউয়ের জন্য অপেক্ষমাণ। সিদ্ধান্ত এখানে দেখাবে।' },
      decisionPending: { label: 'সিদ্ধান্ত অপেক্ষমাণ', description: 'চূড়ান্ত অ্যাডমিন সিদ্ধান্ত এখনো নেওয়া হয়নি।' }
    },
    primary: {
      none: { title: 'কোনো আবেদন নির্বাচন করা হয়নি', description: 'সম্পূর্ণ স্ট্যাটাস টাইমলাইন দেখতে বাম পাশ থেকে একটি আবেদন নির্বাচন করুন।' },
      processing: { title: 'আপনার আবেদন বর্তমানে প্রক্রিয়াধীন', description: 'কর্তৃপক্ষ আপনার জমা দেওয়া তথ্য ও সহায়ক ডকুমেন্ট যাচাই করছে।' },
      printed: { title: 'আপনার স্মার্ট NID কার্ড প্রিন্ট হয়েছে', description: 'প্রিন্টিং সম্পন্ন হয়েছে। ডেলিভারি চলাকালীন ডিজিটাল NID ও সংশোধন সুবিধা পাওয়া যাবে।' },
      dispatched: { title: 'আপনার স্মার্ট NID কার্ড ডিসপ্যাচ হয়েছে', description: 'আপনার কার্ড এখন ডেলিভারি প্রক্রিয়ায় আছে। পরবর্তী আপডেটের জন্য এই ট্র্যাকার দেখুন।' },
      delivered: { title: 'আপনার স্মার্ট NID কার্ড ডেলিভারি হয়েছে', description: 'ডেলিভারি সম্পন্ন হয়েছে। প্রয়োজন হলে দ্রুত ব্যবহারের জন্য ডিজিটাল কপি রাখতে পারেন।' },
      rejected: { title: 'আপনার আবেদন প্রত্যাখ্যাত হয়েছে', description: 'নিচে অফিসিয়াল প্রত্যাখ্যানের কারণ দেখুন। আবার আবেদন করার আগে সমস্যাটি ঠিক করুন।' },
      cancelled: { title: 'এই আবেদনটি বাতিল করা হয়েছে', description: 'এই আবেদনটি আর সক্রিয় নয়। প্রয়োজন হলে নতুন আবেদন তৈরি করতে পারবেন।' },
      default: { title: 'আপনার সর্বশেষ আবেদন আপডেট অনুসরণ করুন', description: 'আবেদনের বর্তমান ধাপ দেখতে নিচের টাইমলাইন দেখুন।' }
    },
    correctionPrimary: {
      submitted: { title: 'সংশোধন আবেদন জমা হয়েছে', description: 'আপনার সংশোধন আবেদন অ্যাডমিন রিভিউয়ের অপেক্ষায় আছে।' },
      under_review: { title: 'সংশোধন রিভিউ চলছে', description: 'অ্যাডমিন আগের ও অনুরোধকৃত তথ্য তুলনা করছেন।' },
      approved: { title: 'সংশোধন অনুমোদিত', description: 'আপনার অনুরোধকৃত সংশোধন অনুমোদিত ও প্রয়োগ হয়েছে।' },
      rejected: { title: 'সংশোধন প্রত্যাখ্যাত', description: 'আবার আবেদন করার আগে প্রত্যাখ্যানের কারণ দেখে নিন।' },
      default: { title: 'সংশোধন আপডেট পাওয়া গেছে', description: 'সর্বশেষ সংশোধন স্ট্যাটাস এখানে ট্র্যাক করুন।' }
    },
    timelineTime: { waitingNext: 'পরবর্তী আপডেটের অপেক্ষায়', inProgress: 'চলমান', completed: 'সম্পন্ন' },
    lifecycle: {
    stages: {
      appointment_required: {
        label: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট প্রয়োজন',
        description:
          'কার্ড প্রিন্টিংয়ের আগে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক ও সম্পন্ন করতে হবে।',
        currentText: 'অ্যাপয়েন্টমেন্ট প্রয়োজন'
      },
      appointment_booked: {
        label: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট নির্ধারিত',
        description: 'নির্ধারিত তারিখ ও সময়ে অ্যাপয়েন্টমেন্টে উপস্থিত থাকুন।',
        currentText: 'নির্ধারিত'
      },
      waiting_for_printing: {
        label: 'কার্ড প্রিন্টিংয়ের অপেক্ষায়',
        description:
          'আপনার বায়োমেট্রিক যাচাই সম্পন্ন হয়েছে। আপনার কার্ড প্রিন্টিংয়ের জন্য প্রস্তুত করা হবে।',
        currentText: 'প্রিন্টিংয়ের অপেক্ষায়'
      }
    },
    primary: {
      approvedRequired: {
        title: 'আপনার আবেদন অনুমোদিত হয়েছে',
        description:
          'রিভিউ সম্পন্ন হয়েছে। প্রিন্টিং শুরু করার আগে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক ও সম্পন্ন করুন।'
      },
      approvedBooked: {
        title: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট নির্ধারিত',
        description: 'নির্ধারিত তারিখ ও সময়ে অ্যাপয়েন্টমেন্টে উপস্থিত থাকুন।'
      },
      approvedCompleted: {
        title: 'কার্ড প্রিন্টিংয়ের অপেক্ষায়',
        description:
          'আপনার বায়োমেট্রিক যাচাই সম্পন্ন হয়েছে। আপনার কার্ড প্রিন্টিংয়ের জন্য প্রস্তুত করা হবে।'
      }
    },
    action: {
      bookBiometric: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করুন',
      noActionWaiting:
        'এখন কোনো পদক্ষেপ প্রয়োজন নেই। আপনার কার্ড প্রিন্টিংয়ের অপেক্ষায় রয়েছে।',
      noBookingNeeded:
        'আপনার বায়োমেট্রিক অ্যাপয়েন্টমেন্ট নির্ধারিত আছে। নতুন বুকিং প্রয়োজন নেই।'
    }
  }
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

  const getTranslation = useCallback(
    (key) => {
      const translatedValue =
        getNestedValue(translations[language], key) ??
        getNestedValue(translations.en, key) ??
        null;

      return translatedValue && typeof translatedValue === 'object'
        ? translatedValue
        : {};
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      languageOptions,
      t,
      getTranslation,
      isBangla: language === 'bn'
    }),
    [language, setLanguage, t, getTranslation]
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
