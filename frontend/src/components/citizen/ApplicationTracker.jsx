import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaPrint,
  FaTruck,
  FaHome,
  FaSearch,
  FaFileAlt,
  FaIdCard,
  FaArrowRight,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaSyncAlt
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatStatus, getStatusColor } from '../utils/helpers';
import { useLanguage } from '../context/LanguageContext';
import {
  canViewDigitalNid,
  getApplicationAppointmentSummary,
  getApplicationLifecycleStageKey,
  isAppointmentBookingActionAvailable
} from '../../utils/applicationLifecycle';
import '../styles/ApplicationTracker.css';

const TRACKER_STEPS = [
  {
    key: 'submitted',
    label: 'Submitted',
    icon: FaFileAlt,
    description: 'Your application has been submitted successfully.'
  },
  {
    key: 'under_review',
    label: 'Under Review',
    icon: FaSearch,
    description: 'Your documents and information are being reviewed.'
  },
  {
    key: 'approved',
    label: 'Approved',
    icon: FaCheckCircle,
    description: 'Your application is approved and biometric appointment is required.'
  },
  {
    key: 'printed',
    label: 'Printed',
    icon: FaPrint,
    description: 'Your Smart NID card has been printed. Digital NID and Correction are available.'
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: FaTruck,
    description: 'Your Smart NID card has been dispatched.'
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: FaHome,
    description: 'Your Smart NID card has been delivered successfully.'
  }
];

const TRACKER_LIFECYCLE_COPY = {
  en: {
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
  },
  bn: {
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
};

const getTrackerLifecycleCopy = (language = 'en') =>
  TRACKER_LIFECYCLE_COPY[language === 'bn' ? 'bn' : 'en'];


const TRACKER_PAGE_COPY = {
  en: {
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
    timelineTime: { waitingNext: 'Waiting for next update', inProgress: 'In progress', completed: 'Completed' }
  },
  bn: {
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
    timelineTime: { waitingNext: 'পরবর্তী আপডেটের অপেক্ষায়', inProgress: 'চলমান', completed: 'সম্পন্ন' }
  }
};

const getTrackerPageCopy = (language = 'en') =>
  TRACKER_PAGE_COPY[language === 'bn' ? 'bn' : 'en'];

const formatTrackerStatus = (status, copy = TRACKER_PAGE_COPY.en) => {
  if (!status) {
    return copy.notAvailable;
  }

  return copy.statuses?.[status] || formatStatus(status);
};

const formatApplicationType = (type, copy = TRACKER_PAGE_COPY.en) => {
  if (!type) {
    return copy.notAvailable;
  }

  return copy.statuses?.[type] || String(type).toUpperCase();
};

const getApplicationTimelineSteps = (
  application,
  lifecycleCopy = TRACKER_LIFECYCLE_COPY.en,
  copy = TRACKER_PAGE_COPY.en
) => {
  if (!application) {
    return [];
  }

  const status = application.status || 'submitted';
  const timelineCopy = copy.timeline;
  const hasDispatchUpdate = Boolean(application.dispatchedAt)
    || (application.statusHistory || []).some((item) => item.toStatus === 'dispatched');

  const submittedStep = {
    key: 'submitted',
    label: timelineCopy.submitted.label,
    icon: FaFileAlt,
    description: timelineCopy.submitted.description,
    state: status === 'submitted' ? 'current' : 'completed',
    dateKey: 'submitted',
    currentText: timelineCopy.submitted.currentText
  };

  if (status === 'submitted') {
    return [
      submittedStep,
      {
        key: 'waiting_review',
        label: timelineCopy.waitingReview.label,
        icon: FaClock,
        description: timelineCopy.waitingReview.description,
        state: 'pending',
        pendingText: timelineCopy.waitingReview.pendingText
      },
      {
        key: 'decision_pending',
        label: timelineCopy.decisionPending.label,
        icon: FaSearch,
        description: timelineCopy.decisionPending.description,
        state: 'pending',
        pendingText: timelineCopy.decisionPending.pendingText
      }
    ];
  }

  if (status === 'under_review') {
    return [
      submittedStep,
      {
        key: 'admin_review',
        label: timelineCopy.adminReview.label,
        icon: FaSearch,
        description: timelineCopy.adminReview.description,
        state: 'current',
        dateKey: 'under_review',
        currentText: timelineCopy.adminReview.currentText
      },
      {
        key: 'decision_pending',
        label: timelineCopy.decisionWaiting.label,
        icon: FaClock,
        description: timelineCopy.decisionWaiting.description,
        state: 'pending',
        pendingText: timelineCopy.decisionWaiting.pendingText
      }
    ];
  }

  if (status === 'rejected') {
    return [
      submittedStep,
      {
        key: 'reviewed_rejected',
        label: timelineCopy.reviewedRejected.label,
        icon: FaTimesCircle,
        description: timelineCopy.reviewedRejected.description,
        state: 'current',
        tone: 'danger',
        badgeText: timelineCopy.reviewedRejected.badgeText,
        dateKey: 'rejected'
      },
      {
        key: 'closed',
        label: timelineCopy.applicationClosed.label,
        icon: FaExclamationTriangle,
        description: timelineCopy.applicationClosed.description,
        state: 'pending',
        tone: 'danger',
        badgeText: timelineCopy.applicationClosed.badgeText,
        pendingText: timelineCopy.applicationClosed.pendingText
      }
    ];
  }

  if (status === 'cancelled') {
    return [
      submittedStep,
      {
        key: 'cancelled',
        label: timelineCopy.cancelled.label,
        icon: FaExclamationTriangle,
        description: timelineCopy.cancelled.description,
        state: 'current',
        tone: 'muted',
        badgeText: timelineCopy.cancelled.badgeText,
        dateKey: 'cancelled'
      },
      {
        key: 'closed',
        label: timelineCopy.processClosed.label,
        icon: FaTimesCircle,
        description: timelineCopy.processClosed.description,
        state: 'pending',
        tone: 'muted',
        badgeText: timelineCopy.processClosed.badgeText,
        pendingText: timelineCopy.processClosed.pendingText
      }
    ];
  }

  const reviewedApprovedStep = {
    key: 'reviewed_approved',
    label: timelineCopy.reviewedApproved.label,
    icon: FaCheckCircle,
    description: timelineCopy.reviewedApproved.description,
    state: 'completed',
    dateKey: 'approved'
  };

  if (status === 'approved') {
    const stageKey = getApplicationLifecycleStageKey(application);
    const stageCopy =
      lifecycleCopy.stages[stageKey] || lifecycleCopy.stages.appointment_required;

    return [
      submittedStep,
      reviewedApprovedStep,
      {
        key: stageKey,
        label: stageCopy.label,
        icon: stageKey === 'waiting_for_printing' ? FaPrint : FaCalendarAlt,
        description: stageCopy.description,
        state: 'current',
        dateKey: stageKey,
        currentText: stageCopy.currentText
      }
    ];
  }

  if (status === 'printed') {
    return [
      submittedStep,
      reviewedApprovedStep,
      {
        key: 'printed',
        label: timelineCopy.cardPrinted.label,
        icon: FaPrint,
        description: timelineCopy.cardPrinted.description,
        state: 'current',
        dateKey: 'printed'
      },
      {
        key: 'delivery_pending',
        label: timelineCopy.deliveryPending.label,
        icon: FaTruck,
        description: timelineCopy.deliveryPending.description,
        state: 'pending',
        pendingText: timelineCopy.deliveryPending.pendingText
      }
    ];
  }

  if (status === 'dispatched') {
    return [
      submittedStep,
      reviewedApprovedStep,
      {
        key: 'printed',
        label: timelineCopy.printedCompleted.label,
        icon: FaPrint,
        description: timelineCopy.printedCompleted.description,
        state: 'completed',
        dateKey: 'printed'
      },
      {
        key: 'dispatched',
        label: timelineCopy.outForDelivery.label,
        icon: FaTruck,
        description: timelineCopy.outForDelivery.description,
        state: 'current',
        dateKey: 'dispatched',
        currentText: timelineCopy.outForDelivery.currentText
      }
    ];
  }

  if (status === 'delivered') {
    const deliverySteps = [
      submittedStep,
      reviewedApprovedStep,
      {
        key: 'printed',
        label: timelineCopy.printedCompleted.label,
        icon: FaPrint,
        description: timelineCopy.printedCompleted.description,
        state: 'completed',
        dateKey: 'printed'
      }
    ];

    if (hasDispatchUpdate) {
      deliverySteps.push({
        key: 'dispatched',
        label: timelineCopy.outForDeliveryCompleted.label,
        icon: FaTruck,
        description: timelineCopy.outForDeliveryCompleted.description,
        state: 'completed',
        dateKey: 'dispatched'
      });
    }

    deliverySteps.push({
      key: 'delivered',
      label: timelineCopy.delivered.label,
      icon: FaHome,
      description: timelineCopy.delivered.description,
      state: 'current',
      badgeText: timelineCopy.delivered.badgeText,
      dateKey: 'delivered'
    });

    return deliverySteps;
  }

  return TRACKER_STEPS.map((step) => ({
    ...step,
    label: formatTrackerStatus(step.key, copy),
    state: step.key === status ? 'current' : 'pending',
    dateKey: step.key
  }));
};

const getCorrectionTimelineSteps = (status, copy = TRACKER_PAGE_COPY.en) => {
  const normalizedStatus = status || 'submitted';
  const correctionCopy = copy.correctionTimeline;
  const submittedStep = {
    key: 'submitted',
    label: correctionCopy.submitted.label,
    icon: FaFileAlt,
    description: correctionCopy.submitted.description,
    state: 'completed',
    dateKey: 'submitted'
  };

  if (normalizedStatus === 'approved') {
    return [
      submittedStep,
      {
        key: 'reviewed_approved',
        label: correctionCopy.reviewedApproved.label,
        icon: FaSearch,
        description: correctionCopy.reviewedApproved.description,
        state: 'completed',
        dateKey: 'approved'
      },
      {
        key: 'changes_applied',
        label: correctionCopy.changesApplied.label,
        icon: FaCheckCircle,
        description: correctionCopy.changesApplied.description,
        state: 'current',
        badgeText: correctionCopy.changesApplied.badgeText,
        dateKey: 'approved'
      }
    ];
  }

  if (normalizedStatus === 'rejected') {
    return [
      submittedStep,
      {
        key: 'reviewed_rejected',
        label: correctionCopy.reviewedRejected.label,
        icon: FaTimesCircle,
        description: correctionCopy.reviewedRejected.description,
        state: 'completed',
        tone: 'danger',
        dateKey: 'rejected'
      },
      {
        key: 'closed',
        label: correctionCopy.closed.label,
        icon: FaExclamationTriangle,
        description: correctionCopy.closed.description,
        state: 'current',
        badgeText: correctionCopy.closed.badgeText,
        tone: 'danger',
        dateKey: 'rejected'
      }
    ];
  }

  return [
    submittedStep,
    {
      key: 'waiting_review',
      label:
        normalizedStatus === 'under_review'
          ? correctionCopy.adminReview.label
          : correctionCopy.waitingReview.label,
      icon: FaSearch,
      description:
        normalizedStatus === 'under_review'
          ? correctionCopy.adminReview.description
          : correctionCopy.waitingReview.description,
      state: 'current',
      dateKey: normalizedStatus === 'under_review' ? 'under_review' : 'submitted'
    },
    {
      key: 'decision_pending',
      label: correctionCopy.decisionPending.label,
      icon: FaClock,
      description: correctionCopy.decisionPending.description,
      state: 'pending'
    }
  ];
};

const getSafeTime = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatTrackerDate = (value, language = 'en', copy = TRACKER_PAGE_COPY.en) => {
  if (!value) return copy.notAvailable;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return copy.notAvailable;
  }

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const formatTrackerDateTime = (value, language = 'en', copy = TRACKER_PAGE_COPY.en) => {
  if (!value) return copy.notAvailable;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return copy.notAvailable;
  }

  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getTimelineTimeText = (step, dateValue, copy = TRACKER_PAGE_COPY.en, language = 'en') => {
  if (dateValue) {
    return formatTrackerDateTime(dateValue, language, copy);
  }

  if (step.state === 'pending') {
    return step.pendingText || copy.timelineTime.waitingNext;
  }

  if (step.state === 'current') {
    return step.currentText || copy.timelineTime.inProgress;
  }

  if (step.state === 'completed') {
    return copy.timelineTime.completed;
  }

  return copy.notAvailable;
};


const OfficialTimelineItem = ({ step, index, total, timeText, copy = TRACKER_PAGE_COPY.en }) => {
  const isCurrent = step.state === 'current';
  const isCompleted = step.state === 'completed';
  const isPending = step.state === 'pending';
  const isDanger = step.tone === 'danger';
  const isMuted = step.tone === 'muted';
  const Icon = step.icon;

  const statusLabel =
    step.badgeText ||
    (isCurrent
      ? copy.statusBadges.current
      : isCompleted
        ? copy.statusBadges.completed
        : copy.statusBadges.pending);

  const rowClass = isCurrent && isDanger
    ? 'border-red-200 bg-red-50/80 shadow-[inset_4px_0_0_#DC2626]'
    : isCurrent && isMuted
      ? 'border-slate-300 bg-slate-50 shadow-[inset_4px_0_0_#475569]'
      : isCurrent
        ? 'border-[#86EFAC] bg-[#F0FDF4] shadow-[inset_4px_0_0_#16A34A]'
        : isCompleted && isDanger
          ? 'border-red-100 bg-white'
          : isCompleted
            ? 'border-[#DCFCE7] bg-white'
            : 'border-[#E5E7EB] bg-white';

  const iconClass = isCurrent && isDanger
    ? 'bg-red-600 text-white ring-red-100'
    : isCurrent && isMuted
      ? 'bg-slate-700 text-white ring-slate-100'
      : isCurrent
        ? 'bg-[#16A34A] text-white ring-[#DCFCE7]'
        : isCompleted && isDanger
          ? 'bg-red-100 text-red-600 ring-red-50'
          : isCompleted
            ? 'bg-[#DCFCE7] text-[#16A34A] ring-[#F0FDF4]'
            : 'bg-[#F3F4F6] text-[#9CA3AF] ring-white';

  const badgeClass = isCurrent && isDanger
    ? 'bg-red-100 text-red-700'
    : isCurrent && isMuted
      ? 'bg-slate-200 text-slate-700'
      : isCurrent
        ? 'bg-[#DCFCE7] text-[#166534]'
        : isCompleted && isDanger
          ? 'bg-red-50 text-red-700'
          : isCompleted
            ? 'bg-[#ECFDF3] text-[#15803D]'
            : 'bg-[#F3F4F6] text-[#6B7280]';

  const connectorClass = isDanger
    ? 'bg-red-100'
    : isMuted
      ? 'bg-slate-200'
      : isPending
        ? 'bg-[#E5E7EB]'
        : 'bg-[#BBF7D0]';

  return (
    <div
      className={`official-timeline-row relative grid gap-4 border ${rowClass} px-4 py-4 transition sm:grid-cols-[72px,1fr,190px] sm:items-center sm:px-5`}
    >
      <div className="relative flex items-center gap-3 sm:h-full sm:justify-center">
        {index > 0 && (
          <span
            className={`hidden sm:block absolute left-1/2 top-[-1.25rem] h-[calc(50%+1.25rem)] w-px -translate-x-1/2 ${connectorClass}`}
          />
        )}
        {index < total - 1 && (
          <span
            className={`hidden sm:block absolute bottom-[-1.25rem] left-1/2 h-[calc(50%+1.25rem)] w-px -translate-x-1/2 ${connectorClass}`}
          />
        )}

        <div
          className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg ring-8 ${iconClass}`}
        >
          <Icon />
        </div>

        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#16A34A] sm:hidden">
          {copy.stepPrefix} {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="hidden rounded-full bg-[#F9FAFB] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#6B7280] sm:inline-flex">
            {copy.stepPrefix} {String(index + 1).padStart(2, '0')}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            {statusLabel}
          </span>
        </div>

        <h4 className="text-base font-semibold text-[#111827]">
          {step.label}
        </h4>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6B7280]">
          {step.description}
        </p>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 sm:text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
          {copy.statusTime}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#111827]">
          {timeText}
        </p>
      </div>
    </div>
  );
};

const getReachedSteps = (status) => {
  switch (status) {
    case 'submitted':
      return ['submitted'];

    case 'under_review':
      return ['submitted', 'under_review'];

    case 'approved':
      return ['submitted', 'under_review', 'approved'];

    case 'printed':
      return ['submitted', 'under_review', 'approved', 'printed'];

    case 'dispatched':
      return ['submitted', 'under_review', 'approved', 'printed', 'dispatched'];

    case 'delivered':
      return [
        'submitted',
        'under_review',
        'approved',
        'printed',
        'dispatched',
        'delivered'
      ];

    case 'rejected':
      return ['submitted', 'under_review'];

    case 'cancelled':
      return ['submitted'];

    default:
      return [];
  }
};


const getCorrectionReachedSteps = (status) => {
  switch (status) {
    case 'submitted':
      return ['submitted'];

    case 'under_review':
      return ['submitted', 'under_review'];

    case 'approved':
      return ['submitted', 'under_review', 'approved'];

    case 'rejected':
      return ['submitted', 'under_review', 'rejected'];

    default:
      return [];
  }
};

const getCorrectionProgressPercent = (status) => {
  switch (status) {
    case 'approved':
    case 'rejected':
      return 100;

    case 'under_review':
      return 65;

    case 'submitted':
      return 45;

    default:
      return 0;
  }
};

const getCorrectionStageLabel = (status) => {
  switch (status) {
    case 'submitted':
      return 'Waiting for Admin Review';

    case 'under_review':
      return 'Admin Review';

    case 'approved':
      return 'Changes Applied';

    case 'rejected':
      return 'Closed';

    default:
      return status ? formatStatus(status) : 'Not Started';
  }
};

const getCorrectionPrimaryMessage = (correction, copy = TRACKER_PAGE_COPY.en) => {
  if (!correction) {
    return {
      title: '',
      description: '',
      toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
      icon: <FaIdCard />
    };
  }

  const correctionCopy = copy.correctionPrimary;

  switch (correction.status) {
    case 'submitted':
      return {
        title: correctionCopy.submitted.title,
        description: correctionCopy.submitted.description,
        toneClass: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: <FaClock />
      };

    case 'under_review':
      return {
        title: correctionCopy.under_review.title,
        description: correctionCopy.under_review.description,
        toneClass: 'bg-sky-50 border-sky-200 text-sky-800',
        icon: <FaSearch />
      };

    case 'approved':
      return {
        title: correctionCopy.approved.title,
        description: correctionCopy.approved.description,
        toneClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: <FaCheckCircle />
      };

    case 'rejected':
      return {
        title: correctionCopy.rejected.title,
        description: correctionCopy.rejected.description,
        toneClass: 'bg-red-50 border-red-200 text-red-800',
        icon: <FaTimesCircle />
      };

    default:
      return {
        title: correctionCopy.default.title,
        description: correctionCopy.default.description,
        toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
        icon: <FaIdCard />
      };
  }
};

const getProgressPercent = (status) => {
  const reachedCount = getReachedSteps(status).length;

  if (!status) {
    return 0;
  }

  if (status === 'rejected' || status === 'cancelled') {
    return Math.max(Math.round((reachedCount / TRACKER_STEPS.length) * 100), 12);
  }

  return Math.round((reachedCount / TRACKER_STEPS.length) * 100);
};

const getCurrentStageLabel = (status) => {
  const matchedStep = TRACKER_STEPS.find((step) => step.key === status);

  if (matchedStep) {
    return matchedStep.label;
  }

  return status ? formatStatus(status) : 'Not Started';
};


const getApplicationNextStepLabel = (status) => {
  switch (status) {
    case 'submitted':
      return 'Admin review will start next';

    case 'under_review':
      return 'Admin decision is pending';

    case 'approved':
      return 'Biometric appointment booking is next';

    case 'printed':
      return 'Digital NID and Correction are available';

    case 'dispatched':
      return 'Delivery confirmation is pending';

    case 'delivered':
      return 'Process completed';

    case 'rejected':
      return 'Application closed';

    case 'cancelled':
      return 'Process cancelled';

    default:
      return 'Waiting for official update';
  }
};

const getApplicationStatusNote = (status) => {
  switch (status) {
    case 'submitted':
      return 'Received by the system';

    case 'under_review':
      return 'Being checked by authority';

    case 'approved':
      return 'Appointment required before printing';

    case 'printed':
      return 'Card printed; Digital NID available';

    case 'dispatched':
      return 'Card is on delivery route';

    case 'delivered':
      return 'Citizen delivery completed';

    case 'rejected':
      return 'Stopped after review';

    case 'cancelled':
      return 'No longer active';

    default:
      return 'Latest official status';
  }
};

const getCorrectionNextStepLabel = (status) => {
  switch (status) {
    case 'submitted':
      return 'Admin review will start next';

    case 'under_review':
      return 'Admin decision is pending';

    case 'approved':
      return 'Updated record is active';

    case 'rejected':
      return 'Request closed';

    default:
      return 'Waiting for official update';
  }
};

const getCorrectionStatusNote = (status) => {
  switch (status) {
    case 'submitted':
      return 'Request received by the system';

    case 'under_review':
      return 'Old and new information are being checked';

    case 'approved':
      return 'Correction decision completed';

    case 'rejected':
      return 'Correction stopped after review';

    default:
      return 'Latest correction status';
  }
};

const getPrimaryMessage = (
  application,
  lifecycleCopy = TRACKER_LIFECYCLE_COPY.en,
  copy = TRACKER_PAGE_COPY.en
) => {
  if (!application) {
    return {
      title: copy.primary.none.title,
      description: copy.primary.none.description,
      toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
      icon: <FaIdCard />
    };
  }

  switch (application.status) {
    case 'submitted':
    case 'under_review':
      return {
        title: copy.primary.processing.title,
        description: copy.primary.processing.description,
        toneClass: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: <FaClock />
      };

    case 'approved':
    {
      const stageKey = getApplicationLifecycleStageKey(application);
      const approvedCopy =
        stageKey === 'waiting_for_printing'
          ? lifecycleCopy.primary.approvedCompleted
          : stageKey === 'appointment_booked'
            ? lifecycleCopy.primary.approvedBooked
            : lifecycleCopy.primary.approvedRequired;

      return {
        title: approvedCopy.title,
        description: approvedCopy.description,
        toneClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: stageKey === 'waiting_for_printing' ? <FaPrint /> : <FaCheckCircle />
      };
    }

    case 'printed':
      return {
        title: copy.primary.printed.title,
        description: copy.primary.printed.description,
        toneClass: 'bg-sky-50 border-sky-200 text-sky-800',
        icon: <FaPrint />
      };

    case 'dispatched':
      return {
        title: copy.primary.dispatched.title,
        description: copy.primary.dispatched.description,
        toneClass: 'bg-sky-50 border-sky-200 text-sky-800',
        icon: <FaTruck />
      };

    case 'delivered':
      return {
        title: copy.primary.delivered.title,
        description: copy.primary.delivered.description,
        toneClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        icon: <FaHome />
      };

    case 'rejected':
      return {
        title: copy.primary.rejected.title,
        description: copy.primary.rejected.description,
        toneClass: 'bg-red-50 border-red-200 text-red-800',
        icon: <FaTimesCircle />
      };

    case 'cancelled':
      return {
        title: copy.primary.cancelled.title,
        description: copy.primary.cancelled.description,
        toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
        icon: <FaExclamationTriangle />
      };

    default:
      return {
        title: copy.primary.default.title,
        description: copy.primary.default.description,
        toneClass: 'bg-slate-50 border-slate-200 text-slate-700',
        icon: <FaSearch />
      };
  }
};

const ApplicationTracker = () => {
  const [searchParams] = useSearchParams();
  const queryApplicationId = searchParams.get('id');
  const { language } = useLanguage();
  const lifecycleCopy = getTrackerLifecycleCopy(language);
  const trackerCopy = getTrackerPageCopy(language);

  const [applications, setApplications] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(queryApplicationId || '');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  useEffect(() => {
    if (queryApplicationId) {
      setSelectedAppId(queryApplicationId);
    }
  }, [queryApplicationId]);

  const fetchApplications = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await api.get('/applications/my');
        const applicationList = response?.data?.applications || [];

        const sortedList = [...applicationList].sort((a, b) => {
          const firstTime = getSafeTime(a?.updatedAt || a?.createdAt);
          const secondTime = getSafeTime(b?.updatedAt || b?.createdAt);
          return secondTime - firstTime;
        });

        setApplications(sortedList);

        try {
          const correctionResponse = await api.get('/corrections/my');
          const correctionList = correctionResponse?.data?.corrections || correctionResponse?.data?.data || [];
          const sortedCorrections = [...correctionList].sort((a, b) => {
            const firstTime = getSafeTime(a?.latestStatusChangedAt || a?.updatedAt || a?.createdAt);
            const secondTime = getSafeTime(b?.latestStatusChangedAt || b?.updatedAt || b?.createdAt);
            return secondTime - firstTime;
          });
          setCorrections(sortedCorrections);
        } catch (correctionError) {
          console.error('Error fetching correction requests:', correctionError);
          setCorrections([]);
        }

        setLastSyncedAt(new Date());

        if (queryApplicationId) {
          const matchedByQuery = sortedList.find(
            (app) => app._id === queryApplicationId
          );

          if (matchedByQuery) {
            setSelectedAppId(matchedByQuery._id);
            return;
          }
        }

        if (selectedAppId) {
          const matchedSelected = sortedList.find(
            (app) => app._id === selectedAppId
          );

          if (matchedSelected) {
            setSelectedAppId(matchedSelected._id);
            return;
          }
        }

        if (sortedList.length > 0) {
          setSelectedAppId(sortedList[0]._id);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryApplicationId, selectedAppId]
  );

  useEffect(() => {
    fetchApplications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchApplications({ silent: true });
      }
    };

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchApplications({ silent: true });
      }
    }, 30000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchApplications]);

  const selectedApp = useMemo(() => {
    return applications.find((app) => app._id === selectedAppId) || applications[0] || null;
  }, [applications, selectedAppId]);

  const reachedSteps = useMemo(() => {
    return getReachedSteps(selectedApp?.status);
  }, [selectedApp]);

  const applicationTimelineSteps = useMemo(() => {
    return getApplicationTimelineSteps(selectedApp, lifecycleCopy, trackerCopy);
  }, [selectedApp, lifecycleCopy, trackerCopy]);

  const latestCorrection = useMemo(() => corrections[0] || null, [corrections]);

  const correctionTimelineSteps = useMemo(() => {
    return getCorrectionTimelineSteps(latestCorrection?.status, trackerCopy);
  }, [latestCorrection, trackerCopy]);


  const correctionPrimaryMessage = useMemo(() => {
    return getCorrectionPrimaryMessage(latestCorrection, trackerCopy);
  }, [latestCorrection, trackerCopy]);


  const getStepDate = (application, stepKey) => {
    if (!application || !reachedSteps.includes(stepKey)) {
      return '';
    }

    const historyMatch = [...(application.statusHistory || [])]
      .sort(
        (a, b) =>
          getSafeTime(a?.changedAt || 0) - getSafeTime(b?.changedAt || 0)
      )
      .find((item) => item.toStatus === stepKey);

    if (historyMatch?.changedAt) {
      return historyMatch.changedAt;
    }

    const dateMap = {
      submitted: application.submittedAt || application.createdAt,
      approved: application.approvedAt,
      printed: application.printedAt,
      dispatched: application.dispatchedAt,
      delivered: application.deliveredAt
    };

    return dateMap[stepKey] || '';
  };


  const getApplicationTimelineStepDate = (application, dateKey) => {
    if (!application || !dateKey) {
      return '';
    }

    const appointment = getApplicationAppointmentSummary(application);

    if (dateKey === 'appointment_booked') {
      return appointment?.bookedAt || appointment?.createdAt || appointment?.appointmentDate || '';
    }

    if (dateKey === 'waiting_for_printing') {
      return appointment?.completedAt || appointment?.updatedAt || '';
    }

    const historyMatch = [...(application.statusHistory || [])]
      .sort(
        (a, b) =>
          getSafeTime(a?.changedAt || 0) - getSafeTime(b?.changedAt || 0)
      )
      .find((item) => item.toStatus === dateKey);

    if (historyMatch?.changedAt) {
      return historyMatch.changedAt;
    }

    const dateMap = {
      submitted: application.submittedAt || application.createdAt,
      under_review: application.reviewedAt,
      approved: application.approvedAt,
      printed: application.printedAt,
      dispatched: application.dispatchedAt,
      delivered: application.deliveredAt,
      rejected: application.rejectedAt,
      cancelled: application.cancelledAt
    };

    return dateMap[dateKey] || '';
  };

  const getCorrectionStepDate = (correction, stepKey) => {
    if (!correction || !getCorrectionReachedSteps(correction.status).includes(stepKey)) {
      return '';
    }

    const historyMatch = [...(correction.statusHistory || [])]
      .sort(
        (a, b) =>
          getSafeTime(a?.changedAt || 0) - getSafeTime(b?.changedAt || 0)
      )
      .find((item) => item.toStatus === stepKey);

    if (historyMatch?.changedAt) {
      return historyMatch.changedAt;
    }

    const dateMap = {
      submitted: correction.submittedAt || correction.createdAt,
      under_review: correction.reviewedAt || correction.latestStatusChangedAt,
      approved: correction.approvedAt,
      rejected: correction.rejectedAt
    };

    return dateMap[stepKey] || '';
  };

  const selectedApplicationStageKey = selectedApp
    ? getApplicationLifecycleStageKey(selectedApp)
    : 'not_started';
  const shouldShowBookAppointmentAction =
    selectedApp && isAppointmentBookingActionAvailable(selectedApp);
  const showApprovedNoActionMessage =
    selectedApp?.status === 'approved' &&
    ['appointment_booked', 'waiting_for_printing'].includes(selectedApplicationStageKey);
  const approvedNoActionMessage =
    selectedApplicationStageKey === 'waiting_for_printing'
      ? lifecycleCopy.action.noActionWaiting
      : lifecycleCopy.action.noBookingNeeded;

  const primaryMessage = getPrimaryMessage(selectedApp, lifecycleCopy, trackerCopy);



  if (loading) {
    return (
      <div className="tracker-loading flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text={trackerCopy.loadingApplications} />
      </div>
    );
  }

  return (
    <div className="tracker-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="tracker-shell mx-auto w-full max-w-[1280px]">
        <div className="tracker-header-card relative mb-8 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,#16A34A_0%,#15803D_100%)] px-6 py-6 text-white shadow-[0_18px_45px_rgba(22,163,74,0.18)] md:px-8">
          <div className="tracker-header-row flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="tracker-header-copy relative z-10">
              <h1 className="text-[1.9rem] font-semibold leading-tight">
                {trackerCopy.headerTitle}
              </h1>
              <p className="mt-2 text-sm text-white/90 md:text-base">
                {trackerCopy.headerSubtitle}
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap items-center gap-3">
              {selectedApp && (
                <span className="inline-flex items-center rounded-full bg-white/20 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
                  {trackerCopy.currentPrefix} {formatTrackerStatus(selectedApp.status, trackerCopy)}
                </span>
              )}

              {refreshing && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
                  <FaSyncAlt className="animate-spin" />
                  {trackerCopy.syncing}
                </span>
              )}

              {lastSyncedAt && (
                <div className="tracker-sync-badge inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {trackerCopy.autoSyncedPrefix} {formatTrackerDateTime(lastSyncedAt, language, trackerCopy)}
                </div>
              )}
            </div>
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="tracker-empty-state-card mx-auto flex min-h-[360px] w-full max-w-[760px] items-center justify-center rounded-[1.75rem] border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="mx-auto max-w-[420px]">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#F0FDF4] text-4xl text-[#16A34A]">
                <FaIdCard />
              </div>

              <h2 className="text-2xl font-semibold text-[#111827]">
                {trackerCopy.noApplicationsFound}
              </h2>

              <p className="mt-3 text-sm leading-7 text-[#6B7280]">
                {trackerCopy.noApplicationsHint}
              </p>

              <Link
                to="/apply"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(22,163,74,0.20)] transition hover:bg-[#15803D]"
              >
                {trackerCopy.applyNow}
                <FaArrowRight />
              </Link>
            </div>
          </div>
        ) : (
          <div className="tracker-layout grid items-start gap-6 xl:grid-cols-[300px,1fr]">
          <div className="tracker-sidebar rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] xl:sticky xl:top-28">
            <div className="tracker-sidebar-top mb-4">
              <h2 className="text-lg font-semibold text-[#111827]">{trackerCopy.myApplications}</h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                {trackerCopy.myApplicationsHint}
              </p>
            </div>

            {applications.length === 0 ? (
              <div className="tracker-empty-sidebar rounded-2xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] px-5 py-10 text-center">
                <FaIdCard className="mx-auto mb-4 text-4xl text-[#D1D5DB]" />
                <h3 className="text-base font-semibold text-[#374151]">
                  {trackerCopy.noApplicationsFound}
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  {trackerCopy.noApplicationsHint}
                </p>
                <Link
                  to="/apply"
                  className="mt-5 inline-flex items-center rounded-lg bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                >
                  {trackerCopy.applyNow}
                </Link>
              </div>
            ) : (
              <div className="tracker-application-list flex flex-col gap-3">
                {applications.map((app) => (
                  <button
                    key={app._id}
                    type="button"
                    onClick={() => setSelectedAppId(app._id)}
                    className={`tracker-application-item group relative w-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition ${
                      selectedApp?._id === app._id
                        ? 'border-[#16A34A] bg-[#F0FDF4] shadow-[0_10px_22px_rgba(22,163,74,0.10)]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#BBF7D0] hover:bg-[#FAFFFC]'
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-[#111827] break-all">
                        #{app.applicationId}
                      </span>

                      <span className={`badge badge-${getStatusColor(app.status)} shrink-0`}>
                        {formatTrackerStatus(app.status, trackerCopy)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-[#6B7280]">
                      <span>
                        {trackerCopy.submittedPrefix} {app.createdAt ? formatTrackerDate(app.createdAt, language, trackerCopy) : trackerCopy.notAvailable}
                      </span>
                      <span>
                        {trackerCopy.updatedPrefix} {app.updatedAt ? formatTrackerDate(app.updatedAt, language, trackerCopy) : trackerCopy.notAvailable}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedApp ? (
            <div className="tracker-details flex flex-col gap-6">
              <div className="tracker-summary-card rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="tracker-summary-top flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="tracker-summary-copy">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[1.4rem] font-semibold text-[#111827] break-all">
                        {trackerCopy.applicationPrefix} #{selectedApp.applicationId}
                      </h2>

                      <span
                        className={`badge badge-lg badge-${getStatusColor(
                          selectedApp.status
                        )}`}
                      >
                        {formatTrackerStatus(selectedApp.status, trackerCopy)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`tracker-primary-alert flex items-start gap-3 rounded-2xl border px-4 py-4 ${primaryMessage.toneClass}`}
                  >
                    <div className="mt-1 text-lg">{primaryMessage.icon}</div>
                    <div>
                      <h3 className="text-sm font-semibold">{primaryMessage.title}</h3>
                      <p className="mt-1 text-sm leading-6">
                        {primaryMessage.description}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="tracker-meta-grid mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {trackerCopy.applicationType}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {formatApplicationType(selectedApp.applicationType, trackerCopy)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {trackerCopy.currentStatus}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {formatTrackerStatus(selectedApp.status, trackerCopy)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {trackerCopy.submittedOn}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {selectedApp.createdAt
                        ? formatTrackerDateTime(selectedApp.createdAt, language, trackerCopy)
                        : trackerCopy.notAvailable}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                      {trackerCopy.lastUpdated}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#111827]">
                      {selectedApp.updatedAt
                        ? formatTrackerDateTime(selectedApp.updatedAt, language, trackerCopy)
                        : trackerCopy.notAvailable}
                    </p>
                  </div>
                </div>

                {selectedApp.status === 'rejected' &&
                  selectedApp.rejectionReason && (
                    <div className="tracker-rejection-box mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
                        {trackerCopy.officialRejectionReason}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-red-800">
                        {selectedApp.rejectionReason}
                      </p>
                    </div>
                  )}
              </div>

              <div className="tracker-action-row rounded-[1.5rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#111827]">{trackerCopy.needActionTitle}</h3>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {trackerCopy.needActionHint}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {shouldShowBookAppointmentAction && (
                      <Link
                        to={`/book-appointment/${selectedApp._id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                      >
                        <FaCalendarAlt />
                        <span>{lifecycleCopy.action.bookBiometric}</span>
                      </Link>
                    )}

                    {showApprovedNoActionMessage && (
                      <div className="inline-flex max-w-md items-center rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-medium leading-6 text-emerald-800">
                        {approvedNoActionMessage}
                      </div>
                    )}

                    {canViewDigitalNid(selectedApp.status) && (
                      <Link
                        to={`/digital-nid/${selectedApp._id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#16A34A] bg-white px-5 py-3 text-sm font-semibold text-[#16A34A] transition hover:bg-[#F0FDF4]"
                      >
                        <FaIdCard />
                        <span>{trackerCopy.openDigitalNid}</span>
                      </Link>
                    )}

                    {['rejected', 'cancelled'].includes(selectedApp.status) && (
                      <Link
                        to="/apply"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
                      >
                        <span>{trackerCopy.applyAgain}</span>
                        <FaArrowRight />
                      </Link>
                    )}

                    <Link
                      to="/support"
                      className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:border-[#16A34A] hover:text-[#16A34A]"
                    >
                      <span>{trackerCopy.contactSupport}</span>
                    </Link>
                  </div>
                </div>
              </div>

              {latestCorrection && (
                <div className="tracker-correction-card rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#16A34A]">
                        {trackerCopy.correctionRequest}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-[#111827] break-all">
                          #{latestCorrection.correctionId || latestCorrection._id}
                        </h3>
                        <span
                          className={`badge badge-lg badge-${getStatusColor(
                            latestCorrection.status
                          )}`}
                        >
                          {formatTrackerStatus(latestCorrection.status, trackerCopy)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        {trackerCopy.correctionRequestHint}
                      </p>
                    </div>

                    <div
                      className={`tracker-primary-alert flex items-start gap-3 rounded-2xl border px-4 py-4 ${correctionPrimaryMessage.toneClass}`}
                    >
                      <div className="mt-1 text-lg">{correctionPrimaryMessage.icon}</div>
                      <div>
                        <h4 className="text-sm font-semibold">
                          {correctionPrimaryMessage.title}
                        </h4>
                        <p className="mt-1 text-sm leading-6">
                          {correctionPrimaryMessage.description}
                        </p>
                      </div>
                    </div>
                  </div>


                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                        {trackerCopy.baseApplication}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#111827] break-all">
                        {latestCorrection.baseApplicationId || latestCorrection.baseApplication?.applicationId || trackerCopy.notAvailable}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                        {trackerCopy.changedFields}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {latestCorrection.changedFields?.length || 0}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                        {trackerCopy.submittedOn}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {formatTrackerDateTime(latestCorrection.submittedAt || latestCorrection.createdAt, language, trackerCopy)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F9FAFB] px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                        {trackerCopy.lastUpdated}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#111827]">
                        {formatTrackerDateTime(latestCorrection.latestStatusChangedAt || latestCorrection.updatedAt, language, trackerCopy)}
                      </p>
                    </div>
                  </div>

                  {latestCorrection.rejectionReason && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
                        {trackerCopy.correctionRejectionReason}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-red-800">
                        {latestCorrection.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FCFCFD]">
                    {correctionTimelineSteps.map((step, index) => {
                      const stepDate = step.dateKey
                        ? getCorrectionStepDate(latestCorrection, step.dateKey)
                        : '';

                      return (
                        <OfficialTimelineItem
                          key={step.key}
                          step={step}
                          index={index}
                          total={correctionTimelineSteps.length}
                          timeText={getTimelineTimeText(step, stepDate, trackerCopy, language)}
                          copy={trackerCopy}
                        />
                      );
                    })}
                  </div>


                  {corrections.length > 1 && (
                    <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                      <h4 className="text-sm font-semibold text-[#111827]">
                        {trackerCopy.previousCorrectionRequests}
                      </h4>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {corrections.slice(1, 5).map((correction) => (
                          <div
                            key={correction._id}
                            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-[#111827] break-all">
                                #{correction.correctionId || correction._id}
                              </p>
                              <span className={`badge badge-${getStatusColor(correction.status)}`}>
                                {formatTrackerStatus(correction.status, trackerCopy)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-[#6B7280]">
                              {trackerCopy.submittedPrefix} {formatTrackerDateTime(correction.submittedAt || correction.createdAt, language, trackerCopy)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="tracker-progress-card rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <h3 className="text-lg font-semibold text-[#111827]">
                  {trackerCopy.applicationProgress}
                </h3>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {trackerCopy.applicationProgressHint}
                </p>

                <div className="mt-6 overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#FCFCFD]">
                  {applicationTimelineSteps.map((step, index) => {
                    const stepDate = step.dateKey
                      ? getApplicationTimelineStepDate(selectedApp, step.dateKey)
                      : '';

                    return (
                      <OfficialTimelineItem
                        key={step.key}
                        step={step}
                        index={index}
                        total={applicationTimelineSteps.length}
                        timeText={getTimelineTimeText(step, stepDate, trackerCopy, language)}
                        copy={trackerCopy}
                      />
                    );
                  })}
                </div>

                {selectedApp.status === 'rejected' && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-lg text-red-600">
                        <FaTimesCircle />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-red-800">
                          {trackerCopy.finalRejectedTitle}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-red-700">
                          {trackerCopy.finalRejectedDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedApp.status === 'cancelled' && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-lg text-slate-600">
                        <FaExclamationTriangle />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          {trackerCopy.finalCancelledTitle}
                        </h4>
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {trackerCopy.finalCancelledDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="tracker-no-selection flex items-center justify-center rounded-2xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
              <div>
                <FaFileAlt className="mx-auto mb-4 text-5xl text-[#D1D5DB]" />
                <h3 className="text-xl font-semibold text-[#374151]">
                  {trackerCopy.selectApplication}
                </h3>
                <p className="mt-2 text-sm text-[#6B7280]">
                  {trackerCopy.selectApplicationHint}
                </p>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationTracker;
