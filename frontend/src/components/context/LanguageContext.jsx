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

const DEFAULT_APPOINTMENT_DETAILS = {
  date: 'Date',
  time: 'Time',
  center: 'Center',
  notAvailable: 'Not available',
  empty: 'Appointment details will appear here once available.'
};

const DEFAULT_APPLICATION_TYPE_LABELS = {
  new: 'New NID',
  correction: 'Correction',
  reissue: 'Reissue'
};

const DEFAULT_STAGE_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  correction_required: 'Correction required',
  appointment_required: 'Appointment required',
  appointment_booked: 'Appointment booked',
  waiting_for_printing: 'Waiting for printing',
  printed: 'Card printed',
  dispatched: 'Delivery in progress',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};

const dashboardSideCardTranslations = {
  en: {
    appointmentDetails: DEFAULT_APPOINTMENT_DETAILS,
    appointmentRequired: {
      title: 'Appointment required',
      description: 'Book your biometric appointment to continue the NID process.',
      actionLabel: 'Book appointment'
    },
    appointmentBooked: {
      title: 'Appointment booked',
      description: 'Your biometric appointment is scheduled.'
    },
    whatHappensNext: {
      title: 'What happens next',
      description:
        'Attend your biometric appointment. After verification is completed, your application will move to card printing.'
    },
    waitingForPrinting: {
      title: 'Waiting for card printing',
      description:
        'Your biometric verification is complete. Your card will be prepared for printing.'
    },
    cardPrinted: {
      title: 'Card printed',
      description: 'Your NID card has been printed. Digital NID is now available.',
      actionLabel: 'View Digital NID'
    },
    deliveryRequest: {
      title: 'Delivery request',
      description:
        'Your card is printed. Complete the delivery request to receive it at your address.',
      actionLabel: 'Pay delivery fee'
    },
    deliveryRequested: {
      title: 'Delivery requested',
      description:
        'Your delivery request has been received. Dispatch updates will appear soon.'
    },
    deliveryInProgress: {
      title: 'Delivery in progress',
      description:
        'Your NID card has been dispatched. Track delivery updates from the status page.',
      actionLabel: 'View full status'
    },
    cardDelivered: {
      title: 'Card delivered',
      description: 'Your NID card has been delivered.',
      actionLabel: 'View Digital NID'
    },
    review: {
      title: 'Application under review',
      description:
        'Your application is being reviewed. You will be notified when the next step is available.'
    },
    rejected: {
      title: 'Application rejected',
      description: 'Please review the reason and submit a new application if required.'
    },
    cancelled: {
      title: 'Application cancelled',
      description: 'This application is no longer active.'
    }
  },
  bn: {
    appointmentDetails: {
      date: 'তারিখ',
      time: 'সময়',
      center: 'কেন্দ্র',
      notAvailable: 'পাওয়া যায়নি',
      empty: 'তথ্য পাওয়া গেলে অ্যাপয়েন্টমেন্টের বিস্তারিত এখানে দেখানো হবে।'
    },
    appointmentRequired: {
      title: 'অ্যাপয়েন্টমেন্ট প্রয়োজন',
      description: 'এনআইডি প্রক্রিয়া চালিয়ে যেতে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করুন।',
      actionLabel: 'অ্যাপয়েন্টমেন্ট বুক করুন'
    },
    appointmentBooked: {
      title: 'অ্যাপয়েন্টমেন্ট বুক হয়েছে',
      description: 'আপনার বায়োমেট্রিক অ্যাপয়েন্টমেন্ট নির্ধারিত হয়েছে।'
    },
    whatHappensNext: {
      title: 'পরবর্তী ধাপ',
      description:
        'বায়োমেট্রিক অ্যাপয়েন্টমেন্টে উপস্থিত থাকুন। যাচাই সম্পন্ন হলে আপনার আবেদন কার্ড প্রিন্টিং ধাপে যাবে।'
    },
    waitingForPrinting: {
      title: 'কার্ড প্রিন্টিংয়ের অপেক্ষায়',
      description:
        'আপনার বায়োমেট্রিক যাচাই সম্পন্ন হয়েছে। আপনার কার্ড প্রিন্টিংয়ের জন্য প্রস্তুত করা হবে।'
    },
    cardPrinted: {
      title: 'কার্ড প্রিন্ট সম্পন্ন',
      description: 'আপনার এনআইডি কার্ড প্রিন্ট সম্পন্ন হয়েছে। ডিজিটাল এনআইডি এখন উপলব্ধ।',
      actionLabel: 'ডিজিটাল এনআইডি দেখুন'
    },
    deliveryRequest: {
      title: 'ডেলিভারি অনুরোধ',
      description:
        'আপনার কার্ড প্রিন্ট সম্পন্ন হয়েছে। ঠিকানায় কার্ড পেতে ডেলিভারি অনুরোধ সম্পন্ন করুন।',
      actionLabel: 'ডেলিভারি ফি পরিশোধ করুন'
    },
    deliveryRequested: {
      title: 'ডেলিভারি অনুরোধ গ্রহণ করা হয়েছে',
      description:
        'আপনার ডেলিভারি অনুরোধ গ্রহণ করা হয়েছে। পাঠানোর আপডেট শিগগিরই দেখানো হবে।'
    },
    deliveryInProgress: {
      title: 'ডেলিভারি চলমান',
      description:
        'আপনার এনআইডি কার্ড পাঠানো হয়েছে। স্ট্যাটাস পেজ থেকে ডেলিভারি আপডেট দেখুন।',
      actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন'
    },
    cardDelivered: {
      title: 'কার্ড বিতরণ সম্পন্ন',
      description: 'আপনার এনআইডি কার্ড বিতরণ সম্পন্ন হয়েছে।',
      actionLabel: 'ডিজিটাল এনআইডি দেখুন'
    },
    review: {
      title: 'আবেদন পর্যালোচনাধীন',
      description:
        'আপনার আবেদন পর্যালোচনা করা হচ্ছে। পরবর্তী ধাপ উপলব্ধ হলে আপনাকে জানানো হবে।'
    },
    rejected: {
      title: 'আবেদন বাতিল হয়েছে',
      description: 'কারণটি পর্যালোচনা করুন এবং প্রয়োজন হলে নতুন আবেদন জমা দিন।'
    },
    cancelled: {
      title: 'আবেদন বাতিল করা হয়েছে',
      description: 'এই আবেদনটি আর সক্রিয় নয়।'
    }
  }
};

const dashboardPageTranslations = {
  en: {
    loading: 'Loading your dashboard...',
    citizen: 'Citizen',
    welcomePrefix: 'Welcome',
    welcomeSubtitle:
      'Track your applications, appointments, corrections, and service updates from one place.',
    syncing: 'Syncing...',
    autoSynced: 'Auto synced',
    applyForNewNid: 'Apply for New NID',
    applyForCorrection: 'Apply for Correction',
    newNidLocked: 'New NID application is locked',
    startApplication: 'Start Application',
    activeApplication: 'Active Application',
    currentStatus: 'Current Status',
    applicationType: 'Application Type',
    currentStage: 'Current Stage',
    nextStep: 'Next Step',
    applicationId: 'Application ID',
    submittedOn: 'Submitted On',
    lastUpdated: 'Last Updated',
    rejectionReason: 'Rejection Reason',
    latestUpdates: 'Latest Updates',
    quickActions: 'Quick Actions',
    continueJourney: 'Continue your application journey',
    startFromHere: 'Start from here',
    quickActionsWithApps:
      'Use these shortcuts to continue your Smart NID journey.',
    quickActionsNoApps:
      'Complete your first Smart NID process step by step from these quick shortcuts.',
    recentApplications: 'Recent Applications',
    gettingStarted: 'Getting Started',
    recentApplicationsText:
      'Review your latest submitted applications and open details quickly.',
    gettingStartedText:
      'A quick overview of what to prepare before submitting your first application.',
    viewAll: 'View All',
    viewFullStatus: 'View full status',
    noApplicationsYet: 'No applications yet',
    noApplicationsText:
      'You have not submitted any Smart NID application yet. Prepare the required information, then start the process from the apply page.',
    applyNow: 'Apply Now',
    needHelp: 'Need Help?',
    open: 'Open',
    viewDetails: 'View Details',
    digitalNid: 'Digital NID',
    heroStatusLabels: {
      appointmentNeeded: 'Appointment needed',
      appointmentBooked: 'Appointment booked',
      waitingForPrinting: 'Waiting for printing',
      digitalNidAvailable: 'Digital NID available',
      deliveryInProgress: 'Delivery in progress',
      delivered: 'Delivered'
    },
    nextStepLabels: {
      review: 'Wait for review',
      appointmentRequired: 'Book appointment',
      appointmentBooked: 'Attend appointment',
      waitingForPrinting: 'No action needed',
      requestDelivery: 'Request delivery',
      waitForDispatch: 'Wait for dispatch',
      trackDelivery: 'Track delivery',
      viewDigitalNid: 'View Digital NID',
      noActionNeeded: 'No action needed',
      reviewStatus: 'Review status',
      applyAgain: 'Review and apply again',
      contactSupport: 'Contact support'
    },
    deliveryPayment: {
      payFee: 'Pay Delivery Fee',
      payShort: 'Pay Delivery',
      quickTitle: 'Delivery Payment',
      quickDescription: 'Pay the delivery fee after your card is printed',
      requested: 'Delivery request submitted',
      waitingDispatch: 'Payment completed. Waiting for dispatch.'
    },
    type: 'Type',
    submitted: 'Submitted',
    updated: 'Updated',
    status: 'Status',
    reviewStatus: 'Review Status',
    action: 'Action',
    reason: 'Reason',
    na: 'N/A',
    statusLabels: {
      draft: 'Draft',
      submitted: 'Submitted',
      under_review: 'Under Review',
      correction_required: 'Correction Required',
      approved: 'Approved',
      rejected: 'Rejected',
      printed: 'Printed',
      dispatched: 'Dispatched',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    },
    recentReviewStatusLabels: {
      submitted: 'Submitted',
      under_review: 'Under review',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    },
    applicationTypeLabels: DEFAULT_APPLICATION_TYPE_LABELS,
    stageLabels: DEFAULT_STAGE_LABELS,
    appointmentDetails: DEFAULT_APPOINTMENT_DETAILS,
    highlights: [
      {
        title: 'Prepare your documents',
        description:
          'Keep birth registration number, photo, signature image, and mobile number ready.'
      },
      {
        title: 'Submit and wait for review',
        description:
          'After submission, the authority will verify your information and documents.'
      },
      {
        title: 'Track every next step',
        description:
          'Follow approval, appointment, printing, and delivery updates from this dashboard.'
      }
    ],
    primary: {
      noApplication: {
        badge: 'Not Started',
        title: 'Start your first Smart NID application',
        description:
          'You have not submitted any application yet. Once you apply, your live status, appointment progress, and delivery updates will appear here.',
        actionLabel: 'Apply for NID',
        secondaryActionLabel: 'Contact support'
      },
      submitted: {
        badge: 'Submitted',
        title: 'Your application has been submitted',
        description:
          'Your application is waiting for official review. You can track the full status while the authority starts verification.',
        actionLabel: 'View full status',
        secondaryActionLabel: 'Contact support'
      },
      review: {
        badge: 'In Review',
        title: 'Your application is under verification',
        description:
          'Your submitted information and supporting documents are being reviewed by the authority.',
        actionLabel: 'View full status',
        secondaryActionLabel: 'Contact support'
      },
      correctionRequired: {
        badge: 'Correction Required',
        title: 'Your application needs correction',
        description:
          'The authority has requested correction for this application. Review the correction note, update the required information or document, and resubmit when ready.',
        actionLabel: 'View correction details',
        secondaryActionLabel: 'Contact support'
      },
      approved: {
        badge: 'Approved',
        title: 'Your application has been approved',
        descriptionBooked:
          'Your application is approved and your appointment progress is now the most important update.',
        descriptionNoBooking:
          'Your application is approved. Please book your biometric appointment as the next step.',
        actionBooked: 'View full status',
        actionNoBooking: 'Book appointment',
        secondaryActionLabel: 'View full status'
      },
      printed: {
        badge: 'Printed',
        title: 'Your Smart NID has been printed',
        description:
          'Printing is complete. The next official delivery update will appear here automatically.',
        actionLabel: 'View full status',
        secondaryActionLabel: ''
      },
      dispatched: {
        badge: 'Dispatched',
        title: 'Your Smart NID is on the way',
        description:
          'Your card has already been dispatched and is now moving through delivery.',
        actionLabel: 'View full status',
        secondaryActionLabel: ''
      },
      delivered: {
        badge: 'Delivered',
        title: 'Your Smart NID has been delivered',
        description:
          'Delivery is complete. You can now keep the digital copy for quick reference if available.',
        actionLabel: 'View full status',
        secondaryActionLabel: ''
      },
      rejected: {
        badge: 'Rejected',
        title: 'Your application needs correction',
        description:
          'Your application was rejected during review. Please read the official reason below and take the next action.',
        actionLabel: 'View full status',
        secondaryActionLabel: ''
      },
      cancelled: {
        badge: 'Cancelled',
        title: 'Your previous application was cancelled',
        description:
          'This application is no longer active. You can start a new application whenever you are ready.',
        actionLabel: 'View full status',
        secondaryActionLabel: ''
      },
      default: {
        title: 'Follow your latest NID update',
        description:
          'Your latest application status is available here. Open the tracker for full details.',
        actionLabel: 'View full status',
        secondaryActionLabel: 'Contact support'
      }
    },
    sidePanels: {
      beforeApply: {
        title: 'Before you apply',
        description:
          'Keep your birth registration number, recent photo, signature image, and mobile number ready before starting.',
        actionLabel: 'Apply now'
      },
      processWorks: {
        title: 'How the process works',
        description:
          'Apply first, wait for review, complete biometric appointment after approval, then follow printing and delivery updates.',
        actionLabel: 'Contact support'
      },
      rejectedAction: {
        title: 'What you should do now',
        description:
          'Review the rejection reason carefully. Update the incorrect document or information before you submit again.',
        actionLabel: 'Apply again'
      },
      rejectedHelp: {
        title: 'Need help with correction?',
        description:
          'Contact support if you need guidance about the rejection reason or the next correction step.',
        actionLabel: 'Get support'
      },
      cancelledAction: {
        title: 'Application is no longer active',
        description:
          'This application will not move forward. Start a new application when you are ready.',
        actionLabel: 'Apply again'
      },
      cancelledHelp: {
        title: 'Need any support?',
        description:
          'If you cancelled by mistake or need guidance before applying again, contact support.',
        actionLabel: 'Contact support'
      },
      reviewProgress: {
        title: 'Review in progress',
        description:
          'Your application is currently under review. No appointment action is needed yet.',
        actionLabel: 'Track application'
      },
      correctionAction: {
        title: 'Correction required',
        description:
          'Check which information or document needs correction before you submit the updated application again.',
        actionLabel: 'View correction'
      },
      correctionHelp: {
        title: 'Need help with correction?',
        description:
          'Create a support ticket if the correction note is unclear or if you need help with correction documents.',
        actionLabel: 'Contact support'
      },
      nextAfterReview: {
        title: 'What happens next?',
        description:
          'After approval, biometric appointment booking and later delivery updates will appear here.',
        actionLabel: 'View full status'
      },
      appointmentBooked: {
        title: 'Appointment booked',
        description:
          'Your biometric appointment is scheduled.'
      },
      appointmentCompleted: {
        title: 'Appointment completed',
        description:
          'Your biometric appointment is complete. The application is waiting for printing.'
      },
      appointmentNeeded: {
        title: 'Appointment Needed',
        description:
          'Your application is approved. Book your biometric appointment as the next step.',
        actionLabel: 'Book now'
      },
      deliveryNotStarted: {
        title: 'Delivery not started yet',
        description:
          'Delivery updates will appear only after the printing and dispatch stages are completed.',
        actionLabel: 'View status'
      },
      printingCompleted: {
        title: 'Printing completed',
        description:
          'Your Smart NID has been printed successfully and is waiting for the next delivery movement.',
        actionLabel: 'Track status'
      },
      deliveryPaymentRequired: {
        title: 'Delivery payment required',
        description:
          'Your Smart NID has been printed. Complete the mock delivery payment to request home delivery.',
        actionLabel: 'Pay delivery fee'
      },
      deliveryPaymentDone: {
        title: 'Payment completed',
        description:
          'Your delivery request has been submitted and is waiting for admin dispatch.',
        actionLabel: 'View tracker'
      },
      deliveryQueue: {
        title: 'Delivery queue started',
        description:
          'Dispatch information will appear here as soon as the delivery step begins.',
        actionLabel: 'View tracker'
      },
      outForDelivery: {
        title: 'Out for delivery',
        description:
          'Your Smart NID has already left the processing stage and is now moving through delivery.',
        actionLabel: 'Track delivery'
      },
      digitalCopyAvailable: {
        title: 'Digital copy available',
        description:
          'You can keep the digital NID ready while you wait for the physical card to arrive.',
        actionLabel: 'Open digital NID'
      },
      deliveryCompleted: {
        title: 'Delivery completed',
        description:
          'Your Smart NID delivery is complete. Keep your tracker history for future reference.',
        actionLabel: 'Track history'
      },
      digitalCopyReady: {
        title: 'Digital copy ready',
        description:
          'Use the digital copy whenever you need a quick reference of your NID information.',
        actionLabel: 'View digital NID'
      },
      latestUpdate: {
        title: 'Latest update',
        description:
          'Your latest application status is available here. Open the tracker for the full stage-by-stage progress.',
        actionLabel: 'View full status'
      },
      needSupport: {
        title: 'Need support?',
        description:
          'Contact support if you want help understanding your application status or next steps.',
        actionLabel: 'Contact support'
      }
    },
    insightDescriptions: {
      activeWithApp:
        'Latest application selected automatically from your submissions.',
      activeNoApp: 'Start a new Smart NID request when you are ready.',
      statusRejected: 'Correction is required before resubmission.',
      statusWithApp: 'Keep tracking your application from this dashboard.',
      statusNoApp: 'No active application status is available yet.',
      nextWithApp: '',
      nextNoApp: 'Create your first application to begin the Smart NID process.'
    },
    quickActionItems: {
      applyTitle: 'Apply for NID',
      correctionTitle: 'Correction',
      applyWithApp: 'Submit a new Smart NID application',
      correctionWithApp: 'Request changes to your printed Smart NID information',
      applyLocked: 'Available after the current application is rejected/cancelled, or use Correction after printing',
      applyNoApp: 'Start your first Smart NID application',
      trackTitle: 'Track Application',
      trackWithApp: 'Check your application status',
      trackNoApp: 'Use this after submitting your application',
      supportTitle: 'Support',
      supportDescription: 'Get help or raise a ticket',
      digitalTitle: 'Digital NID',
      digitalDescription: 'Open your digital ID card'
    },
    gettingStartedSteps: [
      {
        step: 'Step 1',
        title: 'Prepare your documents',
        description:
          'Keep your birth registration number, recent photo, signature image, and mobile number ready.'
      },
      {
        step: 'Step 2',
        title: 'Submit your application',
        description:
          'Fill in your personal information, upload the required documents, and submit your Smart NID application.'
      },
      {
        step: 'Step 3',
        title: 'Wait for review',
        description:
          'The authority will review your information and documents before approving the next step.'
      },
      {
        step: 'Step 4',
        title: 'Track progress',
        description:
          'Follow your approval, appointment, printing, and delivery updates from the dashboard.'
      }
    ]
  },

  bn: {
    loading: 'আপনার ড্যাশবোর্ড লোড হচ্ছে...',
    citizen: 'নাগরিক',
    welcomePrefix: 'স্বাগতম',
    welcomeSubtitle:
      'এক জায়গা থেকে আবেদন, অ্যাপয়েন্টমেন্ট, সংশোধন এবং সেবা আপডেট ট্র্যাক করুন।',
    syncing: 'সিঙ্ক হচ্ছে...',
    autoSynced: 'শেষ সিঙ্ক',
    applyForNewNid: 'নতুন এনআইডির জন্য আবেদন',
    applyForCorrection: 'সংশোধনের জন্য আবেদন',
    newNidLocked: 'নতুন এনআইডি আবেদন লক করা আছে',
    startApplication: 'আবেদন শুরু করুন',
    activeApplication: 'সক্রিয় আবেদন',
    currentStatus: 'বর্তমান স্ট্যাটাস',
    applicationType: 'আবেদনের ধরন',
    currentStage: 'বর্তমান ধাপ',
    nextStep: 'পরবর্তী ধাপ',
    applicationId: 'আবেদন আইডি',
    submittedOn: 'জমা দেওয়ার তারিখ',
    lastUpdated: 'সর্বশেষ আপডেট',
    rejectionReason: 'বাতিলের কারণ',
    latestUpdates: 'সর্বশেষ আপডেট',
    quickActions: 'দ্রুত কাজ',
    continueJourney: 'আপনার আবেদন প্রক্রিয়া চালিয়ে যান',
    startFromHere: 'এখান থেকে শুরু করুন',
    quickActionsWithApps:
      'স্মার্ট এনআইডি প্রক্রিয়া চালিয়ে যেতে এই শর্টকাটগুলো ব্যবহার করুন।',
    quickActionsNoApps:
      'এই দ্রুত শর্টকাটগুলো থেকে ধাপে ধাপে আপনার প্রথম স্মার্ট এনআইডি প্রক্রিয়া সম্পন্ন করুন।',
    recentApplications: 'সাম্প্রতিক আবেদন',
    gettingStarted: 'শুরু করার নির্দেশনা',
    recentApplicationsText:
      'সাম্প্রতিক জমা দেওয়া আবেদনগুলো দেখুন এবং দ্রুত বিস্তারিত খুলুন।',
    gettingStartedText:
      'প্রথম আবেদন জমা দেওয়ার আগে কী প্রস্তুত রাখতে হবে তার সংক্ষিপ্ত ধারণা।',
    viewAll: 'সব দেখুন',
    viewFullStatus: 'পূর্ণ স্ট্যাটাস দেখুন',
    noApplicationsYet: 'এখনও কোনো আবেদন নেই',
    noApplicationsText:
      'আপনি এখনও কোনো স্মার্ট এনআইডি আবেদন জমা দেননি। প্রয়োজনীয় তথ্য প্রস্তুত করে আবেদন পেজ থেকে প্রক্রিয়া শুরু করুন।',
    applyNow: 'এখন আবেদন করুন',
    needHelp: 'সাহায্য লাগবে?',
    open: 'খুলুন',
    viewDetails: 'বিস্তারিত দেখুন',
    digitalNid: 'ডিজিটাল এনআইডি',
    heroStatusLabels: {
      appointmentNeeded: 'অ্যাপয়েন্টমেন্ট প্রয়োজন',
      appointmentBooked: 'অ্যাপয়েন্টমেন্ট বুক হয়েছে',
      waitingForPrinting: 'প্রিন্টিংয়ের অপেক্ষায়',
      digitalNidAvailable: 'ডিজিটাল এনআইডি উপলব্ধ',
      deliveryInProgress: 'ডেলিভারি চলমান',
      delivered: 'বিতরণ সম্পন্ন'
    },
    nextStepLabels: {
      review: 'রিভিউর জন্য অপেক্ষা করুন',
      appointmentRequired: 'অ্যাপয়েন্টমেন্ট বুক করুন',
      appointmentBooked: 'অ্যাপয়েন্টমেন্টে উপস্থিত থাকুন',
      waitingForPrinting: 'এখন কোনো পদক্ষেপ প্রয়োজন নেই',
      requestDelivery: 'ডেলিভারি অনুরোধ করুন',
      waitForDispatch: 'পাঠানোর অপেক্ষায়',
      trackDelivery: 'ডেলিভারি ট্র্যাক করুন',
      viewDigitalNid: 'ডিজিটাল এনআইডি দেখুন',
      noActionNeeded: 'এখন কোনো পদক্ষেপ প্রয়োজন নেই',
      reviewStatus: 'স্ট্যাটাস দেখুন',
      applyAgain: 'পর্যালোচনা করে আবার আবেদন করুন',
      contactSupport: 'সাপোর্টে যোগাযোগ করুন'
    },
    deliveryPayment: {
      payFee: 'ডেলিভারি ফি দিন',
      payShort: 'ডেলিভারি পেমেন্ট',
      quickTitle: 'ডেলিভারি পেমেন্ট',
      quickDescription: 'কার্ড প্রিন্ট হওয়ার পর ডেলিভারি ফি দিন',
      requested: 'ডেলিভারি অনুরোধ জমা হয়েছে',
      waitingDispatch: 'পেমেন্ট সম্পন্ন। ডিসপ্যাচের অপেক্ষায়।'
    },
    type: 'ধরন',
    submitted: 'জমা',
    updated: 'আপডেট',
    status: 'স্ট্যাটাস',
    reviewStatus: 'পর্যালোচনা স্ট্যাটাস',
    action: 'অ্যাকশন',
    reason: 'কারণ',
    na: 'প্রযোজ্য নয়',
    statusLabels: {
      draft: 'ড্রাফট',
      submitted: 'জমা হয়েছে',
      under_review: 'পর্যালোচনাধীন',
      correction_required: 'সংশোধন প্রয়োজন',
      approved: 'অনুমোদিত',
      rejected: 'বাতিল',
      printed: 'প্রিন্টেড',
      dispatched: 'পাঠানো হয়েছে',
      delivered: 'ডেলিভারড',
      cancelled: 'বাতিল হয়েছে'
    },
    recentReviewStatusLabels: {
      submitted: 'জমা হয়েছে',
      under_review: 'পর্যালোচনাধীন',
      approved: 'অনুমোদিত',
      rejected: 'বাতিল হয়েছে',
      cancelled: 'বাতিল করা হয়েছে'
    },
    applicationTypeLabels: {
      new: 'নতুন এনআইডি',
      correction: 'সংশোধন',
      reissue: 'রিইস্যু'
    },
    stageLabels: {
      submitted: 'জমা হয়েছে',
      under_review: 'পর্যালোচনাধীন',
      correction_required: 'সংশোধন প্রয়োজন',
      appointment_required: 'অ্যাপয়েন্টমেন্ট প্রয়োজন',
      appointment_booked: 'অ্যাপয়েন্টমেন্ট বুকড',
      waiting_for_printing: 'প্রিন্টিংয়ের অপেক্ষায়',
      printed: 'কার্ড প্রিন্টেড',
      dispatched: 'ডেলিভারি চলমান',
      delivered: 'ডেলিভারড',
      rejected: 'বাতিল',
      cancelled: 'বাতিল হয়েছে'
    },
    appointmentDetails: {
      date: 'তারিখ',
      time: 'সময়',
      center: 'কেন্দ্র',
      notAvailable: 'প্রযোজ্য নয়',
      empty: 'অ্যাপয়েন্টমেন্ট বিস্তারিত পাওয়া গেলে এখানে দেখা যাবে।'
    },
    highlights: [
      {
        title: 'ডকুমেন্ট প্রস্তুত রাখুন',
        description:
          'জন্ম নিবন্ধন নম্বর, ছবি, স্বাক্ষর এবং মোবাইল নম্বর প্রস্তুত রাখুন।'
      },
      {
        title: 'জমা দিয়ে রিভিউর অপেক্ষা করুন',
        description:
          'জমার পর কর্তৃপক্ষ আপনার তথ্য ও ডকুমেন্ট যাচাই করবে।'
      },
      {
        title: 'প্রতিটি ধাপ ট্র্যাক করুন',
        description:
          'এই ড্যাশবোর্ড থেকে অনুমোদন, অ্যাপয়েন্টমেন্ট, প্রিন্টিং ও ডেলিভারি আপডেট দেখুন।'
      }
    ],
    primary: {
      noApplication: {
        badge: 'শুরু হয়নি',
        title: 'আপনার প্রথম স্মার্ট এনআইডি আবেদন শুরু করুন',
        description:
          'আপনি এখনও কোনো আবেদন জমা দেননি। আবেদন করার পর লাইভ স্ট্যাটাস, অ্যাপয়েন্টমেন্ট এবং ডেলিভারি আপডেট এখানে দেখা যাবে।',
        actionLabel: 'এনআইডির জন্য আবেদন',
        secondaryActionLabel: 'সাপোর্টে যোগাযোগ'
      },
      submitted: {
        badge: 'জমা হয়েছে',
        title: 'আপনার আবেদন জমা হয়েছে',
        description:
          'আপনার আবেদন অফিসিয়াল রিভিউর অপেক্ষায় আছে। কর্তৃপক্ষ যাচাই শুরু করা পর্যন্ত আপনি পূর্ণ স্ট্যাটাস ট্র্যাক করতে পারবেন।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন',
        secondaryActionLabel: 'সাপোর্টে যোগাযোগ'
      },
      review: {
        badge: 'রিভিউ চলছে',
        title: 'আপনার আবেদন যাচাই চলছে',
        description:
          'আপনার জমা দেওয়া তথ্য এবং ডকুমেন্ট কর্তৃপক্ষ যাচাই করছে।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন',
        secondaryActionLabel: 'সাপোর্টে যোগাযোগ'
      },
      correctionRequired: {
        badge: 'সংশোধন প্রয়োজন',
        title: 'আপনার আবেদনে সংশোধন দরকার',
        description:
          'কর্তৃপক্ষ এই আবেদনের জন্য সংশোধন চেয়েছে। সংশোধনের নোট দেখে প্রয়োজনীয় তথ্য বা ডকুমেন্ট আপডেট করে আবার জমা দিন।',
        actionLabel: 'সংশোধনের বিস্তারিত দেখুন',
        secondaryActionLabel: 'সাপোর্টে যোগাযোগ'
      },
      approved: {
        badge: 'অনুমোদিত',
        title: 'আপনার আবেদন অনুমোদিত হয়েছে',
        descriptionBooked:
          'আপনার আবেদন অনুমোদিত এবং অ্যাপয়েন্টমেন্ট আপডেট এখন সবচেয়ে গুরুত্বপূর্ণ।',
        descriptionNoBooking:
          'আপনার আবেদন অনুমোদিত হয়েছে। পরবর্তী ধাপে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করুন।',
        actionBooked: 'পূর্ণ স্ট্যাটাস দেখুন',
        actionNoBooking: 'অ্যাপয়েন্টমেন্ট বুক',
        secondaryActionLabel: 'পূর্ণ স্ট্যাটাস দেখুন'
      },
      printed: {
        badge: 'প্রিন্টেড',
        title: 'আপনার স্মার্ট এনআইডি প্রিন্ট হয়েছে',
        description:
          'প্রিন্টিং সম্পন্ন হয়েছে। পরবর্তী অফিসিয়াল ডেলিভারি আপডেট এখানে দেখা যাবে।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন',
        secondaryActionLabel: 'ডিজিটাল এনআইডি দেখুন'
      },
      dispatched: {
        badge: 'পাঠানো হয়েছে',
        title: 'আপনার স্মার্ট এনআইডি পথে আছে',
        description:
          'আপনার কার্ড পাঠানো হয়েছে এবং ডেলিভারি প্রক্রিয়ায় রয়েছে।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন',
        secondaryActionLabel: 'ডিজিটাল এনআইডি দেখুন'
      },
      delivered: {
        badge: 'ডেলিভারড',
        title: 'আপনার স্মার্ট এনআইডি ডেলিভার হয়েছে',
        description:
          'ডেলিভারি সম্পন্ন হয়েছে। প্রয়োজন হলে দ্রুত রেফারেন্সের জন্য ডিজিটাল কপি রাখতে পারেন।',
        actionLabel: 'ডিজিটাল এনআইডি দেখুন',
        secondaryActionLabel: 'পূর্ণ স্ট্যাটাস দেখুন'
      },
      rejected: {
        badge: 'বাতিল',
        title: 'আপনার আবেদনে সংশোধন প্রয়োজন',
        description:
          'রিভিউর সময় আবেদন বাতিল হয়েছে। অফিসিয়াল কারণ পড়ে পরবর্তী পদক্ষেপ নিন।',
        actionLabel: 'সাপোর্টে যোগাযোগ',
        secondaryActionLabel: 'পূর্ণ স্ট্যাটাস দেখুন'
      },
      cancelled: {
        badge: 'বাতিল হয়েছে',
        title: 'আপনার আগের আবেদন বাতিল হয়েছে',
        description:
          'এই আবেদন আর সক্রিয় নয়। প্রস্তুত হলে নতুন আবেদন শুরু করতে পারেন।',
        actionLabel: 'আবার আবেদন করুন',
        secondaryActionLabel: 'সাপোর্টে যোগাযোগ'
      },
      default: {
        title: 'সর্বশেষ এনআইডি আপডেট দেখুন',
        description:
          'আপনার সর্বশেষ আবেদন স্ট্যাটাস এখানে আছে। পূর্ণ বিস্তারিত জানতে ট্র্যাকার খুলুন।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন',
        secondaryActionLabel: 'সাপোর্টে যোগাযোগ'
      }
    },
    sidePanels: {
      beforeApply: {
        title: 'আবেদনের আগে',
        description:
          'শুরু করার আগে জন্ম নিবন্ধন নম্বর, সাম্প্রতিক ছবি, স্বাক্ষর এবং মোবাইল নম্বর প্রস্তুত রাখুন।',
        actionLabel: 'এখন আবেদন'
      },
      processWorks: {
        title: 'প্রক্রিয়া কীভাবে কাজ করে',
        description:
          'আগে আবেদন করুন, রিভিউর অপেক্ষা করুন, অনুমোদনের পর বায়োমেট্রিক সম্পন্ন করুন, তারপর প্রিন্টিং ও ডেলিভারি আপডেট দেখুন।',
        actionLabel: 'সাপোর্টে যোগাযোগ'
      },
      rejectedAction: {
        title: 'এখন কী করবেন',
        description:
          'বাতিলের কারণ ভালোভাবে দেখুন। আবার জমা দেওয়ার আগে ভুল তথ্য বা ডকুমেন্ট ঠিক করুন।',
        actionLabel: 'আবার আবেদন'
      },
      rejectedHelp: {
        title: 'সংশোধনে সাহায্য লাগবে?',
        description:
          'বাতিলের কারণ বা পরবর্তী সংশোধন ধাপ বুঝতে সাপোর্টে যোগাযোগ করুন।',
        actionLabel: 'সাপোর্ট নিন'
      },
      cancelledAction: {
        title: 'আবেদন আর সক্রিয় নয়',
        description:
          'এই আবেদন আর এগোবে না। প্রস্তুত হলে নতুন আবেদন শুরু করুন।',
        actionLabel: 'আবার আবেদন'
      },
      cancelledHelp: {
        title: 'কোনো সাহায্য লাগবে?',
        description:
          'ভুলে বাতিল করে থাকলে বা আবার আবেদন করার আগে নির্দেশনা চাইলে সাপোর্টে যোগাযোগ করুন।',
        actionLabel: 'সাপোর্টে যোগাযোগ'
      },
      reviewProgress: {
        title: 'রিভিউ চলছে',
        description:
          'আপনার আবেদন এখন রিভিউতে আছে। এখনই কোনো অ্যাপয়েন্টমেন্ট কাজ দরকার নেই।',
        actionLabel: 'আবেদন ট্র্যাক করুন'
      },
      correctionAction: {
        title: 'সংশোধন প্রয়োজন',
        description:
          'আবার জমা দেওয়ার আগে কোন তথ্য বা ডকুমেন্ট সংশোধন করতে হবে তা দেখে নিন।',
        actionLabel: 'সংশোধন দেখুন'
      },
      correctionHelp: {
        title: 'সংশোধনে সাহায্য লাগবে?',
        description:
          'সংশোধনের নোট বুঝতে সমস্যা হলে অথবা সংশোধন/রিইস্যু ডকুমেন্ট নিয়ে সাহায্য লাগলে সাপোর্ট টিকেট তৈরি করুন।',
        actionLabel: 'সাপোর্টে যোগাযোগ'
      },
      nextAfterReview: {
        title: 'এরপর কী হবে?',
        description:
          'অনুমোদনের পর বায়োমেট্রিক অ্যাপয়েন্টমেন্ট এবং পরে ডেলিভারি আপডেট এখানে দেখা যাবে।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন'
      },
      appointmentBooked: {
        title: 'অ্যাপয়েন্টমেন্ট বুকড',
        description:
          'আপনার বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করা আছে। সর্বশেষ তথ্য দেখতে ট্র্যাকার খুলুন।',
        actionLabel: 'অ্যাপয়েন্টমেন্ট ট্র্যাক'
      },
      appointmentNeeded: {
        title: 'অ্যাপয়েন্টমেন্ট প্রয়োজন',
        description:
          'আপনার আবেদন অনুমোদিত হয়েছে। পরবর্তী ধাপে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করুন।',
        actionLabel: 'এখন বুক করুন'
      },
      deliveryNotStarted: {
        title: 'ডেলিভারি এখনো শুরু হয়নি',
        description:
          'প্রিন্টিং ও ডিসপ্যাচ ধাপ শেষ হলে ডেলিভারি আপডেট দেখা যাবে।',
        actionLabel: 'স্ট্যাটাস দেখুন'
      },
      printingCompleted: {
        title: 'প্রিন্টিং সম্পন্ন',
        description:
          'আপনার স্মার্ট এনআইডি সফলভাবে প্রিন্ট হয়েছে এবং ডেলিভারির পরবর্তী ধাপের অপেক্ষায় আছে।',
        actionLabel: 'স্ট্যাটাস ট্র্যাক'
      },
      deliveryQueue: {
        title: 'ডেলিভারি কিউ শুরু',
        description:
          'ডেলিভারি ধাপ শুরু হলেই ডিসপ্যাচ তথ্য এখানে দেখা যাবে।',
        actionLabel: 'ট্র্যাকার দেখুন'
      },
      outForDelivery: {
        title: 'ডেলিভারির পথে',
        description:
          'আপনার স্মার্ট এনআইডি প্রসেসিং ধাপ ছেড়ে এখন ডেলিভারিতে রয়েছে।',
        actionLabel: 'ডেলিভারি ট্র্যাক'
      },
      digitalCopyAvailable: {
        title: 'ডিজিটাল কপি আছে',
        description:
          'ফিজিক্যাল কার্ড আসা পর্যন্ত ডিজিটাল এনআইডি প্রস্তুত রাখতে পারেন।',
        actionLabel: 'ডিজিটাল এনআইডি খুলুন'
      },
      deliveryCompleted: {
        title: 'ডেলিভারি সম্পন্ন',
        description:
          'আপনার স্মার্ট এনআইডি ডেলিভারি সম্পন্ন হয়েছে। ভবিষ্যতের জন্য ট্র্যাকার ইতিহাস রাখুন।',
        actionLabel: 'ইতিহাস দেখুন'
      },
      digitalCopyReady: {
        title: 'ডিজিটাল কপি প্রস্তুত',
        description:
          'এনআইডি তথ্য দ্রুত রেফারেন্সের জন্য ডিজিটাল কপি ব্যবহার করুন।',
        actionLabel: 'ডিজিটাল এনআইডি দেখুন'
      },
      latestUpdate: {
        title: 'সর্বশেষ আপডেট',
        description:
          'আপনার সর্বশেষ আবেদন স্ট্যাটাস এখানে আছে। ধাপে ধাপে অগ্রগতি দেখতে ট্র্যাকার খুলুন।',
        actionLabel: 'পূর্ণ স্ট্যাটাস দেখুন'
      },
      needSupport: {
        title: 'সাপোর্ট লাগবে?',
        description:
          'আবেদন স্ট্যাটাস বা পরবর্তী ধাপ বুঝতে সাহায্য চাইলে সাপোর্টে যোগাযোগ করুন।',
        actionLabel: 'সাপোর্টে যোগাযোগ'
      }
    },
    insightDescriptions: {
      activeWithApp:
        'আপনার জমা দেওয়া আবেদন থেকে সর্বশেষটি স্বয়ংক্রিয়ভাবে নির্বাচন করা হয়েছে।',
      activeNoApp: 'প্রস্তুত হলে নতুন স্মার্ট এনআইডি অনুরোধ শুরু করুন।',
      statusRejected: 'আবার জমা দেওয়ার আগে সংশোধন প্রয়োজন।',
      statusWithApp: 'এই ড্যাশবোর্ড থেকে আবেদন ট্র্যাক করুন।',
      statusNoApp: 'এখনও কোনো সক্রিয় আবেদন স্ট্যাটাস নেই।',
      nextWithApp: '',
      nextNoApp: 'স্মার্ট এনআইডি প্রক্রিয়া শুরু করতে প্রথম আবেদন তৈরি করুন।'
    },
    quickActionItems: {
      applyTitle: 'এনআইডির জন্য আবেদন',
      correctionTitle: 'সংশোধন',
      applyWithApp: 'নতুন স্মার্ট এনআইডি আবেদন জমা দিন',
      correctionWithApp: 'অনুমোদিত স্মার্ট এনআইডি তথ্য সংশোধনের অনুরোধ করুন',
      applyLocked: 'বর্তমান আবেদন রিজেক্ট/ক্যানসেল হলে, অথবা অনুমোদনের পর সংশোধন ব্যবহার করলে এটি পাওয়া যাবে',
      applyNoApp: 'আপনার প্রথম স্মার্ট এনআইডি আবেদন শুরু করুন',
      trackTitle: 'আবেদন ট্র্যাক',
      trackWithApp: 'আপনার আবেদন স্ট্যাটাস দেখুন',
      trackNoApp: 'আবেদন জমা দেওয়ার পর এটি ব্যবহার করুন',
      supportTitle: 'সাপোর্ট',
      supportDescription: 'সাহায্য নিন অথবা টিকেট তৈরি করুন',
      digitalTitle: 'ডিজিটাল এনআইডি',
      digitalDescription: 'আপনার ডিজিটাল আইডি কার্ড খুলুন'
    },
    gettingStartedSteps: [
      {
        step: 'ধাপ ১',
        title: 'ডকুমেন্ট প্রস্তুত',
        description:
          'জন্ম নিবন্ধন নম্বর, সাম্প্রতিক ছবি, স্বাক্ষর এবং মোবাইল নম্বর প্রস্তুত রাখুন।'
      },
      {
        step: 'ধাপ ২',
        title: 'আবেদন জমা',
        description:
          'ফর্মটি সাবধানে পূরণ করে অনলাইনে স্মার্ট এনআইডি অনুরোধ জমা দিন।'
      },
      {
        step: 'ধাপ ৩',
        title: 'রিভিউর অপেক্ষা',
        description:
          'জমার পর কর্তৃপক্ষ আপনার তথ্য ও ডকুমেন্ট রিভিউ করবে।'
      },
      {
        step: 'ধাপ ৪',
        title: 'আপডেট ট্র্যাক',
        description:
          'ড্যাশবোর্ড থেকে অনুমোদন, অ্যাপয়েন্টমেন্ট, প্রিন্টিং ও ডেলিভারি অগ্রগতি দেখুন।'
      }
    ]
  }
};

const translations = {
  en: {
    dashboardPage: {
      ...dashboardPageTranslations.en,
      sideCards: dashboardSideCardTranslations.en
    },
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
    notFoundPage: {
      badge: 'Smart NID Service Portal',
      errorCode: '404 Error',
      title: 'Page unavailable',
      description:
        'The Smart NID page you are looking for is unavailable, moved, or the address may be incorrect.',
      visualLabel: 'Service route not found',
      helpTitle: 'What can you do?',
      helpPointOne: 'Check whether the page address is correct.',
      helpPointTwo: 'Return to your dashboard and continue from the available services.',
      helpPointThree: 'Contact support if you believe this page should be available.',
      goDashboard: 'Go Dashboard',
      contactSupport: 'Contact Support',
      goBack: 'Go Back'
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
  },
    profilePage: {
      na: 'N/A',
      loading: 'Loading profile...',
      loadFailed: 'Profile information could not be loaded.',
      secureProfile: 'Secure citizen profile',
      citizenUser: 'Citizen User',
      verifiedAccount: 'Verified Account',
      accountActive: 'Account Active',
      refresh: 'Refresh Data',
      refreshing: 'Refreshing...',
      readOnly: 'Read-only official data',
      notIssuedYet: 'Not issued yet',
      noAppointment: 'No appointment booked',
      noApplication: 'No application',
      noCorrection: 'No correction request',
      deliveryNotStarted: 'Delivery not started',
      notStarted: 'Not started',
      notBookedYet: 'Not booked yet',
      quickActionsTitle: 'Quick Actions',
      accountInformation: 'Account Information',
      personalInformation: 'Contact Information',
      personalInformationText:
        'Update only your editable contact details. Official NID information is shown separately as read-only data.',
      editableContact: 'Editable contact data',
      accountNote: 'Account Note',
      accountNoteText:
        'Your phone and email are used for OTP, appointment reminders, application updates, delivery updates, and support notifications.',
      noUnsavedChanges: 'No unsaved changes.',
      unsavedChanges: 'You have unsaved changes.',
      saving: 'Saving...',
      saveChanges: 'Save Changes',
      updateSuccess: 'Profile updated successfully.',
      updateFailed: 'Profile could not be updated.',
      tabs: {
        overview: 'Profile',
        official: 'Official Identity',
        activity: 'Service Activity',
        security: 'Security'
      },
      hero: {
        currentStep: 'Current Step',
        nextAction: 'Next Action',
        supportTickets: 'Open Support Tickets'
      },
      sidebar: {
        title: 'Citizen Summary',
        role: 'Role',
        joined: 'Joined',
        nidStatus: 'NID Status',
        issued: 'Issued'
      },
      overview: {
        currentStep: 'Current service step',
        nextAction: 'Recommended next action'
      },
      summary: {
        openTicketDetail: 'Support desk'
      },
      actions: {
        applyNow: 'Apply Now',
        bookBiometric: 'Book Biometric',
        viewDigitalNid: 'View Digital NID',
        trackStatus: 'Track Status',
        getSupport: 'Get Support'
      },
      currentStep: {
        noApplicationTitle: 'No application yet',
        noApplicationDetail: 'Start a Smart NID application when your documents are ready.',
        rejectedDetail: 'Review the reason and submit again if allowed.',
        digitalReadyTitle: 'Digital NID ready',
        printedDetail: 'Your card has reached the issuance stage.',
        waitingPrintTitle: 'Waiting for card printing',
        waitingPrintDetail: 'Biometric verification is complete. The card is waiting for printing.',
        biometricScheduledTitle: 'Biometric appointment scheduled',
        biometricRequiredTitle: 'Biometric appointment required',
        biometricRequiredDetail: 'Book and complete your biometric appointment before printing starts.',
        reviewDetail: 'Your application is being processed by the authority.'
      },
      nextAction: {
        startTitle: 'Start your Smart NID application',
        startDetail: 'Submit your personal, address, family and document information online.',
        bookBiometricTitle: 'Book biometric appointment',
        bookBiometricDetail: 'Your application is approved. Complete biometric verification next.',
        digitalNidTitle: 'Open digital NID',
        digitalNidDetail: 'Your NID has been issued and can be viewed securely.',
        trackTitle: 'Track application progress',
        trackDetail: 'Follow your review, appointment, printing and delivery updates.'
      },
      form: {
        fullName: 'Full Name',
        fullNamePlaceholder: 'Enter your full name',
        fullNameRequired: 'Full name is required',
        fullNameMin: 'Name must be at least 3 characters',
        email: 'Email Address',
        emailPlaceholder: 'Enter your email address',
        emailInvalid: 'Enter a valid email address',
        phone: 'Phone Number',
        phonePlaceholder: '01XXXXXXXXX',
        phoneRequired: 'Phone number is required',
        phoneInvalid: 'Enter a valid Bangladeshi mobile number'
      },
      official: {
        title: 'Official Identity Snapshot',
        informationTitle: 'Official Identity Information',
        subtitle:
          'This information comes from your account and latest Smart NID application records. These fields cannot be edited from profile.',
        nidNumber: 'NID Number',
        birthRegistrationNumber: 'Birth Registration Number',
        dateOfBirth: 'Date of Birth',
        fatherName: "Father's Name",
        motherName: "Mother's Name",
        gender: 'Gender',
        bloodGroup: 'Blood Group',
        applicationId: 'Application ID',
        presentAddress: 'Present Address',
        permanentAddress: 'Permanent Address'
      },
      timeline: {
        title: 'Service Activity Timeline',
        subtitle: 'Latest application, appointment, correction and delivery progress from your Smart NID lifecycle.',
        application: 'Application',
        biometric: 'Biometric appointment',
        correction: 'Correction request',
        delivery: 'Delivery status'
      },
      security: {
        title: 'Security & Notification Status',
        subtitle: 'Review your account verification and notification readiness.',
        accountVerification: 'Account verification',
        verifiedDescription: 'Your account was verified through the Smart NID authentication flow.',
        activeDescription: 'Your account is active, but final verification status is not confirmed.',
        emailNotifications: 'Email notifications',
        emailDescription: 'Used for OTP, application updates and support responses.',
        phoneNotifications: 'Phone notifications',
        phoneDescription: 'Used for appointment reminders and important service alerts.',
        ready: 'Ready',
        incomplete: 'Incomplete',
        passwordTitle: 'Password security',
        passwordText:
          'Use a strong password and keep your OTP private. Password reset is available from the forgot password page.'
      },
      roleLabels: {
        citizen: 'Citizen',
        admin: 'Admin',
        support_staff: 'Support Staff',
        supervisor: 'Supervisor'
      },
      genderLabels: {
        male: 'Male',
        female: 'Female',
        other: 'Other'
      },
      statusLabels: {
        draft: 'Draft',
        submitted: 'Submitted',
        under_review: 'Under Review',
        correction_required: 'Correction Required',
        approved: 'Approved',
        rejected: 'Rejected',
        printed: 'Printed',
        dispatched: 'Dispatched',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        canceled: 'Cancelled'
      },
      appointmentStatusLabels: {
        pending: 'Pending',
        booked: 'Booked',
        scheduled: 'Scheduled',
        approved: 'Approved',
        completed: 'Completed',
        missed: 'Missed',
        cancelled: 'Cancelled',
        canceled: 'Cancelled',
        rejected: 'Rejected'
      },
      correctionStatusLabels: {
        pending: 'Pending',
        submitted: 'Submitted',
        under_review: 'Under Review',
        approved: 'Approved',
        rejected: 'Rejected'
      },
      deliveryStatusLabels: {
        pending: 'Pending',
        requested: 'Requested',
        processing: 'Processing',
        dispatched: 'Dispatched',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        canceled: 'Cancelled'
      }
    }
},

  bn: {
    dashboardPage: {
      ...dashboardPageTranslations.bn,
      sideCards: dashboardSideCardTranslations.bn
    },
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
    notFoundPage: {
      badge: 'স্মার্ট এনআইডি সার্ভিস পোর্টাল',
      errorCode: '৪০৪ ত্রুটি',
      title: 'পেজটি পাওয়া যায়নি',
      description:
        'আপনি যে স্মার্ট এনআইডি পেজটি খুঁজছেন সেটি পাওয়া যাচ্ছে না, সরানো হয়েছে, অথবা ঠিকানাটি ভুল হতে পারে।',
      visualLabel: 'সেবা রুট পাওয়া যায়নি',
      helpTitle: 'এখন কী করতে পারেন?',
      helpPointOne: 'পেজের ঠিকানা সঠিক কিনা পরীক্ষা করুন।',
      helpPointTwo: 'ড্যাশবোর্ডে ফিরে উপলব্ধ সেবা থেকে কাজ চালিয়ে যান।',
      helpPointThree: 'পেজটি থাকা উচিত মনে হলে সাপোর্টে যোগাযোগ করুন।',
      goDashboard: 'ড্যাশবোর্ডে যান',
      contactSupport: 'সাপোর্টে যোগাযোগ',
      goBack: 'পেছনে যান'
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
  },
    profilePage: {
      na: 'প্রযোজ্য নয়',
      loading: 'প্রোফাইল লোড হচ্ছে...',
      loadFailed: 'প্রোফাইল তথ্য লোড করা যায়নি।',
      secureProfile: 'নিরাপদ নাগরিক প্রোফাইল',
      citizenUser: 'নাগরিক ব্যবহারকারী',
      verifiedAccount: 'যাচাইকৃত অ্যাকাউন্ট',
      accountActive: 'সক্রিয় অ্যাকাউন্ট',
      refresh: 'ডেটা রিফ্রেশ',
      refreshing: 'রিফ্রেশ হচ্ছে...',
      readOnly: 'অফিসিয়াল তথ্য, পরিবর্তনযোগ্য নয়',
      notIssuedYet: 'এখনো ইস্যু হয়নি',
      noAppointment: 'কোনো অ্যাপয়েন্টমেন্ট বুক করা হয়নি',
      noApplication: 'কোনো আবেদন নেই',
      noCorrection: 'কোনো সংশোধন আবেদন নেই',
      deliveryNotStarted: 'ডেলিভারি শুরু হয়নি',
      notStarted: 'শুরু হয়নি',
      notBookedYet: 'বুক করা হয়নি',
      quickActionsTitle: 'দ্রুত কাজ',
      accountInformation: 'অ্যাকাউন্ট তথ্য',
      personalInformation: 'যোগাযোগের তথ্য',
      personalInformationText:
        'শুধু পরিবর্তনযোগ্য যোগাযোগের তথ্য আপডেট করুন। অফিসিয়াল এনআইডি তথ্য আলাদা অংশে পরিবর্তনযোগ্য নয় হিসেবে দেখানো হয়েছে।',
      editableContact: 'পরিবর্তনযোগ্য যোগাযোগ তথ্য',
      accountNote: 'অ্যাকাউন্ট নোট',
      accountNoteText:
        'আপনার ফোন ও ইমেইল OTP, অ্যাপয়েন্টমেন্ট রিমাইন্ডার, আবেদন আপডেট, ডেলিভারি আপডেট এবং সাপোর্ট নোটিফিকেশনের জন্য ব্যবহৃত হয়।',
      noUnsavedChanges: 'কোনো অসম্পাদিত পরিবর্তন নেই।',
      unsavedChanges: 'আপনার কিছু পরিবর্তন সেভ করা হয়নি।',
      saving: 'সেভ হচ্ছে...',
      saveChanges: 'পরিবর্তন সেভ করুন',
      updateSuccess: 'প্রোফাইল সফলভাবে আপডেট হয়েছে।',
      updateFailed: 'প্রোফাইল আপডেট করা যায়নি।',
      tabs: {
        overview: 'প্রোফাইল',
        official: 'অফিসিয়াল পরিচয়',
        activity: 'সেবা কার্যক্রম',
        security: 'নিরাপত্তা'
      },
      hero: {
        currentStep: 'বর্তমান ধাপ',
        nextAction: 'পরবর্তী কাজ',
        supportTickets: 'খোলা সাপোর্ট টিকিট'
      },
      sidebar: {
        title: 'নাগরিক সারাংশ',
        role: 'ভূমিকা',
        joined: 'যোগদানের তারিখ',
        nidStatus: 'এনআইডি অবস্থা',
        issued: 'ইস্যু হয়েছে'
      },
      overview: {
        currentStep: 'বর্তমান সেবা ধাপ',
        nextAction: 'সুপারিশকৃত পরবর্তী কাজ'
      },
      summary: {
        openTicketDetail: 'সাপোর্ট ডেস্ক'
      },
      actions: {
        applyNow: 'এখন আবেদন করুন',
        bookBiometric: 'বায়োমেট্রিক বুক করুন',
        viewDigitalNid: 'ডিজিটাল এনআইডি দেখুন',
        trackStatus: 'স্ট্যাটাস দেখুন',
        getSupport: 'সাপোর্ট নিন'
      },
      currentStep: {
        noApplicationTitle: 'এখনো কোনো আবেদন নেই',
        noApplicationDetail: 'প্রয়োজনীয় ডকুমেন্ট প্রস্তুত হলে স্মার্ট এনআইডি আবেদন শুরু করুন।',
        rejectedDetail: 'কারণ দেখে প্রয়োজন হলে আবার আবেদন করুন।',
        digitalReadyTitle: 'ডিজিটাল এনআইডি প্রস্তুত',
        printedDetail: 'আপনার কার্ড ইস্যু ধাপে পৌঁছেছে।',
        waitingPrintTitle: 'কার্ড প্রিন্টিংয়ের অপেক্ষায়',
        waitingPrintDetail: 'বায়োমেট্রিক যাচাই সম্পন্ন হয়েছে। কার্ড প্রিন্টিংয়ের অপেক্ষায় আছে।',
        biometricScheduledTitle: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট নির্ধারিত',
        biometricRequiredTitle: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট প্রয়োজন',
        biometricRequiredDetail: 'প্রিন্টিং শুরু হওয়ার আগে বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক ও সম্পন্ন করুন।',
        reviewDetail: 'আপনার আবেদন কর্তৃপক্ষের মাধ্যমে প্রক্রিয়াধীন আছে।'
      },
      nextAction: {
        startTitle: 'স্মার্ট এনআইডি আবেদন শুরু করুন',
        startDetail: 'ব্যক্তিগত, ঠিকানা, পরিবার ও ডকুমেন্ট তথ্য অনলাইনে জমা দিন।',
        bookBiometricTitle: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করুন',
        bookBiometricDetail: 'আপনার আবেদন অনুমোদিত হয়েছে। এখন বায়োমেট্রিক যাচাই সম্পন্ন করুন।',
        digitalNidTitle: 'ডিজিটাল এনআইডি খুলুন',
        digitalNidDetail: 'আপনার এনআইডি ইস্যু হয়েছে এবং নিরাপদে দেখা যাবে।',
        trackTitle: 'আবেদনের অগ্রগতি দেখুন',
        trackDetail: 'রিভিউ, অ্যাপয়েন্টমেন্ট, প্রিন্টিং ও ডেলিভারি আপডেট অনুসরণ করুন।'
      },
      form: {
        fullName: 'পূর্ণ নাম',
        fullNamePlaceholder: 'আপনার পূর্ণ নাম লিখুন',
        fullNameRequired: 'পূর্ণ নাম আবশ্যক',
        fullNameMin: 'নাম কমপক্ষে ৩ অক্ষরের হতে হবে',
        email: 'ইমেইল ঠিকানা',
        emailPlaceholder: 'আপনার ইমেইল ঠিকানা লিখুন',
        emailInvalid: 'সঠিক ইমেইল ঠিকানা লিখুন',
        phone: 'ফোন নম্বর',
        phonePlaceholder: '01XXXXXXXXX',
        phoneRequired: 'ফোন নম্বর আবশ্যক',
        phoneInvalid: 'সঠিক বাংলাদেশি মোবাইল নম্বর লিখুন'
      },
      official: {
        title: 'অফিসিয়াল পরিচয় সারাংশ',
        informationTitle: 'অফিসিয়াল পরিচয় তথ্য',
        subtitle:
          'এই তথ্য আপনার অ্যাকাউন্ট এবং সর্বশেষ স্মার্ট এনআইডি আবেদনের রেকর্ড থেকে নেওয়া। প্রোফাইল থেকে এগুলো পরিবর্তন করা যাবে না।',
        nidNumber: 'এনআইডি নম্বর',
        birthRegistrationNumber: 'জন্ম নিবন্ধন নম্বর',
        dateOfBirth: 'জন্ম তারিখ',
        fatherName: 'পিতার নাম',
        motherName: 'মাতার নাম',
        gender: 'লিঙ্গ',
        bloodGroup: 'রক্তের গ্রুপ',
        applicationId: 'আবেদন আইডি',
        presentAddress: 'বর্তমান ঠিকানা',
        permanentAddress: 'স্থায়ী ঠিকানা'
      },
      timeline: {
        title: 'সেবা কার্যক্রম টাইমলাইন',
        subtitle: 'আপনার স্মার্ট এনআইডি লাইফসাইকেলের সর্বশেষ আবেদন, অ্যাপয়েন্টমেন্ট, সংশোধন ও ডেলিভারি অগ্রগতি।',
        application: 'আবেদন',
        biometric: 'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট',
        correction: 'সংশোধন আবেদন',
        delivery: 'ডেলিভারি অবস্থা'
      },
      security: {
        title: 'নিরাপত্তা ও নোটিফিকেশন অবস্থা',
        subtitle: 'আপনার অ্যাকাউন্ট যাচাইকরণ এবং নোটিফিকেশন প্রস্তুতি দেখুন।',
        accountVerification: 'অ্যাকাউন্ট যাচাইকরণ',
        verifiedDescription: 'আপনার অ্যাকাউন্ট স্মার্ট এনআইডি অথেনটিকেশন ফ্লো দিয়ে যাচাই করা হয়েছে।',
        activeDescription: 'আপনার অ্যাকাউন্ট সক্রিয়, তবে চূড়ান্ত যাচাইকরণ অবস্থা নিশ্চিত নয়।',
        emailNotifications: 'ইমেইল নোটিফিকেশন',
        emailDescription: 'OTP, আবেদন আপডেট এবং সাপোর্ট রিপ্লাইয়ের জন্য ব্যবহৃত হয়।',
        phoneNotifications: 'ফোন নোটিফিকেশন',
        phoneDescription: 'অ্যাপয়েন্টমেন্ট রিমাইন্ডার এবং গুরুত্বপূর্ণ সেবা সতর্কতার জন্য ব্যবহৃত হয়।',
        ready: 'প্রস্তুত',
        incomplete: 'অসম্পূর্ণ',
        passwordTitle: 'পাসওয়ার্ড নিরাপত্তা',
        passwordText:
          'শক্তিশালী পাসওয়ার্ড ব্যবহার করুন এবং OTP গোপন রাখুন। পাসওয়ার্ড ভুলে গেলে forgot password পেজ থেকে রিসেট করা যাবে।'
      },
      roleLabels: {
        citizen: 'নাগরিক',
        admin: 'অ্যাডমিন',
        support_staff: 'সাপোর্ট স্টাফ',
        supervisor: 'সুপারভাইজার'
      },
      genderLabels: {
        male: 'পুরুষ',
        female: 'নারী',
        other: 'অন্যান্য'
      },
      statusLabels: {
        draft: 'ড্রাফট',
        submitted: 'জমা হয়েছে',
        under_review: 'রিভিউ চলছে',
        correction_required: 'সংশোধন প্রয়োজন',
        approved: 'অনুমোদিত',
        rejected: 'প্রত্যাখ্যাত',
        printed: 'প্রিন্টেড',
        dispatched: 'ডিসপ্যাচড',
        delivered: 'ডেলিভারড',
        cancelled: 'বাতিল',
        canceled: 'বাতিল'
      },
      appointmentStatusLabels: {
        pending: 'অপেক্ষমাণ',
        booked: 'বুক করা হয়েছে',
        scheduled: 'নির্ধারিত',
        approved: 'অনুমোদিত',
        completed: 'সম্পন্ন',
        missed: 'মিসড',
        cancelled: 'বাতিল',
        canceled: 'বাতিল',
        rejected: 'প্রত্যাখ্যাত'
      },
      correctionStatusLabels: {
        pending: 'অপেক্ষমাণ',
        submitted: 'জমা হয়েছে',
        under_review: 'রিভিউ চলছে',
        approved: 'অনুমোদিত',
        rejected: 'প্রত্যাখ্যাত'
      },
      deliveryStatusLabels: {
        pending: 'অপেক্ষমাণ',
        requested: 'অনুরোধ করা হয়েছে',
        processing: 'প্রক্রিয়াধীন',
        dispatched: 'ডিসপ্যাচড',
        delivered: 'ডেলিভারড',
        cancelled: 'বাতিল',
        canceled: 'বাতিল'
      }
    }
}
};


const privacyPolicyTranslations = {
  "en": {
    "updated": "UPDATED JUNE 17, 2026",
    "title": "Privacy Policy",
    "subtitle": "How Smart NID handles your data",
    "toc": "TABLE OF CONTENTS",
    "introTitle": "Introduction",
    "introLead": "This Privacy Policy explains how the Smart NID Card Management System collects, uses, stores, protects, and manages information when citizens, internal users, administrators, and support staff use the system.",
    "sections": [
      {
        "id": "introduction",
        "title": "Introduction",
        "paragraphs": [
          "Smart NID Card Management System is a final-year academic prototype designed to demonstrate a secure citizen identity service workflow. The system includes citizen registration, login, NID application submission, document upload, appointment booking, biometric completion, printing queue management, delivery tracking, correction requests, support tickets, and administrative audit logs.",
          "This Privacy Policy applies to the web application, citizen portal, admin portal, and related prototype services that support the Smart NID workflow. It explains what information may be processed, why it is used, who may access it, and what protection principles should apply to the system.",
          "This system is not an official government NID service. In a production deployment, privacy, security, retention, identity verification, and regulatory practices must follow applicable law, official standards, and approved operating procedures."
        ]
      },
      {
        "id": "our-values",
        "title": "Our values",
        "paragraphs": [
          "The Smart NID prototype is built around clear privacy values: collect only what is needed, protect sensitive identity information, limit access by role, keep actions traceable, and make the citizen service journey understandable.",
          "Identity information is sensitive. Names, birth registration details, NID numbers, addresses, photos, signatures, documents, correction evidence, appointment history, and support records should be handled carefully and used only for legitimate Smart NID service functions."
        ],
        "bullets": [
          "Use citizen information only for registration, verification, application, appointment, printing, delivery, correction, support, and accountability workflows.",
          "Keep source identity information read-only unless the correction workflow allows an update.",
          "Protect administrative actions with role-based permissions and traceable audit logs.",
          "Avoid unnecessary exposure of sensitive data in the user interface."
        ]
      },
      {
        "id": "why-we-process-your-information",
        "title": "Why we process your information",
        "paragraphs": [
          "The system processes information so citizens can create accounts, submit Smart NID applications, upload required evidence, book biometric appointments, track service progress, request delivery, request corrections, and communicate with support staff.",
          "Internal users may process information to review applications, verify documents, approve or reject records, manage appointments, complete biometric status, operate the printing queue, handle delivery records, respond to support tickets, and review audit activity."
        ],
        "bullets": [
          "To create and verify citizen accounts using submitted identity and contact details.",
          "To review NID applications and maintain each application lifecycle stage.",
          "To support OCR, face verification, document matching, and biometric appointment workflows.",
          "To display Digital NID information only after the required workflow stage is complete.",
          "To maintain records of admin decisions, status changes, delivery actions, and support responses."
        ]
      },
      {
        "id": "your-rights-over-your-information",
        "title": "Your rights over your information",
        "paragraphs": [
          "Within the features provided by the prototype, citizens can review profile information, check application status, view appointment and delivery progress, open support tickets, and submit correction requests when the workflow allows it.",
          "Some information may be locked because it comes from official or verified source records. Locked fields are intended to protect data integrity and should not be edited directly by the citizen. A correction request workflow may be used when changes are allowed."
        ],
        "bullets": [
          "Review your submitted application and profile information.",
          "Track the current stage of your application, appointment, printing, delivery, and correction workflow.",
          "Request support when something is unclear or requires help.",
          "Submit correction information where the system permits correction."
        ]
      },
      {
        "id": "what-we-collect",
        "title": "What information we collect",
        "paragraphs": [
          "The system may process information that is necessary to provide the Smart NID workflow. This includes account information, identity information, document uploads, appointment information, delivery information, correction requests, support messages, and system audit data.",
          "The categories below describe the main types of information that may be stored or processed in the prototype."
        ],
        "bullets": [
          "Account data: name, email address, phone number, password-protected login details, account role, account status, and language preference.",
          "Identity data: birth registration number, NID number, date of birth, gender, blood group, father and mother information, occupation, marital status, and address details.",
          "Application data: application type, submission time, review status, officer decision, status history, assigned NID number, correction status, and reissue or delivery status where applicable.",
          "Uploaded evidence: passport-size photo, signature image, birth certificate or document proof, and correction evidence.",
          "Appointment data: selected center, district, date, time slot, booking status, biometric completion status, serial information, and officer notes.",
          "Support data: ticket category, description, priority, status, assignment, response history, and resolution information.",
          "System data: audit logs, timestamps, status changes, device or IP style metadata when applicable, and internal administrative activity."
        ]
      },
      {
        "id": "how-we-use-information",
        "title": "How we use information",
        "paragraphs": [
          "Information is used to complete the Smart NID lifecycle and to keep the workflow accurate, traceable, and understandable. The system should not use citizen information for unrelated advertising or marketing purposes.",
          "The main use of information is to support identity verification, application review, appointment management, printing readiness, delivery tracking, correction handling, and support communication."
        ]
      },
      {
        "id": "documents-photo-and-biometric-data",
        "title": "Documents, photo, and biometric-related data",
        "paragraphs": [
          "Photos, signatures, uploaded documents, OCR results, face verification information, and biometric appointment status are sensitive. They should be used only for identity verification, document matching, application review, appointment completion, and NID lifecycle processing.",
          "A production version should protect these records using encrypted storage, secure file access, backend authorization, strict retention rules, and complete audit logging. UI-level copy prevention or right-click protection is helpful for presentation, but it is not a replacement for real backend security."
        ]
      },
      {
        "id": "who-can-access-information",
        "title": "Who can access information",
        "paragraphs": [
          "Access should be limited by role. Citizens should access only their own records. Admin officers, supervisors, support staff, and system administrators should access only the information needed to complete their responsibilities.",
          "Internal access should be logged and reviewed through audit trails. Sensitive actions such as approval, rejection, status change, correction approval, printing, delivery update, and account management should be traceable."
        ],
        "bullets": [
          "Citizens can access their own profile, application, appointment, support, delivery, correction, and Digital NID information.",
          "Admin officers can review and process application workflow records according to permission.",
          "Supervisors can oversee internal user activity and service operations where applicable.",
          "Support staff can access ticket and limited citizen information required to resolve service issues."
        ]
      },
      {
        "id": "sharing-and-disclosure",
        "title": "Sharing and disclosure",
        "paragraphs": [
          "This academic prototype does not sell citizen data. It should not share citizen information with advertisers, marketers, or data brokers. Information may be shared only inside permitted system workflows or with integrated verification services when needed for a specific task.",
          "If OCR, face verification, document validation, payment, or other external services are connected, each service should receive only the minimum information required for its assigned purpose."
        ]
      },
      {
        "id": "security-practices",
        "title": "Security practices",
        "paragraphs": [
          "Security should be implemented in the backend, database, file storage, API authorization layer, and operational controls. The user interface can reduce accidental exposure, but real protection must come from server-side validation and secure architecture.",
          "Expected security practices include protected routes, authenticated API access, password hashing, token/session safety, role-based permissions, readonly verified fields, audit logs, secure file handling, and careful error handling."
        ],
        "bullets": [
          "Use backend authorization for every sensitive request.",
          "Validate ownership before showing citizen application, profile, document, delivery, support, or Digital NID records.",
          "Keep source identity data locked unless a correction workflow is approved.",
          "Record sensitive status changes and admin actions in audit logs.",
          "Avoid exposing secrets, server keys, or unrestricted file paths in frontend code."
        ]
      },
      {
        "id": "cookies-and-technical-data",
        "title": "Cookies and technical data",
        "paragraphs": [
          "The system may use browser storage, authentication tokens, and technical metadata to keep users logged in, remember language preference, protect routes, and support normal application operation.",
          "Technical records may also be used for troubleshooting, security monitoring, audit trails, and project testing."
        ]
      },
      {
        "id": "data-retention",
        "title": "Data retention",
        "paragraphs": [
          "Academic demo data may be retained for development, testing, evaluation, and demonstration. In a real deployment, retention, deletion, archival, backup, and disposal policies should follow official rules and applicable privacy requirements.",
          "Unnecessary information should not be kept longer than needed for the permitted workflow, support purpose, or legal requirement."
        ]
      },
      {
        "id": "policy-changes",
        "title": "Policy changes",
        "paragraphs": [
          "This policy may be updated as the prototype improves. If the system design changes, the policy should be reviewed to make sure it still explains how information is collected, used, stored, shared, protected, and retained.",
          "The updated date at the top of this page shows when this policy version was last changed."
        ]
      },
      {
        "id": "contact-us",
        "title": "Contact us",
        "paragraphs": [
          "For privacy, support, or data-handling questions about this academic prototype, contact support@smartnid.local.",
          "Any real-world deployment should be reviewed under applicable privacy law, cybersecurity requirements, official identity service rules, and institutional approval processes."
        ]
      }
    ]
  },
  "bn": {
    "updated": "আপডেট: ১৭ জুন, ২০২৬",
    "title": "প্রাইভেসি পলিসি",
    "subtitle": "Smart NID কীভাবে আপনার তথ্য পরিচালনা করে",
    "toc": "সূচিপত্র",
    "introTitle": "ভূমিকা",
    "introLead": "এই প্রাইভেসি পলিসিতে ব্যাখ্যা করা হয়েছে Smart NID Card Management System নাগরিক, অভ্যন্তরীণ ব্যবহারকারী, প্রশাসক এবং সহায়তা কর্মীদের তথ্য কীভাবে সংগ্রহ, ব্যবহার, সংরক্ষণ, সুরক্ষা ও পরিচালনা করে।",
    "sections": [
      {
        "id": "introduction",
        "title": "ভূমিকা",
        "paragraphs": [
          "Smart NID Card Management System একটি চূড়ান্ত বর্ষের একাডেমিক প্রোটোটাইপ, যা একটি নিরাপদ নাগরিক পরিচয় সেবা প্রবাহ দেখানোর জন্য তৈরি করা হয়েছে। এই ব্যবস্থায় নাগরিক নিবন্ধন, লগইন, NID আবেদন জমা, নথি আপলোড, অ্যাপয়েন্টমেন্ট বুকিং, বায়োমেট্রিক সম্পন্নকরণ, প্রিন্টিং কিউ ব্যবস্থাপনা, ডেলিভারি ট্র্যাকিং, সংশোধন অনুরোধ, সহায়তা টিকিট এবং প্রশাসনিক অডিট লগ অন্তর্ভুক্ত।",
          "এই প্রাইভেসি পলিসি ওয়েব অ্যাপ্লিকেশন, নাগরিক পোর্টাল, প্রশাসনিক পোর্টাল এবং Smart NID কার্যপ্রবাহে ব্যবহৃত সংশ্লিষ্ট প্রোটোটাইপ সেবার জন্য প্রযোজ্য। এখানে কোন তথ্য প্রক্রিয়াকরণ করা হতে পারে, কেন ব্যবহার করা হয়, কারা প্রবেশাধিকার পেতে পারে এবং কোন সুরক্ষা নীতি অনুসরণ করা উচিত তা ব্যাখ্যা করা হয়েছে।",
          "এই ব্যবস্থা কোনো সরকারি NID সেবা নয়। বাস্তব ব্যবহারের ক্ষেত্রে গোপনীয়তা, নিরাপত্তা, তথ্য সংরক্ষণকাল, পরিচয় যাচাই এবং নিয়ন্ত্রক কার্যক্রম অবশ্যই প্রযোজ্য আইন, সরকারি মানদণ্ড এবং অনুমোদিত পরিচালনা পদ্ধতি অনুসরণ করবে।"
        ]
      },
      {
        "id": "our-values",
        "title": "আমাদের মূল্যবোধ",
        "paragraphs": [
          "Smart NID প্রোটোটাইপ কয়েকটি স্পষ্ট গোপনীয়তা নীতির উপর ভিত্তি করে তৈরি: শুধু প্রয়োজনীয় তথ্য সংগ্রহ করা, সংবেদনশীল পরিচয় তথ্য সুরক্ষিত রাখা, ভূমিকা অনুযায়ী প্রবেশাধিকার সীমিত করা, প্রতিটি গুরুত্বপূর্ণ কাজ অনুসরণযোগ্য রাখা এবং নাগরিক সেবা যাত্রা সহজভাবে বোঝানো।",
          "পরিচয়সংক্রান্ত তথ্য অত্যন্ত সংবেদনশীল। নাম, জন্ম নিবন্ধন তথ্য, NID নম্বর, ঠিকানা, ছবি, স্বাক্ষর, নথি, সংশোধনের প্রমাণ, অ্যাপয়েন্টমেন্ট ইতিহাস এবং সহায়তা রেকর্ড সতর্কতার সাথে পরিচালনা করা উচিত এবং কেবল বৈধ Smart NID সেবা কার্যক্রমে ব্যবহার করা উচিত।"
        ],
        "bullets": [
          "নাগরিকের তথ্য শুধু নিবন্ধন, যাচাই, আবেদন, অ্যাপয়েন্টমেন্ট, প্রিন্টিং, ডেলিভারি, সংশোধন, সহায়তা এবং জবাবদিহিমূলক কার্যপ্রবাহে ব্যবহার করা হবে।",
          "সংশোধন কার্যপ্রবাহ অনুমতি না দিলে মূল পরিচয় তথ্য শুধুপাঠ্য অবস্থায় রাখা হবে।",
          "প্রশাসনিক কাজ ভূমিকা-ভিত্তিক অনুমতি এবং অনুসরণযোগ্য অডিট লগ দিয়ে সুরক্ষিত থাকবে।",
          "ব্যবহারকারী ইন্টারফেসে সংবেদনশীল তথ্য অপ্রয়োজনীয়ভাবে প্রকাশ করা এড়ানো হবে।"
        ]
      },
      {
        "id": "why-we-process-your-information",
        "title": "কেন আমরা আপনার তথ্য প্রক্রিয়াকরণ করি",
        "paragraphs": [
          "নাগরিক যেন অ্যাকাউন্ট তৈরি করতে, Smart NID আবেদন জমা দিতে, প্রয়োজনীয় প্রমাণ আপলোড করতে, বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করতে, সেবার অগ্রগতি দেখতে, ডেলিভারি অনুরোধ করতে, সংশোধন অনুরোধ করতে এবং সহায়তা কর্মীদের সাথে যোগাযোগ করতে পারে—এই উদ্দেশ্যে ব্যবস্থা তথ্য প্রক্রিয়াকরণ করে।",
          "অভ্যন্তরীণ ব্যবহারকারীরা আবেদন পর্যালোচনা, নথি যাচাই, অনুমোদন বা বাতিল, অ্যাপয়েন্টমেন্ট পরিচালনা, বায়োমেট্রিক অবস্থা সম্পন্নকরণ, প্রিন্টিং কিউ পরিচালনা, ডেলিভারি রেকর্ড হালনাগাদ, সহায়তা টিকিটের উত্তর এবং অডিট কার্যক্রম পর্যালোচনার জন্য তথ্য ব্যবহার করতে পারে।"
        ],
        "bullets": [
          "জমা দেওয়া পরিচয় ও যোগাযোগের তথ্য ব্যবহার করে নাগরিক অ্যাকাউন্ট তৈরি ও যাচাই করা।",
          "NID আবেদন পর্যালোচনা করা এবং প্রতিটি আবেদনের জীবনচক্রের ধাপ সংরক্ষণ করা।",
          "OCR, মুখমণ্ডল যাচাই, নথি মিলানো এবং বায়োমেট্রিক অ্যাপয়েন্টমেন্ট কার্যপ্রবাহ সমর্থন করা।",
          "প্রয়োজনীয় ধাপ সম্পন্ন হওয়ার পরই Digital NID তথ্য দেখানো।",
          "প্রশাসনিক সিদ্ধান্ত, অবস্থা পরিবর্তন, ডেলিভারি কার্যক্রম এবং সহায়তা উত্তরের রেকর্ড রাখা।"
        ]
      },
      {
        "id": "your-rights-over-your-information",
        "title": "আপনার তথ্যের উপর আপনার অধিকার",
        "paragraphs": [
          "প্রোটোটাইপে থাকা সুবিধা অনুযায়ী নাগরিক নিজের প্রোফাইল তথ্য দেখতে, আবেদনের অবস্থা পরীক্ষা করতে, অ্যাপয়েন্টমেন্ট ও ডেলিভারি অগ্রগতি দেখতে, সহায়তা টিকিট খুলতে এবং কার্যপ্রবাহ অনুমতি দিলে সংশোধন অনুরোধ জমা দিতে পারে।",
          "কিছু তথ্য সরকারি বা যাচাইকৃত উৎস রেকর্ড থেকে আসতে পারে, তাই সেগুলো লক থাকতে পারে। লক করা ক্ষেত্র তথ্যের অখণ্ডতা রক্ষার জন্য সরাসরি সম্পাদনা করা যায় না। পরিবর্তন অনুমোদিত হলে সংশোধন অনুরোধ কার্যপ্রবাহ ব্যবহার করা যেতে পারে।"
        ],
        "bullets": [
          "জমা দেওয়া আবেদন ও প্রোফাইল তথ্য পর্যালোচনা করা।",
          "আবেদন, অ্যাপয়েন্টমেন্ট, প্রিন্টিং, ডেলিভারি এবং সংশোধন কার্যপ্রবাহের বর্তমান ধাপ অনুসরণ করা।",
          "কোনো বিষয় অস্পষ্ট হলে বা সহায়তা প্রয়োজন হলে সহায়তা অনুরোধ করা।",
          "ব্যবস্থা অনুমতি দিলে সংশোধিত তথ্য জমা দেওয়া।"
        ]
      },
      {
        "id": "what-we-collect",
        "title": "আমরা কোন তথ্য সংগ্রহ করি",
        "paragraphs": [
          "Smart NID কার্যপ্রবাহ পরিচালনার জন্য প্রয়োজনীয় তথ্য এই ব্যবস্থা প্রক্রিয়াকরণ করতে পারে। এর মধ্যে অ্যাকাউন্ট তথ্য, পরিচয় তথ্য, আপলোড করা নথি, অ্যাপয়েন্টমেন্ট তথ্য, ডেলিভারি তথ্য, সংশোধন অনুরোধ, সহায়তা বার্তা এবং সিস্টেম অডিট তথ্য থাকতে পারে।",
          "নিচের বিভাগগুলোতে প্রোটোটাইপে সংরক্ষিত বা প্রক্রিয়াকৃত হতে পারে এমন প্রধান তথ্যের ধরন ব্যাখ্যা করা হয়েছে।"
        ],
        "bullets": [
          "অ্যাকাউন্ট তথ্য: নাম, ইমেইল ঠিকানা, ফোন নম্বর, পাসওয়ার্ড-সুরক্ষিত লগইন তথ্য, অ্যাকাউন্ট ভূমিকা, অ্যাকাউন্ট অবস্থা এবং ভাষা পছন্দ।",
          "পরিচয় তথ্য: জন্ম নিবন্ধন নম্বর, NID নম্বর, জন্ম তারিখ, লিঙ্গ, রক্তের গ্রুপ, বাবা ও মায়ের তথ্য, পেশা, বৈবাহিক অবস্থা এবং ঠিকানার বিবরণ।",
          "আবেদন তথ্য: আবেদনের ধরন, জমার সময়, পর্যালোচনার অবস্থা, কর্মকর্তার সিদ্ধান্ত, অবস্থার ইতিহাস, নির্ধারিত NID নম্বর, সংশোধন অবস্থা এবং প্রযোজ্য ক্ষেত্রে পুনরায় ইস্যু বা ডেলিভারি অবস্থা।",
          "আপলোড করা প্রমাণ: পাসপোর্ট সাইজ ছবি, স্বাক্ষর ছবি, জন্ম সনদ বা নথির প্রমাণ এবং সংশোধনের প্রমাণ।",
          "অ্যাপয়েন্টমেন্ট তথ্য: নির্বাচিত কেন্দ্র, জেলা, তারিখ, সময় স্লট, বুকিং অবস্থা, বায়োমেট্রিক সম্পন্নের অবস্থা, সিরিয়াল তথ্য এবং কর্মকর্তার নোট।",
          "সহায়তা তথ্য: টিকিটের ধরন, বিবরণ, অগ্রাধিকার, অবস্থা, দায়িত্বপ্রাপ্ত ব্যক্তি, উত্তরের ইতিহাস এবং সমাধানের তথ্য।",
          "সিস্টেম তথ্য: অডিট লগ, সময়চিহ্ন, অবস্থা পরিবর্তন, প্রযোজ্য ক্ষেত্রে ডিভাইস বা IP-ধরনের মেটাডেটা এবং অভ্যন্তরীণ প্রশাসনিক কার্যক্রম।"
        ]
      },
      {
        "id": "how-we-use-information",
        "title": "আমরা তথ্য কীভাবে ব্যবহার করি",
        "paragraphs": [
          "Smart NID জীবনচক্র সম্পন্ন করতে এবং কার্যপ্রবাহকে সঠিক, অনুসরণযোগ্য ও বোধগম্য রাখতে তথ্য ব্যবহার করা হয়। নাগরিকের তথ্য সম্পর্কহীন বিজ্ঞাপন বা বিপণনের উদ্দেশ্যে ব্যবহার করা উচিত নয়।",
          "তথ্যের প্রধান ব্যবহার হলো পরিচয় যাচাই, আবেদন পর্যালোচনা, অ্যাপয়েন্টমেন্ট পরিচালনা, প্রিন্টিং প্রস্তুতি, ডেলিভারি ট্র্যাকিং, সংশোধন ব্যবস্থাপনা এবং সহায়তা যোগাযোগ সমর্থন করা।"
        ]
      },
      {
        "id": "documents-photo-and-biometric-data",
        "title": "নথি, ছবি ও বায়োমেট্রিক-সম্পর্কিত তথ্য",
        "paragraphs": [
          "ছবি, স্বাক্ষর, আপলোড করা নথি, OCR ফলাফল, মুখমণ্ডল যাচাইয়ের তথ্য এবং বায়োমেট্রিক অ্যাপয়েন্টমেন্ট অবস্থা সংবেদনশীল। এগুলো শুধু পরিচয় যাচাই, নথি মিলানো, আবেদন পর্যালোচনা, অ্যাপয়েন্টমেন্ট সম্পন্নকরণ এবং NID জীবনচক্র প্রক্রিয়ায় ব্যবহার করা উচিত।",
          "বাস্তব ব্যবহারের সংস্করণে এসব রেকর্ড এনক্রিপ্টেড সংরক্ষণ, নিরাপদ ফাইল প্রবেশাধিকার, ব্যাকএন্ড অনুমোদন, কঠোর সংরক্ষণ নীতি এবং পূর্ণ অডিট লগ দিয়ে সুরক্ষিত করা উচিত। UI পর্যায়ের কপি প্রতিরোধ বা রাইট-ক্লিক সুরক্ষা প্রদর্শনের জন্য সহায়ক, তবে এটি প্রকৃত ব্যাকএন্ড নিরাপত্তার বিকল্প নয়।"
        ]
      },
      {
        "id": "who-can-access-information",
        "title": "কারা তথ্য দেখতে বা ব্যবহার করতে পারে",
        "paragraphs": [
          "প্রবেশাধিকার ভূমিকা অনুযায়ী সীমিত হওয়া উচিত। নাগরিক শুধু নিজের রেকর্ড দেখতে পারবে। প্রশাসনিক কর্মকর্তা, তত্ত্বাবধায়ক, সহায়তা কর্মী এবং সিস্টেম প্রশাসক কেবল নিজের দায়িত্ব সম্পন্ন করার জন্য প্রয়োজনীয় তথ্যই ব্যবহার করবে।",
          "অভ্যন্তরীণ প্রবেশাধিকার অডিট ট্রেইলের মাধ্যমে লগ ও পর্যালোচিত হওয়া উচিত। অনুমোদন, বাতিল, অবস্থা পরিবর্তন, সংশোধন অনুমোদন, প্রিন্টিং, ডেলিভারি হালনাগাদ এবং অ্যাকাউন্ট ব্যবস্থাপনার মতো সংবেদনশীল কাজ অনুসরণযোগ্য থাকা দরকার।"
        ],
        "bullets": [
          "নাগরিক নিজের প্রোফাইল, আবেদন, অ্যাপয়েন্টমেন্ট, সহায়তা, ডেলিভারি, সংশোধন এবং Digital NID তথ্য দেখতে পারে।",
          "প্রশাসনিক কর্মকর্তা অনুমতি অনুযায়ী আবেদন কার্যপ্রবাহ পর্যালোচনা ও প্রক্রিয়াকরণ করতে পারে।",
          "তত্ত্বাবধায়ক প্রযোজ্য ক্ষেত্রে অভ্যন্তরীণ ব্যবহারকারীর কার্যক্রম এবং সেবা পরিচালনা পর্যবেক্ষণ করতে পারে।",
          "সহায়তা কর্মী সেবা সমস্যা সমাধানের জন্য প্রয়োজনীয় টিকিট ও সীমিত নাগরিক তথ্য দেখতে পারে।"
        ]
      },
      {
        "id": "sharing-and-disclosure",
        "title": "তথ্য ভাগাভাগি ও প্রকাশ",
        "paragraphs": [
          "এই একাডেমিক প্রোটোটাইপ নাগরিকের তথ্য বিক্রি করে না। বিজ্ঞাপনদাতা, বিপণনকারী বা ডেটা ব্রোকারের সাথে নাগরিক তথ্য ভাগ করা উচিত নয়। তথ্য কেবল অনুমোদিত সিস্টেম কার্যপ্রবাহের ভেতরে বা নির্দিষ্ট যাচাইকরণ কাজের প্রয়োজন হলে সমন্বিত যাচাইকরণ সেবার সাথে ভাগ করা যেতে পারে।",
          "OCR, মুখমণ্ডল যাচাই, নথি যাচাই, পেমেন্ট বা অন্য বাহ্যিক সেবা যুক্ত থাকলে প্রতিটি সেবা তার নির্ধারিত কাজের জন্য প্রয়োজনীয় ন্যূনতম তথ্যই পাবে।"
        ]
      },
      {
        "id": "security-practices",
        "title": "নিরাপত্তা ব্যবস্থা",
        "paragraphs": [
          "নিরাপত্তা ব্যাকএন্ড, ডেটাবেস, ফাইল সংরক্ষণ, API অনুমোদন স্তর এবং পরিচালনাগত নিয়ন্ত্রণে বাস্তবায়ন করা উচিত। ব্যবহারকারী ইন্টারফেস আকস্মিক প্রকাশ কমাতে পারে, কিন্তু প্রকৃত সুরক্ষা সার্ভার-পক্ষের যাচাই এবং নিরাপদ স্থাপত্য থেকেই আসতে হবে।",
          "প্রত্যাশিত নিরাপত্তা ব্যবস্থার মধ্যে রয়েছে সুরক্ষিত রুট, অনুমোদিত API প্রবেশাধিকার, পাসওয়ার্ড হ্যাশিং, টোকেন বা সেশন নিরাপত্তা, ভূমিকা-ভিত্তিক অনুমতি, শুধুপাঠ্য যাচাইকৃত ক্ষেত্র, অডিট লগ, নিরাপদ ফাইল ব্যবস্থাপনা এবং সতর্ক ত্রুটি ব্যবস্থাপনা।"
        ],
        "bullets": [
          "প্রতিটি সংবেদনশীল অনুরোধে ব্যাকএন্ড অনুমোদন ব্যবহার করা।",
          "নাগরিকের আবেদন, প্রোফাইল, নথি, ডেলিভারি, সহায়তা বা Digital NID রেকর্ড দেখানোর আগে মালিকানা যাচাই করা।",
          "সংশোধন কার্যপ্রবাহ অনুমোদিত না হলে মূল পরিচয় তথ্য লক রাখা।",
          "সংবেদনশীল অবস্থা পরিবর্তন ও প্রশাসনিক কাজ অডিট লগে রেকর্ড করা।",
          "ফ্রন্টএন্ড কোডে গোপন কী, সার্ভার কী বা অনিয়ন্ত্রিত ফাইল পথ প্রকাশ না করা।"
        ]
      },
      {
        "id": "cookies-and-technical-data",
        "title": "কুকিজ ও কারিগরি তথ্য",
        "paragraphs": [
          "ব্যবস্থা ব্যবহারকারীকে লগইন অবস্থায় রাখতে, ভাষা পছন্দ মনে রাখতে, রুট সুরক্ষিত রাখতে এবং অ্যাপ্লিকেশন স্বাভাবিকভাবে চালাতে ব্রাউজার সংরক্ষণ, অনুমোদন টোকেন এবং কারিগরি মেটাডেটা ব্যবহার করতে পারে।",
          "সমস্যা সমাধান, নিরাপত্তা পর্যবেক্ষণ, অডিট ট্রেইল এবং প্রকল্প পরীক্ষার জন্যও কারিগরি রেকর্ড ব্যবহার করা হতে পারে।"
        ]
      },
      {
        "id": "data-retention",
        "title": "তথ্য সংরক্ষণকাল",
        "paragraphs": [
          "একাডেমিক ডেমো তথ্য উন্নয়ন, পরীক্ষা, মূল্যায়ন এবং প্রদর্শনের জন্য সংরক্ষিত থাকতে পারে। বাস্তব ব্যবহারে তথ্য সংরক্ষণ, মুছে ফেলা, আর্কাইভ, ব্যাকআপ এবং নিষ্পত্তি নীতি সরকারি নিয়ম এবং প্রযোজ্য গোপনীয়তা শর্ত অনুসরণ করবে।",
          "অনুমোদিত কার্যপ্রবাহ, সহায়তার উদ্দেশ্য বা আইনি প্রয়োজন ছাড়া অপ্রয়োজনীয় তথ্য প্রয়োজনের বেশি সময় রাখা উচিত নয়।"
        ]
      },
      {
        "id": "policy-changes",
        "title": "নীতিমালার পরিবর্তন",
        "paragraphs": [
          "প্রোটোটাইপ উন্নত হওয়ার সাথে সাথে এই নীতিমালা হালনাগাদ হতে পারে। সিস্টেম নকশা পরিবর্তন হলে তথ্য কীভাবে সংগ্রহ, ব্যবহার, সংরক্ষণ, ভাগ, সুরক্ষা এবং ধরে রাখা হয় তা এখনও সঠিকভাবে ব্যাখ্যা করছে কি না—তা পর্যালোচনা করা উচিত।",
          "এই পাতার উপরের হালনাগাদ তারিখ দেখায় এই নীতিমালার সংস্করণ শেষ কবে পরিবর্তন করা হয়েছে।"
        ]
      },
      {
        "id": "contact-us",
        "title": "যোগাযোগ করুন",
        "paragraphs": [
          "এই একাডেমিক প্রোটোটাইপ সম্পর্কিত গোপনীয়তা, সহায়তা বা তথ্য-পরিচালনা প্রশ্নের জন্য support@smartnid.local ঠিকানায় যোগাযোগ করুন।",
          "বাস্তব ব্যবহারের আগে প্রযোজ্য গোপনীয়তা আইন, সাইবার নিরাপত্তা শর্ত, সরকারি পরিচয় সেবা বিধি এবং প্রাতিষ্ঠানিক অনুমোদন প্রক্রিয়া অনুযায়ী পর্যালোচনা করা উচিত।"
        ]
      }
    ]
  }
};


const termsOfServiceTranslations = {
  "en": {
    "updated": "UPDATED JUNE 17, 2026",
    "title": "Terms of Service",
    "subtitle": "How you may use Smart NID services",
    "toc": "TABLE OF CONTENTS",
    "introTitle": "Introduction",
    "introLead": "These Terms of Service explain the rules for using the Smart NID Card Management System, including citizen registration, NID application workflows, appointments, Digital NID preview, delivery requests, correction requests, support tickets, and administrative services.",
    "sections": [
      {
        "id": "introduction",
        "title": "Introduction"
      },
      {
        "id": "account-registration",
        "title": "Account registration and access",
        "paragraphs": [
          "Users may need to create an account and complete OTP or other verification steps before accessing citizen services. Account access is intended for the person who registered the account or for an authorized internal user acting within an assigned role.",
          "You are responsible for keeping your login credentials secure. Do not share your password, OTP, session access, or account with another person."
        ],
        "bullets": [
          "Provide accurate name, contact, birth registration, and identity-related details during registration.",
          "Use an email address and mobile number that you can access for verification and support communication.",
          "Notify support if you believe your account has been accessed without permission.",
          "Do not create fake accounts, duplicate accounts, or accounts using another person’s identity."
        ]
      },
      {
        "id": "citizen-responsibilities",
        "title": "Citizen responsibilities",
        "paragraphs": [
          "Citizens are expected to submit truthful information, upload proper documents, attend booked appointments, and follow the application, correction, reissue, and delivery workflow instructions shown in the system.",
          "Some identity fields may be locked because they come from verified or source records. If a change is required, the correction workflow should be used where available."
        ],
        "bullets": [
          "Review your application carefully before submission.",
          "Upload clear, relevant, and valid documents only.",
          "Do not edit screenshots, forged documents, or misleading evidence to bypass review.",
          "Use support tickets for genuine service questions or workflow issues."
        ]
      },
      {
        "id": "applications-and-documents",
        "title": "Applications and documents",
        "paragraphs": [
          "NID applications, correction requests, and reissue requests may require personal information, address details, photos, signatures, birth registration data, and supporting documents. These records are used to demonstrate the identity workflow and review process.",
          "Submitting an application does not guarantee approval. Applications may be reviewed, approved, rejected, returned, or placed under review based on the workflow and available evidence."
        ],
        "bullets": [
          "Uploaded documents should be readable and related to the submitted application.",
          "Application status may change as administrators review and process each stage.",
          "False, incomplete, or unclear information may delay processing or cause rejection.",
          "Correction requests should clearly explain what information needs to be changed."
        ]
      },
      {
        "id": "appointments-and-biometrics",
        "title": "Appointments and biometric workflow",
        "paragraphs": [
          "The system may allow citizens to book biometric appointments at available centers and time slots. Appointment availability, center rules, cancellation rules, and completion status are managed through the application workflow.",
          "Biometric completion may be required before printing, delivery, Digital NID access, or other lifecycle stages become available."
        ],
        "bullets": [
          "Choose an available center, date, and time slot carefully.",
          "Bring required documents or references when attending an appointment if instructed.",
          "Do not book appointments you do not intend to attend.",
          "Appointment status may be marked booked, completed, cancelled, or updated by authorized staff."
        ]
      },
      {
        "id": "digital-nid-and-printing",
        "title": "Digital NID, printing, and preview",
        "paragraphs": [
          "Digital NID preview is shown only when the workflow reaches the required stage. It is provided as a prototype visual representation for academic use and should not be treated as an official government-issued identity card.",
          "The system may include UI-level copy prevention, right-click prevention, canvas rendering, or print controls to reduce accidental misuse. These controls improve presentation, but they are not a replacement for backend authorization and secure storage."
        ],
        "bullets": [
          "Do not use the prototype Digital NID for real-world identity verification.",
          "Do not modify, forge, or misrepresent the Digital NID preview.",
          "Printing and delivery stages depend on approved workflow status.",
          "Download or print options are provided only for prototype demonstration where allowed."
        ]
      },
      {
        "id": "delivery-and-payments",
        "title": "Delivery and payments",
        "paragraphs": [
          "The system may include delivery requests, delivery status tracking, delivery fee configuration, and payment-related workflow steps. These features are part of the prototype service lifecycle demonstration.",
          "Payment or delivery actions should be used only as instructed by the system. In a real deployment, payment handling must comply with official financial, privacy, and security requirements."
        ],
        "bullets": [
          "Delivery request availability may depend on printing or approval status.",
          "Delivery status may be active, delivered, cancelled, or otherwise updated by authorized staff.",
          "Demo payment records should not be treated as real financial transactions unless a production payment gateway is approved and configured.",
          "Contact support if a delivery request or payment status appears incorrect."
        ]
      },
      {
        "id": "support-and-communication",
        "title": "Support and communication",
        "paragraphs": [
          "Support tickets are available for service questions, application concerns, appointment issues, delivery questions, and account-related help. Support communication should remain respectful, accurate, and related to the Smart NID service workflow.",
          "Internal support staff may review ticket details and limited citizen information required to respond to the issue."
        ],
        "bullets": [
          "Do not submit spam, abusive messages, false reports, or unrelated requests.",
          "Provide enough detail for support staff to understand the issue.",
          "Do not include unnecessary sensitive information in support messages.",
          "Ticket status and assignment may be updated by support staff or administrators."
        ]
      },
      {
        "id": "internal-user-rules",
        "title": "Internal user and admin rules",
        "paragraphs": [
          "Internal users, administrators, supervisors, and support staff must use the system only for assigned responsibilities. Access to citizen information should be limited to what is necessary for application review, appointment management, printing, delivery, support, audit, and system administration.",
          "Sensitive actions should be traceable through audit logs. Internal users should not access, export, edit, or share citizen information without a valid workflow reason."
        ],
        "bullets": [
          "Use role-based access responsibly and only for authorized tasks.",
          "Keep admin credentials secure and do not share internal accounts.",
          "Do not bypass review steps or approve records without proper verification.",
          "Report suspected misuse, unauthorized access, or data exposure."
        ]
      },
      {
        "id": "prohibited-use",
        "title": "Prohibited use",
        "paragraphs": [
          "You must not misuse the system, interfere with service operation, attempt unauthorized access, or use the prototype to create false identity records. Any behavior that threatens security, privacy, integrity, or service availability is prohibited."
        ],
        "bullets": [
          "Do not attempt to access another user’s account, application, Digital NID, documents, or support tickets.",
          "Do not upload malware, harmful files, forged evidence, or misleading information.",
          "Do not inspect, scrape, reverse engineer, exploit, or attack the system for unauthorized purposes.",
          "Do not overload the service, bypass authentication, or manipulate workflow status outside authorized controls.",
          "Do not use the prototype for official identification, fraud, impersonation, or real-world government service claims."
        ]
      },
      {
        "id": "availability-and-changes",
        "title": "Service availability and changes",
        "paragraphs": [
          "Because this is an academic prototype, features may be changed, disabled, reset, or unavailable during development, testing, or demonstration. Data may be modified or removed as part of project evaluation or maintenance.",
          "The system may update workflow rules, page designs, role permissions, sample records, demo data, and service behavior without prior notice during the project lifecycle."
        ]
      },
      {
        "id": "security-and-privacy",
        "title": "Security and privacy",
        "paragraphs": [
          "The system should protect accounts, application data, uploaded documents, Digital NID records, and administrative actions through authenticated routes, backend authorization, role-based access, input validation, password hashing, audit logs, and secure file handling.",
          "UI-level protection such as disabled editing, right-click prevention, or text obfuscation is only presentation-level protection. Real security must be enforced by the backend, database rules, and deployment configuration."
        ],
        "bullets": [
          "Do not share credentials, OTP codes, tokens, or private links.",
          "Do not store secrets or unrestricted file paths in frontend code.",
          "Use the Privacy Policy to understand how information is handled in the prototype.",
          "Report security concerns to support@smartnid.local."
        ]
      },
      {
        "id": "academic-prototype-notice",
        "title": "Academic prototype notice",
        "paragraphs": [
          "Smart NID Card Management System is not an official government service, legal identity authority, production NID platform, or financial service. It is an academic prototype designed to demonstrate a possible citizen identity workflow for educational evaluation.",
          "Any real deployment would require legal review, government approval, cybersecurity assessment, data protection compliance, payment compliance, accessibility review, and operational governance."
        ]
      },
      {
        "id": "liability-and-disclaimers",
        "title": "Limitation of liability and disclaimers",
        "paragraphs": [
          "The prototype is provided for academic demonstration and testing. It may contain demo data, incomplete workflows, simulated records, or development-stage behavior. It should not be relied upon for official identity decisions, government services, financial actions, or legal proof of identity.",
          "To the maximum extent appropriate for an academic prototype, the project authors are not responsible for misuse of demo data, screenshots, modified previews, unsupported deployments, or unauthorized changes made outside the intended project environment."
        ]
      },
      {
        "id": "terms-changes",
        "title": "Changes to these terms",
        "paragraphs": [
          "These Terms may be updated when the prototype changes, new modules are added, workflow rules are refined, or project requirements are adjusted. The updated date at the top of this page shows the latest version date.",
          "Continued use of the system after changes means you accept the updated Terms of Service."
        ]
      },
      {
        "id": "contact-us",
        "title": "Contact us",
        "paragraphs": [
          "For questions about these Terms of Service, system usage, account access, application workflow, or support issues, contact support@smartnid.local.",
          "For production use, terms must be reviewed by qualified legal, privacy, cybersecurity, and government service authorities before launch."
        ]
      }
    ]
  },
  "bn": {
    "updated": "আপডেটেড ১৭ জুন, ২০২৬",
    "title": "ব্যবহারের শর্তাবলি",
    "subtitle": "Smart NID সেবা ব্যবহারের নিয়ম",
    "toc": "সূচিপত্র",
    "introTitle": "ভূমিকা",
    "introLead": "এই ব্যবহারের শর্তাবলি Smart NID Card Management System ব্যবহারের নিয়ম ব্যাখ্যা করে। এর মধ্যে নাগরিক নিবন্ধন, NID আবেদন কার্যপ্রবাহ, অ্যাপয়েন্টমেন্ট, Digital NID প্রিভিউ, ডেলিভারি অনুরোধ, সংশোধন অনুরোধ, সহায়তা টিকিট এবং প্রশাসনিক সেবা অন্তর্ভুক্ত।",
    "sections": [
      {
        "id": "introduction",
        "title": "ভূমিকা"
      },
      {
        "id": "account-registration",
        "title": "অ্যাকাউন্ট নিবন্ধন ও প্রবেশাধিকার",
        "paragraphs": [
          "নাগরিক সেবা ব্যবহারের আগে ব্যবহারকারীকে অ্যাকাউন্ট তৈরি এবং OTP বা অন্যান্য যাচাইকরণ ধাপ সম্পন্ন করতে হতে পারে। অ্যাকাউন্ট প্রবেশাধিকার নিবন্ধিত ব্যক্তি অথবা নির্ধারিত দায়িত্বপ্রাপ্ত অনুমোদিত অভ্যন্তরীণ ব্যবহারকারীর জন্য।",
          "আপনার লগইন তথ্য নিরাপদ রাখা আপনার দায়িত্ব। পাসওয়ার্ড, OTP, সেশন প্রবেশাধিকার বা অ্যাকাউন্ট অন্য কারও সাথে ভাগ করা যাবে না।"
        ],
        "bullets": [
          "নিবন্ধনের সময় সঠিক নাম, যোগাযোগের তথ্য, জন্ম নিবন্ধন এবং পরিচয়-সম্পর্কিত তথ্য দিন।",
          "যাচাইকরণ ও সহায়তা যোগাযোগের জন্য আপনার ব্যবহারের উপযোগী ইমেইল ও মোবাইল নম্বর ব্যবহার করুন।",
          "অ্যাকাউন্ট অনুমতি ছাড়া ব্যবহৃত হয়েছে মনে হলে সহায়তা বিভাগে জানান।",
          "ভুয়া অ্যাকাউন্ট, একাধিক প্রতারণামূলক অ্যাকাউন্ট বা অন্য ব্যক্তির পরিচয় ব্যবহার করে অ্যাকাউন্ট তৈরি করবেন না।"
        ]
      },
      {
        "id": "citizen-responsibilities",
        "title": "নাগরিকের দায়িত্ব",
        "paragraphs": [
          "নাগরিককে সত্য তথ্য জমা দিতে, সঠিক নথি আপলোড করতে, বুক করা অ্যাপয়েন্টমেন্টে উপস্থিত হতে এবং আবেদন, সংশোধন, পুনরায় ইস্যু ও ডেলিভারি কার্যপ্রবাহের নির্দেশনা অনুসরণ করতে হবে।",
          "কিছু পরিচয় ক্ষেত্র যাচাইকৃত বা উৎস রেকর্ড থেকে আসতে পারে, তাই সেগুলো লক থাকতে পারে। পরিবর্তন প্রয়োজন হলে উপলব্ধ সংশোধন কার্যপ্রবাহ ব্যবহার করতে হবে।"
        ],
        "bullets": [
          "জমা দেওয়ার আগে আবেদন ভালোভাবে পরীক্ষা করুন।",
          "শুধু পরিষ্কার, প্রাসঙ্গিক ও বৈধ নথি আপলোড করুন।",
          "পর্যালোচনা এড়ানোর জন্য সম্পাদিত স্ক্রিনশট, জাল নথি বা বিভ্রান্তিকর প্রমাণ ব্যবহার করবেন না।",
          "সত্যিকারের সেবা প্রশ্ন বা কার্যপ্রবাহ সমস্যার জন্য সহায়তা টিকিট ব্যবহার করুন।"
        ]
      },
      {
        "id": "applications-and-documents",
        "title": "আবেদন ও নথি",
        "paragraphs": [
          "NID আবেদন, সংশোধন অনুরোধ এবং পুনরায় ইস্যু অনুরোধে ব্যক্তিগত তথ্য, ঠিকানার তথ্য, ছবি, স্বাক্ষর, জন্ম নিবন্ধন তথ্য এবং সহায়ক নথি প্রয়োজন হতে পারে। এসব রেকর্ড পরিচয় কার্যপ্রবাহ ও পর্যালোচনা প্রক্রিয়া প্রদর্শনের জন্য ব্যবহৃত হয়।",
          "আবেদন জমা দিলেই অনুমোদন নিশ্চিত নয়। কার্যপ্রবাহ ও প্রমাণের ভিত্তিতে আবেদন পর্যালোচনা, অনুমোদন, বাতিল, ফেরত বা পর্যালোচনাধীন রাখা হতে পারে।"
        ],
        "bullets": [
          "আপলোড করা নথি পাঠযোগ্য এবং জমা দেওয়া আবেদনের সাথে সম্পর্কিত হতে হবে।",
          "প্রশাসনিক পর্যালোচনা ও প্রক্রিয়াকরণের ভিত্তিতে আবেদনের অবস্থা পরিবর্তন হতে পারে।",
          "ভুল, অসম্পূর্ণ বা অস্পষ্ট তথ্য প্রক্রিয়াকরণ বিলম্বিত করতে বা আবেদন বাতিল করতে পারে।",
          "সংশোধন অনুরোধে কোন তথ্য পরিবর্তন প্রয়োজন তা পরিষ্কারভাবে উল্লেখ করতে হবে।"
        ]
      },
      {
        "id": "appointments-and-biometrics",
        "title": "অ্যাপয়েন্টমেন্ট ও বায়োমেট্রিক কার্যপ্রবাহ",
        "paragraphs": [
          "ব্যবস্থা উপলব্ধ কেন্দ্র ও সময় স্লট অনুযায়ী বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুক করার সুবিধা দিতে পারে। অ্যাপয়েন্টমেন্টের প্রাপ্যতা, কেন্দ্রের নিয়ম, বাতিলের নিয়ম এবং সম্পন্নের অবস্থা আবেদন কার্যপ্রবাহের মাধ্যমে পরিচালিত হয়।",
          "প্রিন্টিং, ডেলিভারি, Digital NID প্রবেশাধিকার বা অন্যান্য জীবনচক্র ধাপ চালু হওয়ার আগে বায়োমেট্রিক সম্পন্ন হওয়া প্রয়োজন হতে পারে।"
        ],
        "bullets": [
          "উপলব্ধ কেন্দ্র, তারিখ এবং সময় স্লট সতর্কতার সাথে নির্বাচন করুন।",
          "নির্দেশনা থাকলে অ্যাপয়েন্টমেন্টে প্রয়োজনীয় নথি বা রেফারেন্স সাথে আনুন।",
          "যে অ্যাপয়েন্টমেন্টে উপস্থিত হতে চান না, সেটি বুক করবেন না।",
          "অনুমোদিত কর্মী অ্যাপয়েন্টমেন্টের অবস্থা বুকড, সম্পন্ন, বাতিল বা হালনাগাদ করতে পারে।"
        ]
      },
      {
        "id": "digital-nid-and-printing",
        "title": "Digital NID, প্রিন্টিং ও প্রিভিউ",
        "paragraphs": [
          "কার্যপ্রবাহ নির্ধারিত ধাপে পৌঁছালে Digital NID প্রিভিউ দেখানো হয়। এটি একাডেমিক ব্যবহারের জন্য প্রোটোটাইপ ভিজ্যুয়াল উপস্থাপনা; সরকারি ইস্যুকৃত পরিচয়পত্র হিসেবে ব্যবহার করা যাবে না।",
          "অসাবধানতাজনিত অপব্যবহার কমাতে ব্যবস্থা UI-পর্যায়ের কপি প্রতিরোধ, রাইট-ক্লিক প্রতিরোধ, ক্যানভাস রেন্ডারিং বা প্রিন্ট নিয়ন্ত্রণ ব্যবহার করতে পারে। এগুলো উপস্থাপনা উন্নত করে, কিন্তু ব্যাকএন্ড অনুমোদন ও নিরাপদ সংরক্ষণের বিকল্প নয়।"
        ],
        "bullets": [
          "প্রোটোটাইপ Digital NID বাস্তব পরিচয় যাচাইয়ের জন্য ব্যবহার করবেন না।",
          "Digital NID প্রিভিউ পরিবর্তন, জাল বা বিভ্রান্তিকরভাবে উপস্থাপন করবেন না।",
          "প্রিন্টিং ও ডেলিভারি ধাপ অনুমোদিত কার্যপ্রবাহ অবস্থার উপর নির্ভর করে।",
          "ডাউনলোড বা প্রিন্ট সুবিধা শুধু অনুমোদিত প্রোটোটাইপ প্রদর্শনের জন্য।"
        ]
      },
      {
        "id": "delivery-and-payments",
        "title": "ডেলিভারি ও পেমেন্ট",
        "paragraphs": [
          "ব্যবস্থায় ডেলিভারি অনুরোধ, ডেলিভারি অবস্থা অনুসরণ, ডেলিভারি ফি কনফিগারেশন এবং পেমেন্ট-সম্পর্কিত কার্যপ্রবাহ ধাপ থাকতে পারে। এগুলো প্রোটোটাইপ সেবা জীবনচক্র প্রদর্শনের অংশ।",
          "পেমেন্ট বা ডেলিভারি কার্যক্রম শুধু ব্যবস্থার নির্দেশনা অনুযায়ী ব্যবহার করতে হবে। বাস্তব ব্যবহারে পেমেন্ট পরিচালনা সরকারি আর্থিক, গোপনীয়তা ও নিরাপত্তা শর্ত মেনে চলবে।"
        ],
        "bullets": [
          "ডেলিভারি অনুরোধের প্রাপ্যতা প্রিন্টিং বা অনুমোদন অবস্থার উপর নির্ভর করতে পারে।",
          "ডেলিভারি অবস্থা অনুমোদিত কর্মী সক্রিয়, ডেলিভারড, বাতিল বা অন্য অবস্থায় হালনাগাদ করতে পারে।",
          "অনুমোদিত উৎপাদন পেমেন্ট গেটওয়ে না থাকলে ডেমো পেমেন্ট রেকর্ডকে বাস্তব আর্থিক লেনদেন ধরা যাবে না।",
          "ডেলিভারি অনুরোধ বা পেমেন্ট অবস্থা ভুল মনে হলে সহায়তায় যোগাযোগ করুন।"
        ]
      },
      {
        "id": "support-and-communication",
        "title": "সহায়তা ও যোগাযোগ",
        "paragraphs": [
          "সেবা প্রশ্ন, আবেদন সমস্যা, অ্যাপয়েন্টমেন্ট জটিলতা, ডেলিভারি প্রশ্ন এবং অ্যাকাউন্ট-সম্পর্কিত সহায়তার জন্য সহায়তা টিকিট ব্যবহার করা যায়। সহায়তা যোগাযোগ সম্মানজনক, সঠিক এবং Smart NID কার্যপ্রবাহ-সম্পর্কিত হতে হবে।",
          "সমস্যার উত্তর দিতে অভ্যন্তরীণ সহায়তা কর্মীরা টিকিটের বিবরণ এবং প্রয়োজনীয় সীমিত নাগরিক তথ্য পর্যালোচনা করতে পারে।"
        ],
        "bullets": [
          "স্প্যাম, অপমানজনক বার্তা, মিথ্যা প্রতিবেদন বা অসংশ্লিষ্ট অনুরোধ জমা দেবেন না।",
          "সহায়তা কর্মীরা যেন সমস্যা বুঝতে পারে, সে জন্য যথেষ্ট বিবরণ দিন।",
          "সহায়তা বার্তায় অপ্রয়োজনীয় সংবেদনশীল তথ্য দেবেন না।",
          "টিকিটের অবস্থা ও দায়িত্বপ্রাপ্ত ব্যক্তি সহায়তা কর্মী বা প্রশাসক হালনাগাদ করতে পারে।"
        ]
      },
      {
        "id": "internal-user-rules",
        "title": "অভ্যন্তরীণ ব্যবহারকারী ও প্রশাসনিক নিয়ম",
        "paragraphs": [
          "অভ্যন্তরীণ ব্যবহারকারী, প্রশাসক, তত্ত্বাবধায়ক এবং সহায়তা কর্মী কেবল নির্ধারিত দায়িত্বের জন্য ব্যবস্থা ব্যবহার করবে। নাগরিক তথ্যের প্রবেশাধিকার আবেদন পর্যালোচনা, অ্যাপয়েন্টমেন্ট ব্যবস্থাপনা, প্রিন্টিং, ডেলিভারি, সহায়তা, অডিট এবং প্রশাসনের প্রয়োজনের মধ্যে সীমিত থাকবে।",
          "সংবেদনশীল কাজ অডিট লগের মাধ্যমে অনুসরণযোগ্য হতে হবে। বৈধ কার্যপ্রবাহ কারণ ছাড়া অভ্যন্তরীণ ব্যবহারকারী নাগরিক তথ্য দেখা, রপ্তানি, সম্পাদনা বা ভাগ করতে পারবে না।"
        ],
        "bullets": [
          "ভূমিকা-ভিত্তিক প্রবেশাধিকার দায়িত্বশীলভাবে এবং অনুমোদিত কাজের জন্য ব্যবহার করুন।",
          "প্রশাসনিক লগইন তথ্য নিরাপদ রাখুন এবং অভ্যন্তরীণ অ্যাকাউন্ট ভাগ করবেন না।",
          "যথাযথ যাচাই ছাড়া পর্যালোচনা ধাপ এড়িয়ে যাওয়া বা রেকর্ড অনুমোদন করবেন না।",
          "অপব্যবহার, অনুমতিহীন প্রবেশাধিকার বা তথ্য ফাঁসের সন্দেহ হলে রিপোর্ট করুন।"
        ]
      },
      {
        "id": "prohibited-use",
        "title": "নিষিদ্ধ ব্যবহার",
        "paragraphs": [
          "ব্যবস্থার অপব্যবহার, সেবা পরিচালনায় বাধা দেওয়া, অনুমতিহীন প্রবেশের চেষ্টা বা ভুয়া পরিচয় রেকর্ড তৈরি করা যাবে না। নিরাপত্তা, গোপনীয়তা, অখণ্ডতা বা সেবার প্রাপ্যতা ক্ষতিগ্রস্ত করে এমন আচরণ নিষিদ্ধ।"
        ],
        "bullets": [
          "অন্য ব্যবহারকারীর অ্যাকাউন্ট, আবেদন, Digital NID, নথি বা সহায়তা টিকিটে প্রবেশের চেষ্টা করবেন না।",
          "ম্যালওয়্যার, ক্ষতিকর ফাইল, জাল প্রমাণ বা বিভ্রান্তিকর তথ্য আপলোড করবেন না।",
          "অননুমোদিত উদ্দেশ্যে ব্যবস্থা পরিদর্শন, স্ক্র্যাপ, রিভার্স ইঞ্জিনিয়ার, শোষণ বা আক্রমণ করবেন না।",
          "সেবা অতিরিক্ত চাপ দেওয়া, প্রমাণীকরণ এড়ানো বা অনুমোদিত নিয়ন্ত্রণের বাইরে কার্যপ্রবাহ অবস্থা পরিবর্তন করবেন না।",
          "প্রোটোটাইপকে সরকারি পরিচয়, প্রতারণা, ছদ্মবেশ ধারণ বা বাস্তব সরকারি সেবার দাবি হিসেবে ব্যবহার করবেন না।"
        ]
      },
      {
        "id": "availability-and-changes",
        "title": "সেবার প্রাপ্যতা ও পরিবর্তন",
        "paragraphs": [
          "এটি একাডেমিক প্রোটোটাইপ হওয়ায় উন্নয়ন, পরীক্ষা বা প্রদর্শনের সময় বৈশিষ্ট্য পরিবর্তন, নিষ্ক্রিয়, রিসেট বা অপ্রাপ্য হতে পারে। প্রকল্প মূল্যায়ন বা রক্ষণাবেক্ষণের অংশ হিসেবে তথ্য পরিবর্তন বা মুছে ফেলা হতে পারে।",
          "প্রকল্প জীবনচক্রে পূর্ব নোটিশ ছাড়াই কার্যপ্রবাহের নিয়ম, পৃষ্ঠার নকশা, ভূমিকার অনুমতি, নমুনা রেকর্ড, ডেমো তথ্য এবং সেবার আচরণ হালনাগাদ হতে পারে।"
        ]
      },
      {
        "id": "security-and-privacy",
        "title": "নিরাপত্তা ও গোপনীয়তা",
        "paragraphs": [
          "ব্যবস্থায় অ্যাকাউন্ট, আবেদন তথ্য, আপলোড করা নথি, Digital NID রেকর্ড এবং প্রশাসনিক কাজ সুরক্ষিত রুট, ব্যাকএন্ড অনুমোদন, ভূমিকা-ভিত্তিক প্রবেশাধিকার, ইনপুট যাচাই, পাসওয়ার্ড হ্যাশিং, অডিট লগ এবং নিরাপদ ফাইল ব্যবস্থাপনার মাধ্যমে সুরক্ষিত হওয়া উচিত।",
          "সম্পাদনা নিষ্ক্রিয় করা, রাইট-ক্লিক প্রতিরোধ বা টেক্সট অস্পষ্টকরণের মতো UI-পর্যায়ের সুরক্ষা শুধু উপস্থাপনাগত সুরক্ষা। প্রকৃত নিরাপত্তা ব্যাকএন্ড, ডেটাবেস নিয়ম এবং স্থাপন কনফিগারেশন দিয়ে নিশ্চিত করতে হবে।"
        ],
        "bullets": [
          "লগইন তথ্য, OTP কোড, টোকেন বা ব্যক্তিগত লিংক ভাগ করবেন না।",
          "ফ্রন্টএন্ড কোডে গোপন কী বা অনিয়ন্ত্রিত ফাইল পথ রাখবেন না।",
          "প্রোটোটাইপে তথ্য কীভাবে ব্যবহৃত হয় জানতে Privacy Policy পড়ুন।",
          "নিরাপত্তা উদ্বেগ থাকলে support@smartnid.local ঠিকানায় জানান।"
        ]
      },
      {
        "id": "academic-prototype-notice",
        "title": "একাডেমিক প্রোটোটাইপ নোটিশ",
        "paragraphs": [
          "Smart NID Card Management System কোনো সরকারি সেবা, আইনি পরিচয় কর্তৃপক্ষ, উৎপাদন পর্যায়ের NID প্ল্যাটফর্ম বা আর্থিক সেবা নয়। এটি শিক্ষাগত মূল্যায়নের জন্য সম্ভাব্য নাগরিক পরিচয় কার্যপ্রবাহ প্রদর্শনের একাডেমিক প্রোটোটাইপ।",
          "বাস্তব ব্যবহার চালু করতে হলে আইনি পর্যালোচনা, সরকারি অনুমোদন, সাইবার নিরাপত্তা মূল্যায়ন, তথ্য সুরক্ষা মান্যতা, পেমেন্ট মান্যতা, অ্যাক্সেসিবিলিটি পর্যালোচনা এবং পরিচালনাগত শাসন প্রয়োজন।"
        ]
      },
      {
        "id": "liability-and-disclaimers",
        "title": "দায়বদ্ধতার সীমা ও অস্বীকৃতি",
        "paragraphs": [
          "প্রোটোটাইপটি একাডেমিক প্রদর্শন ও পরীক্ষার জন্য দেওয়া হয়েছে। এতে ডেমো তথ্য, অসম্পূর্ণ কার্যপ্রবাহ, অনুকরণমূলক রেকর্ড বা উন্নয়নাধীন আচরণ থাকতে পারে। সরকারি পরিচয় সিদ্ধান্ত, সরকারি সেবা, আর্থিক কার্যক্রম বা পরিচয়ের আইনি প্রমাণ হিসেবে এর উপর নির্ভর করা যাবে না।",
          "একাডেমিক প্রোটোটাইপ হিসেবে প্রকল্প লেখকরা ডেমো তথ্যের অপব্যবহার, স্ক্রিনশট, পরিবর্তিত প্রিভিউ, অসমর্থিত স্থাপন বা নির্ধারিত প্রকল্প পরিবেশের বাইরে অননুমোদিত পরিবর্তনের জন্য দায়ী নন।"
        ]
      },
      {
        "id": "terms-changes",
        "title": "শর্তাবলির পরিবর্তন",
        "paragraphs": [
          "প্রোটোটাইপ পরিবর্তন হলে, নতুন মডিউল যুক্ত হলে, কার্যপ্রবাহের নিয়ম উন্নত হলে বা প্রকল্পের প্রয়োজন সমন্বয় হলে এই শর্তাবলি হালনাগাদ হতে পারে। পৃষ্ঠার উপরের হালনাগাদ তারিখ সর্বশেষ সংস্করণের তারিখ দেখায়।",
          "পরিবর্তনের পর ব্যবস্থা ব্যবহার চালিয়ে গেলে হালনাগাদ ব্যবহারের শর্তাবলি আপনি গ্রহণ করেছেন বলে ধরা হবে।"
        ]
      },
      {
        "id": "contact-us",
        "title": "যোগাযোগ করুন",
        "paragraphs": [
          "এই ব্যবহারের শর্তাবলি, ব্যবস্থা ব্যবহার, অ্যাকাউন্ট প্রবেশাধিকার, আবেদন কার্যপ্রবাহ বা সহায়তা বিষয়ে প্রশ্ন থাকলে support@smartnid.local ঠিকানায় যোগাযোগ করুন।",
          "বাস্তব ব্যবহারের আগে শর্তাবলি যোগ্য আইনি, গোপনীয়তা, সাইবার নিরাপত্তা এবং সরকারি সেবা কর্তৃপক্ষ দ্বারা পর্যালোচিত হওয়া উচিত।"
        ]
      }
    ]
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
      if (key === 'privacyPolicy') {
        return privacyPolicyTranslations[language] ?? privacyPolicyTranslations.en;
      }

      if (key === 'termsOfService') {
        return termsOfServiceTranslations[language] ?? termsOfServiceTranslations.en;
      }

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
