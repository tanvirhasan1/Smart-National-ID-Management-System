import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaIdCard,
  FaCalendarAlt,
  FaSearch,
  FaDownload,
  FaHeadset,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTruck,
  FaArrowRight,
  FaSyncAlt,
  FaEye,
  FaRegFileAlt,
  FaMoneyBillWave
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatDate, formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/Dashboard.css';

const formatDashboardDateTime = (value, language = 'en') => {
  if (!value) return 'N/A';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getSafeTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const ACTIVE_APPLICATION_STATUSES = new Set([
  'draft',
  'submitted',
  'under_review',
  'correction_required',
  'approved',
  'printed',
  'dispatched'
]);

const NEW_NID_BLOCKING_STATUSES = new Set([
  ...ACTIVE_APPLICATION_STATUSES,
  'delivered'
]);

const CORRECTION_ALLOWED_STATUSES = new Set([
  'approved',
  'printed',
  'dispatched',
  'delivered'
]);

const isNewNidApplication = (application = {}) =>
  String(application.applicationType || 'new').toLowerCase() === 'new';


const isDeliveryPaymentCompleted = (application) =>
  ['paid', 'waived'].includes(application?.deliveryInfo?.paymentStatus);

const needsDeliveryPayment = (application) =>
  application?.status === 'printed' && !isDeliveryPaymentCompleted(application);


const dashboardCopy = {
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
    noApplicationsYet: 'No applications yet',
    noApplicationsText:
      'You have not submitted any Smart NID application yet. Prepare the required information, then start the process from the apply page.',
    applyNow: 'Apply Now',
    needHelp: 'Need Help?',
    open: 'Open',
    viewDetails: 'View Details',
    digitalNid: 'Digital NID',
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
        actionLabel: 'Track full status',
        secondaryActionLabel: 'Contact support'
      },
      review: {
        badge: 'In Review',
        title: 'Your application is under verification',
        description:
          'Your submitted information and supporting documents are being reviewed by the authority.',
        actionLabel: 'Track full status',
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
        actionBooked: 'Track full status',
        actionNoBooking: 'Book appointment',
        secondaryActionLabel: 'View full status'
      },
      printed: {
        badge: 'Printed',
        title: 'Your Smart NID has been printed',
        description:
          'Printing is complete. The next official delivery update will appear here automatically.',
        actionLabel: 'Track full status',
        secondaryActionLabel: 'View Digital NID'
      },
      dispatched: {
        badge: 'Dispatched',
        title: 'Your Smart NID is on the way',
        description:
          'Your card has already been dispatched and is now moving through delivery.',
        actionLabel: 'Track full status',
        secondaryActionLabel: 'View Digital NID'
      },
      delivered: {
        badge: 'Delivered',
        title: 'Your Smart NID has been delivered',
        description:
          'Delivery is complete. You can now keep the digital copy for quick reference if available.',
        actionLabel: 'View Digital NID',
        secondaryActionLabel: 'Track full status'
      },
      rejected: {
        badge: 'Rejected',
        title: 'Your application needs correction',
        description:
          'Your application was rejected during review. Please read the official reason below and take the next action.',
        actionLabel: 'Contact support',
        secondaryActionLabel: 'View full status'
      },
      cancelled: {
        badge: 'Cancelled',
        title: 'Your previous application was cancelled',
        description:
          'This application is no longer active. You can start a new application whenever you are ready.',
        actionLabel: 'Apply again',
        secondaryActionLabel: 'Contact support'
      },
      default: {
        title: 'Follow your latest NID update',
        description:
          'Your latest application status is available here. Open the tracker for full details.',
        actionLabel: 'Track full status',
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
        title: 'Appointment Booked',
        description:
          'Your biometric appointment is already booked. Open the tracker to review the latest appointment information.',
        actionLabel: 'Track appointment'
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
      correctionWithApp: 'Request changes to your approved Smart NID information',
      applyLocked: 'Available after the current application is rejected/cancelled, or use Correction after approval',
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
    noApplicationsYet: 'এখনও কোনো আবেদন নেই',
    noApplicationsText:
      'আপনি এখনও কোনো স্মার্ট এনআইডি আবেদন জমা দেননি। প্রয়োজনীয় তথ্য প্রস্তুত করে আবেদন পেজ থেকে প্রক্রিয়া শুরু করুন।',
    applyNow: 'এখন আবেদন করুন',
    needHelp: 'সাহায্য লাগবে?',
    open: 'খুলুন',
    viewDetails: 'বিস্তারিত দেখুন',
    digitalNid: 'ডিজিটাল এনআইডি',
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

const CitizenDashboard = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = dashboardCopy[language === 'bn' ? 'bn' : 'en'];

  const translateStatus = (status) =>
    copy.statusLabels[status] || formatStatus(status);

  const displayName =
    language === 'bn'
      ? user?.fullNameBangla || user?.fullName || copy.citizen
      : user?.fullName || user?.fullNameBangla || copy.citizen;

  const formatDashboardDate = (value) =>
    value ? formatDashboardDateTime(value, language) : copy.na;

  const [applications, setApplications] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState({
    applications: {
      total: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      printed: 0,
      delivered: 0
    },
    appointments: {
      total: 0,
      booked: 0,
      completed: 0
    },
    supportTickets: {
      total: 0,
      open: 0,
      resolved: 0
    },
    latest: {
      application: null,
      appointment: null,
      supportTicket: null
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const fetchDashboardData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [summaryResponse, applicationsResponse] = await Promise.all([
        api.get('/users/dashboard/summary'),
        api.get('/applications/my')
      ]);

      const summaryData = summaryResponse?.data?.data || {};
      const applicationList = applicationsResponse?.data?.applications || [];

      setDashboardSummary({
        applications: summaryData.applications || {
          total: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          printed: 0,
          delivered: 0
        },
        appointments: summaryData.appointments || {
          total: 0,
          booked: 0,
          completed: 0
        },
        supportTickets: summaryData.supportTickets || {
          total: 0,
          open: 0,
          resolved: 0
        },
        latest: summaryData.latest || {
          application: null,
          appointment: null,
          supportTicket: null
        }
      });

      setApplications(applicationList);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData({ silent: true });
      }
    };

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData({ silent: true });
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDashboardData]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'delivered':
        return <FaCheckCircle className="text-green-600" />;
      case 'submitted':
      case 'under_review':
      case 'printed':
        return <FaClock className="text-amber-500" />;
      case 'correction_required':
        return <FaExclamationTriangle className="text-amber-500" />;
      case 'rejected':
      case 'cancelled':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'dispatched':
        return <FaTruck className="text-sky-500" />;
      default:
        return <FaClock className="text-gray-400" />;
    }
  };

  const getDashboardStatusTheme = (application) => {
    if (!application) {
      return {
        iconBoxClass: 'bg-slate-100 text-slate-600',
        statusBoxClass: 'border border-slate-200 bg-slate-50',
        statusTextClass: 'text-slate-700'
      };
    }

    switch (application.status) {
      case 'submitted':
      case 'under_review':
        return {
          iconBoxClass: 'bg-amber-100 text-amber-600',
          statusBoxClass: 'border border-amber-200 bg-amber-50',
          statusTextClass: 'text-amber-700'
        };

      case 'correction_required':
        return {
          iconBoxClass: 'bg-orange-100 text-orange-600',
          statusBoxClass: 'border border-orange-200 bg-orange-50',
          statusTextClass: 'text-orange-700'
        };

      case 'approved':
        return {
          iconBoxClass: 'bg-emerald-100 text-emerald-600',
          statusBoxClass: 'border border-emerald-200 bg-emerald-50',
          statusTextClass: 'text-emerald-700'
        };

      case 'printed':
      case 'dispatched':
        return {
          iconBoxClass: 'bg-sky-100 text-sky-600',
          statusBoxClass: 'border border-sky-200 bg-sky-50',
          statusTextClass: 'text-sky-700'
        };

      case 'delivered':
        return {
          iconBoxClass: 'bg-green-100 text-green-600',
          statusBoxClass: 'border border-green-200 bg-green-50',
          statusTextClass: 'text-green-700'
        };

      case 'rejected':
        return {
          iconBoxClass: 'bg-red-100 text-red-600',
          statusBoxClass: 'border border-red-200 bg-red-50',
          statusTextClass: 'text-red-700'
        };

      case 'cancelled':
        return {
          iconBoxClass: 'bg-slate-100 text-slate-600',
          statusBoxClass: 'border border-slate-200 bg-slate-50',
          statusTextClass: 'text-slate-700'
        };

      default:
        return {
          iconBoxClass: 'bg-slate-100 text-slate-600',
          statusBoxClass: 'border border-slate-200 bg-slate-50',
          statusTextClass: 'text-slate-700'
        };
    }
  };

  const approvedApplication = applications.find((app) =>
    ['approved', 'printed', 'dispatched', 'delivered'].includes(app.status)
  );

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      const firstTime = getSafeTime(a?.updatedAt || a?.createdAt);
      const secondTime = getSafeTime(b?.updatedAt || b?.createdAt);
      return secondTime - firstTime;
    });
  }, [applications]);

  const currentApplication = useMemo(() => {
    return (
      sortedApplications.find((app) => app.status !== 'cancelled') ||
      sortedApplications[0] ||
      null
    );
  }, [sortedApplications]);

  const activeApplication = useMemo(() => {
    return (
      sortedApplications.find((app) => ACTIVE_APPLICATION_STATUSES.has(app?.status)) ||
      null
    );
  }, [sortedApplications]);

  const newNidBlockingApplication = useMemo(() => {
    return (
      sortedApplications.find(
        (app) => isNewNidApplication(app) && NEW_NID_BLOCKING_STATUSES.has(app?.status)
      ) || null
    );
  }, [sortedApplications]);

  const approvedOrIssuedNewNidApplication = useMemo(() => {
    return (
      sortedApplications.find(
        (app) => isNewNidApplication(app) && CORRECTION_ALLOWED_STATUSES.has(app?.status)
      ) || null
    );
  }, [sortedApplications]);

  const canStartApplication = !newNidBlockingApplication;
  const canRequestCorrection = Boolean(approvedOrIssuedNewNidApplication);
  const shouldShowDisabledNewNidAction = Boolean(newNidBlockingApplication && !canRequestCorrection);

  const latestStatusHistory = useMemo(() => {
    if (!currentApplication?.statusHistory?.length) {
      return [];
    }

    return [...currentApplication.statusHistory]
      .sort((a, b) => getSafeTime(b?.changedAt) - getSafeTime(a?.changedAt))
      .slice(0, 3);
  }, [currentApplication]);

  const hasApplications = applications.length > 0;
  const displayedRecentApplications = applications.slice(0, 3);

  const noApplicationHighlights = [
    {
      ...copy.highlights[0],
      icon: <FaIdCard />
    },
    {
      ...copy.highlights[1],
      icon: <FaClock />
    },
    {
      ...copy.highlights[2],
      icon: <FaSearch />
    }
  ];

  const getPrimaryApplicationState = (application) => {
    if (!application) {
      const state = copy.primary.noApplication;
      return {
        badge: state.badge,
        badgeClass: 'bg-slate-100 text-slate-700',
        title: state.title,
        description: state.description,
        actionLabel: state.actionLabel,
        actionTo: '/apply',
        secondaryActionLabel: state.secondaryActionLabel,
        secondaryActionTo: '/support',
        icon: <FaIdCard />
      };
    }

    switch (application.status) {
      case 'submitted': {
        const state = copy.primary.submitted;
        return {
          badge: state.badge,
          badgeClass: 'bg-blue-100 text-blue-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaClock />
        };
      }

      case 'under_review': {
        const state = copy.primary.review;
        return {
          badge: state.badge,
          badgeClass: 'bg-amber-100 text-amber-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaClock />
        };
      }

      case 'correction_required': {
        const state = copy.primary.correctionRequired;
        return {
          badge: state.badge,
          badgeClass: 'bg-orange-100 text-orange-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaExclamationTriangle />
        };
      }

      case 'approved': {
        const state = copy.primary.approved;
        const hasBookedAppointment = dashboardSummary.appointments.booked > 0;

        return {
          badge: state.badge,
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: state.title,
          description: hasBookedAppointment
            ? state.descriptionBooked
            : state.descriptionNoBooking,
          actionLabel: hasBookedAppointment
            ? state.actionBooked
            : state.actionNoBooking,
          actionTo: hasBookedAppointment
            ? `/track-application?id=${application._id}`
            : `/book-appointment/${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaCheckCircle />
        };
      }

      case 'printed': {
        const state = copy.primary.printed;
        const deliveryPaymentNeeded = needsDeliveryPayment(application);

        return {
          badge: state.badge,
          badgeClass: 'bg-sky-100 text-sky-700',
          title: state.title,
          description: deliveryPaymentNeeded
            ? 'Printing is complete. Please complete the delivery payment to request home delivery.'
            : copy.deliveryPayment.waitingDispatch,
          actionLabel: deliveryPaymentNeeded
            ? copy.deliveryPayment.payFee
            : state.actionLabel,
          actionTo: deliveryPaymentNeeded
            ? `/delivery-payment/${application._id}`
            : `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/digital-nid/${application._id}`,
          icon: deliveryPaymentNeeded ? <FaMoneyBillWave /> : <FaIdCard />
        };
      }

      case 'dispatched': {
        const state = copy.primary.dispatched;
        return {
          badge: state.badge,
          badgeClass: 'bg-sky-100 text-sky-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/digital-nid/${application._id}`,
          icon: <FaTruck />
        };
      }

      case 'delivered': {
        const state = copy.primary.delivered;
        return {
          badge: state.badge,
          badgeClass: 'bg-emerald-100 text-emerald-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/digital-nid/${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaDownload />
        };
      }

      case 'rejected': {
        const state = copy.primary.rejected;
        return {
          badge: state.badge,
          badgeClass: 'bg-red-100 text-red-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: '/support',
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: `/track-application?id=${application._id}`,
          icon: <FaExclamationTriangle />
        };
      }

      case 'cancelled': {
        const state = copy.primary.cancelled;
        return {
          badge: state.badge,
          badgeClass: 'bg-slate-100 text-slate-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: '/apply',
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaIdCard />
        };
      }

      default: {
        const state = copy.primary.default;
        return {
          badge: translateStatus(application.status),
          badgeClass: 'bg-slate-100 text-slate-700',
          title: state.title,
          description: state.description,
          actionLabel: state.actionLabel,
          actionTo: `/track-application?id=${application._id}`,
          secondaryActionLabel: state.secondaryActionLabel,
          secondaryActionTo: '/support',
          icon: <FaSearch />
        };
      }
    }
  };

  const getSidePanels = (application) => {
    const panel = copy.sidePanels;

    if (!application) {
      return [
        {
          ...panel.beforeApply,
          actionTo: '/apply',
          icon: <FaIdCard />
        },
        {
          ...panel.processWorks,
          actionTo: '/support',
          icon: <FaSearch />
        }
      ];
    }

    if (application.status === 'correction_required') {
      return [
        {
          ...panel.correctionAction,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaExclamationTriangle />
        },
        {
          ...panel.correctionHelp,
          actionTo: '/support',
          icon: <FaHeadset />
        }
      ];
    }

    if (application.status === 'rejected') {
      return [
        {
          ...panel.rejectedAction,
          actionTo: '/apply',
          icon: <FaExclamationTriangle />
        },
        {
          ...panel.rejectedHelp,
          actionTo: '/support',
          icon: <FaHeadset />
        }
      ];
    }

    if (application.status === 'cancelled') {
      return [
        {
          ...panel.cancelledAction,
          actionTo: '/apply',
          icon: <FaIdCard />
        },
        {
          ...panel.cancelledHelp,
          actionTo: '/support',
          icon: <FaHeadset />
        }
      ];
    }

    if (['submitted', 'under_review'].includes(application.status)) {
      return [
        {
          ...panel.reviewProgress,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaClock />
        },
        {
          ...panel.nextAfterReview,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaSearch />
        }
      ];
    }

    if (application.status === 'approved') {
      return [
        dashboardSummary.appointments.booked > 0
          ? {
            ...panel.appointmentBooked,
            actionTo: `/track-application?id=${application._id}`,
            icon: <FaCalendarAlt />
          }
          : {
            ...panel.appointmentNeeded,
            actionTo: `/book-appointment/${application._id}`,
            icon: <FaCalendarAlt />
          },
        {
          ...panel.deliveryNotStarted,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        }
      ];
    }

    if (application.status === 'printed') {
      const deliveryPaymentNeeded = needsDeliveryPayment(application);

      return [
        deliveryPaymentNeeded
          ? {
            ...panel.deliveryPaymentRequired,
            actionTo: `/delivery-payment/${application._id}`,
            icon: <FaMoneyBillWave />
          }
          : {
            ...panel.deliveryPaymentDone,
            actionTo: `/track-application?id=${application._id}`,
            icon: <FaCheckCircle />
          },
        {
          ...panel.deliveryQueue,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        }
      ];
    }

    if (application.status === 'dispatched') {
      return [
        {
          ...panel.outForDelivery,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaTruck />
        },
        {
          ...panel.digitalCopyAvailable,
          actionTo: `/digital-nid/${application._id}`,
          icon: <FaDownload />
        }
      ];
    }

    if (application.status === 'delivered') {
      return [
        {
          ...panel.deliveryCompleted,
          actionTo: `/track-application?id=${application._id}`,
          icon: <FaCheckCircle />
        },
        {
          ...panel.digitalCopyReady,
          actionTo: `/digital-nid/${application._id}`,
          icon: <FaDownload />
        }
      ];
    }

    return [
      {
        ...panel.latestUpdate,
        actionTo: `/track-application?id=${application._id}`,
        icon: <FaSearch />
      },
      {
        ...panel.needSupport,
        actionTo: '/support',
        icon: <FaHeadset />
      }
    ];
  };

  const primaryApplicationState = getPrimaryApplicationState(currentApplication);
  const sidePanels = getSidePanels(currentApplication);
  const dashboardStatusTheme = getDashboardStatusTheme(currentApplication);

  const applicationAction = canStartApplication
    ? {
      to: '/apply',
      title: copy.quickActionItems.applyTitle,
      description: hasApplications
        ? copy.quickActionItems.applyWithApp
        : copy.quickActionItems.applyNoApp,
      icon: <FaIdCard />,
      cardClass:
        'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70',
      iconClass: 'bg-emerald-100 text-emerald-600'
    }
    : canRequestCorrection
      ? {
        to: '/apply?type=correction',
        title: copy.quickActionItems.correctionTitle || 'Correction',
        description: copy.quickActionItems.correctionWithApp || 'Request changes to your approved Smart NID information',
        icon: <FaIdCard />,
        cardClass:
          'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70',
        iconClass: 'bg-emerald-100 text-emerald-600'
      }
      : shouldShowDisabledNewNidAction
        ? {
          title: copy.quickActionItems.applyTitle,
          description: copy.quickActionItems.applyLocked,
          icon: <FaIdCard />,
          disabled: true,
          cardClass:
            'dashboard-action-card-disabled border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70',
          iconClass: 'bg-emerald-100 text-emerald-600'
        }
        : null;

  const quickActions = [
    ...(applicationAction ? [applicationAction] : []),
    {
      to: '/track-application',
      title: copy.quickActionItems.trackTitle,
      description: hasApplications
        ? copy.quickActionItems.trackWithApp
        : copy.quickActionItems.trackNoApp,
      icon: <FaSearch />,
      cardClass: 'border-sky-100 bg-gradient-to-br from-white to-sky-50/70',
      iconClass: 'bg-sky-100 text-sky-600'
    },
    {
      to: '/support',
      title: copy.quickActionItems.supportTitle,
      description: copy.quickActionItems.supportDescription,
      icon: <FaHeadset />,
      cardClass:
        'border-violet-100 bg-gradient-to-br from-white to-violet-50/70',
      iconClass: 'bg-violet-100 text-violet-600'
    }
  ];

  if (needsDeliveryPayment(currentApplication)) {
    quickActions.splice(applicationAction ? 2 : 1, 0, {
      to: `/delivery-payment/${currentApplication._id}`,
      title: copy.deliveryPayment.quickTitle,
      description: copy.deliveryPayment.quickDescription,
      icon: <FaMoneyBillWave />,
      cardClass:
        'border-sky-100 bg-gradient-to-br from-white to-sky-50/70',
      iconClass: 'bg-sky-100 text-sky-600'
    });
  }

  if (approvedApplication) {
    quickActions.splice(applicationAction ? 2 : 1, 0, {
      to: `/digital-nid/${approvedApplication._id}`,
      title: copy.quickActionItems.digitalTitle,
      description: copy.quickActionItems.digitalDescription,
      icon: <FaDownload />,
      cardClass:
        'border-amber-100 bg-gradient-to-br from-white to-amber-50/70',
      iconClass: 'bg-amber-100 text-amber-600'
    });
  }

  if (loading) {
    return (
      <div className="dashboard-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text={copy.loading} />
      </div>
    );
  }

  return (
    <div className="dashboard-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="dashboard-content-shell mx-auto w-full max-w-[1200px]">
        {/* Welcome Section */}
        <section className="dashboard-welcome-panel mb-8 flex flex-col justify-between gap-5 rounded-2xl bg-[linear-gradient(135deg,#16A34A_0%,#15803D_100%)] px-6 py-6 text-white md:flex-row md:items-center md:px-8">
          <div className="dashboard-welcome-content">
            <h1 className="dashboard-welcome-title mb-1 text-[1.75rem] font-bold">
              {copy.welcomePrefix}, {displayName}!
            </h1>
            <p className="dashboard-welcome-subtitle mt-3 text-lg text-white/90">
              {copy.welcomeSubtitle}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {refreshing && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <FaSyncAlt className="animate-spin" />
                  {copy.syncing}
                </span>
              )}

              {lastSyncedAt && (
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {copy.autoSynced}: {formatDashboardDate(lastSyncedAt)}
                </span>
              )}
            </div>
          </div>

          {(canStartApplication || canRequestCorrection || shouldShowDisabledNewNidAction) && (
            <div className="dashboard-welcome-actions">
              {shouldShowDisabledNewNidAction ? (
                <div
                  className="dashboard-apply-button dashboard-apply-button-disabled inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#16A34A]"
                  aria-disabled="true"
                  title={copy.newNidLocked}
                >
                  <FaIdCard />
                  <span>{copy.applyForNewNid}</span>
                </div>
              ) : (
                <Link
                  to={canStartApplication ? '/apply' : '/apply?type=correction'}
                  className="dashboard-apply-button inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-[#F0FDF4]"
                >
                  <FaIdCard />
                  <span>{canStartApplication ? (hasApplications ? copy.applyForNewNid : copy.startApplication) : copy.applyForCorrection}</span>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Status Overview */}
        <section className="dashboard-status-section mb-8">
          <div className="dashboard-status-grid grid items-start gap-5 xl:grid-cols-[1.45fr,0.95fr]">
            <div className="dashboard-primary-status-card self-start rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] lg:p-7">
              <div className="dashboard-primary-status-top flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="dashboard-primary-status-copy">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${primaryApplicationState.badgeClass}`}
                  >
                    {primaryApplicationState.badge}
                  </span>

                  <h2 className="mt-4 text-[1.8rem] font-semibold leading-tight text-[#111827]">
                    {primaryApplicationState.title}
                  </h2>

                  <p className="mt-2 max-w-[620px] text-sm leading-7 text-[#6B7280]">
                    {primaryApplicationState.description}
                  </p>
                </div>

                <div
                  className={`dashboard-primary-status-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl ${dashboardStatusTheme.iconBoxClass}`}
                >
                  {primaryApplicationState.icon}
                </div>
              </div>

              {currentApplication && (
                <div className="dashboard-primary-status-meta mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.applicationId}
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-[#111827]">
                      #{currentApplication.applicationId || copy.na}
                    </p>
                  </div>
                  <div className={`rounded-xl px-4 py-3 ${dashboardStatusTheme.statusBoxClass}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.currentStatus}
                    </p>
                    <p className={`mt-1 text-sm font-semibold ${dashboardStatusTheme.statusTextClass}`}>
                      {translateStatus(currentApplication.status)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.submittedOn}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {currentApplication.createdAt
                        ? formatDashboardDate(currentApplication.createdAt)
                        : copy.na}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {copy.lastUpdated}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {currentApplication.updatedAt
                        ? formatDashboardDate(currentApplication.updatedAt)
                        : copy.na}
                    </p>
                  </div>
                </div>
              )}

              {currentApplication?.status === 'rejected' &&
                currentApplication?.rejectionReason && (
                  <div className="dashboard-rejection-note mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
                      {copy.rejectionReason}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-red-800">
                      {currentApplication.rejectionReason}
                    </p>
                  </div>
                )}

              {latestStatusHistory.length > 0 && (
                <div className="dashboard-latest-updates mt-5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                    {copy.latestUpdates}
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    {latestStatusHistory.map((historyItem, index) => (
                      <div
                        key={`${historyItem.toStatus}-${historyItem.changedAt}-${index}`}
                        className="dashboard-latest-update-item rounded-lg bg-[#F9FAFB] px-3 py-3"
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-semibold text-[#111827]">
                            {translateStatus(historyItem.toStatus)}
                          </p>

                          <p className="text-xs text-[#6B7280]">
                            {historyItem.changedAt
                              ? formatDashboardDate(historyItem.changedAt)
                              : copy.na}
                          </p>
                        </div>

                        {historyItem.note && (
                          <p className="mt-1 text-sm text-[#6B7280]">
                            {historyItem.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!currentApplication && (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {noApplicationHighlights.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-4"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg text-[#16A34A] shadow-sm">
                        {item.icon}
                      </div>

                      <h4 className="text-sm font-semibold text-[#111827]">
                        {item.title}
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="dashboard-primary-status-actions mt-6 flex flex-wrap gap-3">
                <Link
                  to={primaryApplicationState.actionTo}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                >
                  <span>{primaryApplicationState.actionLabel}</span>
                  <FaArrowRight />
                </Link>

                {primaryApplicationState.secondaryActionLabel && (
                  <Link
                    to={primaryApplicationState.secondaryActionTo}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                  >
                    <span>{primaryApplicationState.secondaryActionLabel}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="dashboard-side-panels grid self-start gap-5 md:grid-cols-2 xl:grid-cols-1">
              {sidePanels.map((panel, index) => (
                <div
                  key={`${panel.title}-${index}`}
                  className="dashboard-update-card rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                >
                  <div className="dashboard-side-panel-heading mb-4 flex items-center gap-4">
                    <div className="dashboard-side-panel-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDF4] text-xl text-[#059669]">
                      {panel.icon}
                    </div>

                    <h3 className="dashboard-side-panel-title text-lg font-semibold text-[#111827]">
                      {panel.title}
                    </h3>
                  </div>

                  <p className="text-sm leading-7 text-[#6B7280]">
                    {panel.description}
                  </p>

                  <Link
                    to={panel.actionTo}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#059669]"
                  >
                    <span>{panel.actionLabel}</span>
                    <FaArrowRight />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="dashboard-actions-section mb-10">
          <div className="mb-5">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {copy.quickActions}
            </span>

            <h2 className="mt-3 text-[1.35rem] font-semibold text-[#1F2937]">
              {hasApplications ? copy.continueJourney : copy.startFromHere}
            </h2>

            <p className="mt-1 text-sm text-[#6B7280]">
              {hasApplications
                ? copy.quickActionsWithApps
                : copy.quickActionsNoApps}
            </p>
          </div>

          <div
            className={`dashboard-actions-grid grid gap-5 sm:grid-cols-2 ${quickActions.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'
              }`}
          >
            {quickActions.map((action) => {
              const actionContent = (
                <>
                  <div className="dashboard-action-heading">
                    <div
                      className={`dashboard-action-icon flex h-[56px] w-[56px] items-center justify-center rounded-2xl text-xl ${action.iconClass}`}
                    >
                      {action.icon}
                    </div>

                    <h4 className="dashboard-action-title text-[1.05rem] font-semibold text-[#1F2937]">
                      {action.title}
                    </h4>
                  </div>

                  <p className="text-sm leading-6 text-[#6B7280]">
                    {action.description}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#16A34A]">
                    {copy.open} <FaArrowRight />
                  </span>
                </>
              );

              if (action.disabled) {
                return (
                  <div
                    key={action.title}
                    className={`dashboard-action-card relative overflow-hidden rounded-2xl border p-6 ${action.cardClass}`}
                    aria-disabled="true"
                    title={copy.newNidLocked}
                  >
                    {actionContent}
                  </div>
                );
              }

              return (
                <Link
                  key={action.title}
                  to={action.to}
                  className={`dashboard-action-card relative overflow-hidden rounded-2xl border p-6 transition hover:-translate-y-[3px] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${action.cardClass}`}
                >
                  {actionContent}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Applications / Getting Started */}
        <section className="dashboard-recent-section">
          {!hasApplications ? (
            <>
              <div className="dashboard-section-header mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="dashboard-section-title text-[1.25rem] font-semibold text-[#1F2937]">
                    {copy.gettingStarted}
                  </h2>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    {copy.gettingStartedText}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] md:p-8">
                <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
                  <div>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0FDF4] text-2xl text-[#16A34A]">
                      <FaIdCard />
                    </div>

                    <h3 className="text-xl font-bold text-[#111827]">
                      {copy.noApplicationsYet}
                    </h3>

                    <p className="mt-2 max-w-[520px] text-sm leading-7 text-[#6B7280]">
                      {copy.noApplicationsText}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link
                        to="/apply"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                      >
                        <span>{copy.applyNow}</span>
                        <FaArrowRight />
                      </Link>

                      <Link
                        to="/support"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                      >
                        <span>{copy.needHelp}</span>
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                        Step 1
                      </p>
                      <h4 className="mt-2 text-sm font-bold text-[#111827]">
                        Prepare documents
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                        Keep your birth registration number, recent photo, signature image, and mobile number ready.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                        Step 2
                      </p>
                      <h4 className="mt-2 text-sm font-bold text-[#111827]">
                        Submit application
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                        Fill up the form carefully and submit your Smart NID request online.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                        Step 3
                      </p>
                      <h4 className="mt-2 text-sm font-bold text-[#111827]">
                        Wait for review
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                        After submission, the authority will review your information and documents.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                        Step 4
                      </p>
                      <h4 className="mt-2 text-sm font-bold text-[#111827]">
                        Track updates
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                        Follow approval, appointment, printing, and delivery progress from your dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-recent-table-card">
              <div className="dashboard-recent-table-header">
                <div>
                  <h2>{copy.recentApplications}</h2>
                  <p>{copy.recentApplicationsText}</p>
                </div>

                <Link to="/track-application" className="dashboard-recent-table-view-all">
                  <span>{copy.viewAll}</span>
                  <FaArrowRight />
                </Link>
              </div>

              <div className="dashboard-recent-table-scroll">
                <table className="dashboard-recent-table">
                  <thead>
                    <tr>
                      <th>{copy.applicationId}</th>
                      <th>{copy.type}</th>
                      <th>{copy.submitted}</th>
                      <th>{copy.updated}</th>
                      <th>{copy.status}</th>
                      <th>{copy.action}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRecentApplications.map((app) => (
                      <tr key={app._id}>
                        <td className="dashboard-recent-application-cell">
                          <div className="dashboard-recent-application-info">
                            <span
                              className={`dashboard-recent-file-icon status-${app.status || 'default'}`}
                            >
                              <FaRegFileAlt />
                            </span>

                            <div>
                              <h4>#{app.applicationId}</h4>

                              {app.status === 'rejected' && app.rejectionReason && (
                                <p className="dashboard-recent-reason">
                                  <FaExclamationTriangle />
                                  <span>{copy.reason}: {app.rejectionReason}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="dashboard-recent-type-pill">
                            {(app.applicationType || copy.na).toUpperCase()}
                          </span>
                        </td>

                        <td>{app.createdAt ? formatDashboardDate(app.createdAt) : copy.na}</td>

                        <td>{app.updatedAt ? formatDashboardDate(app.updatedAt) : copy.na}</td>

                        <td>
                          <span className={`dashboard-recent-status-pill status-${app.status || 'default'}`}>
                            <span className="dashboard-recent-status-dot" />
                            {translateStatus(app.status)}
                          </span>
                        </td>

                        <td>
                          <div className="dashboard-recent-action-group">
                            <Link
                              to={`/track-application?id=${app._id}`}
                              className="dashboard-recent-action-btn"
                            >
                              <FaEye />
                              <span>{copy.viewDetails}</span>
                            </Link>

                            {needsDeliveryPayment(app) && (
                              <Link
                                to={`/delivery-payment/${app._id}`}
                                className="dashboard-recent-action-btn dashboard-recent-action-btn-payment"
                              >
                                <FaMoneyBillWave />
                                <span>{copy.deliveryPayment.payShort}</span>
                              </Link>
                            )}

                            {['approved', 'printed', 'dispatched', 'delivered'].includes(
                              app.status
                            ) && (
                              <Link
                                to={`/digital-nid/${app._id}`}
                                className="dashboard-recent-action-btn dashboard-recent-action-btn-primary"
                              >
                                <FaIdCard />
                                <span>{copy.digitalNid}</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default CitizenDashboard;

