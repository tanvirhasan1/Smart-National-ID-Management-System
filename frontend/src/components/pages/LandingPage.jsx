import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaDownload,
  FaFingerprint,
  FaHeadset,
  FaIdCard,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaSearch,
  FaShieldAlt,
  FaUserCheck,
  FaUserPlus,
  FaFileUpload
} from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import '../styles/LandingPage.css';

const landingCopy = {
  en: {
    hero: {
      kicker: 'Government Digital Identity Service',
      titleLine1: 'Smart National ID',
      titleLine2: 'Management System',
      description:
        'Apply, verify your account, book appointments, track progress, and access Smart NID services through one secure citizen portal.',
      createAccount: 'Create Account',
      loginToContinue: 'Login to Continue',
      secureRegistration: 'Secure Registration',
      secureRegistrationText:
        'Birth Certificate and OTP-based verification flow',
      trackEveryStage: 'Track Every Stage',
      trackEveryStageText:
        'Application, appointment, printing, and delivery status'
    },
    heroPoints: [
      'Birth Certificate validation',
      'OTP secured login flow',
      'Biometric appointment booking',
      'Application and delivery tracking'
    ],
    summaryCards: [
      { value: 'Secure', label: 'Verified citizen access' },
      { value: 'Guided', label: 'Clear service steps' },
      { value: 'Digital', label: 'Online NID services' }
    ],
    actions: {
      tag: 'Citizen quick actions',
      title: 'Choose your Smart NID service',
      description:
        'Start registration, submit an application, book biometrics, or check your service status from one place.'
    },
    quickActions: [
      {
        title: 'Create Account',
        description:
          'Create a verified citizen account with your personal information and OTP confirmation.',
        actionLabel: 'Create Account'
      },
      {
        title: 'Apply for Smart NID',
        description:
          'Start or continue your Smart NID application with the required documents.',
        actionLabel: 'Login to Apply'
      },
      {
        title: 'Book Appointment',
        description:
          'Choose an available biometric enrollment center, date, and time slot.',
        actionLabel: 'Book Appointment'
      },
      {
        title: 'Track Application',
        description:
          'Check application review, printing, dispatch, and delivery progress.',
        actionLabel: 'Track Status'
      },
      {
        title: 'Support Service',
        description:
          'Get support for registration, application, appointment, or verification issues.',
        actionLabel: 'Open Support'
      }
    ],
    trust: {
      tag: 'Why citizens can trust this service',
      title: 'Secure, guided, and simple access to Smart NID services',
      description:
        'The homepage keeps key actions visible, explains the process clearly, and uses a restrained official layout for a public identity service.',
      points: [
        'Secure account verification is shown first',
        'Citizen services are easier to scan',
        'Important actions are grouped clearly',
        'The design feels suitable for a public service portal'
      ],
      cards: [
        {
          title: 'Verification-First Access',
          description:
            'Registration and login are presented as protected identity steps, with clear guidance for citizens.'
        },
        {
          title: 'Citizen-Friendly Flow',
          description:
            'Core services are grouped by purpose, so first-time users can choose the right action quickly.'
        },
        {
          title: 'Official Service Interface',
          description:
            'The page uses a restrained visual structure suitable for a public digital identity platform.'
        }
      ]
    },
    process: {
      tag: 'Simple citizen journey',
      title: 'How the Smart NID service works',
      description:
        'Follow four clear steps from account verification to final service delivery.',
      stepLabel: 'Step',
      steps: [
        {
          step: '01',
          title: 'Register & Verify',
          description:
            'Create your account with BRN details and complete OTP verification.'
        },
        {
          step: '02',
          title: 'Submit Application',
          description:
            'Fill out the Smart NID form and upload the required documents.'
        },
        {
          step: '03',
          title: 'Book Biometrics',
          description:
            'Select an enrollment center, date, and available appointment slot.'
        },
        {
          step: '04',
          title: 'Track & Receive',
          description:
            'Track approval, digital NID access, printing, and delivery progress.'
        }
      ]
    },
    requirements: {
      tag: 'Before you start',
      title: 'Prepare the important information and documents',
      description:
        'Keep these details ready before starting your application to avoid correction requests and repeated submissions.',
      miniPoints: [
        'Mobile number for OTP verification',
        'Accurate information for address and center selection',
        'Better preparation means smoother digital submission'
      ],
      items: [
        'Birth Registration Number',
        'Recent passport-size photo',
        'Clear signature image',
        'Valid Bangladeshi mobile number',
        "Parent's NID information",
        'Address proof if required'
      ]
    },
    cta: {
      tag: 'Start securely',
      title: 'Ready to start your Smart NID application?',
      description:
        'Create an account, verify your information, and continue your application through one secure citizen portal.',
      createAccount: 'Create Account',
      loginToContinue: 'Login to Continue'
    },
    imageAlt: 'Citizens using Smart NID card services'
  },

  bn: {
    hero: {
      kicker: 'সরকারি ডিজিটাল পরিচয় সেবা',
      titleLine1: 'স্মার্ট জাতীয় পরিচয়পত্র',
      titleLine2: 'ম্যানেজমেন্ট সিস্টেম',
      description:
        'একটি নিরাপদ নাগরিক পোর্টালের মাধ্যমে আবেদন করুন, অ্যাকাউন্ট যাচাই করুন, অ্যাপয়েন্টমেন্ট বুক করুন, অগ্রগতি দেখুন এবং স্মার্ট এনআইডি সেবা ব্যবহার করুন।',
      createAccount: 'অ্যাকাউন্ট তৈরি করুন',
      loginToContinue: 'লগইন করে চালিয়ে যান',
      secureRegistration: 'নিরাপদ নিবন্ধন',
      secureRegistrationText:
        'জন্ম সনদ এবং OTP-ভিত্তিক যাচাইকরণ প্রক্রিয়া',
      trackEveryStage: 'প্রতিটি ধাপ ট্র্যাক করুন',
      trackEveryStageText:
        'আবেদন, অ্যাপয়েন্টমেন্ট, প্রিন্টিং এবং ডেলিভারি স্ট্যাটাস'
    },
    heroPoints: [
      'জন্ম সনদ যাচাই',
      'OTP সুরক্ষিত লগইন',
      'বায়োমেট্রিক অ্যাপয়েন্টমেন্ট বুকিং',
      'আবেদন ও ডেলিভারি ট্র্যাকিং'
    ],
    summaryCards: [
      { value: 'নিরাপদ', label: 'যাচাইকৃত নাগরিক অ্যাক্সেস' },
      { value: 'সহজ', label: 'পরিষ্কার সেবা ধাপ' },
      { value: 'ডিজিটাল', label: 'অনলাইন এনআইডি সেবা' }
    ],
    actions: {
      tag: 'নাগরিকদের দ্রুত সেবা',
      title: 'আপনার স্মার্ট এনআইডি সেবা নির্বাচন করুন',
      description:
        'এক জায়গা থেকেই নিবন্ধন শুরু করুন, আবেদন জমা দিন, বায়োমেট্রিক বুক করুন অথবা সেবার স্ট্যাটাস দেখুন।'
    },
    quickActions: [
      {
        title: 'অ্যাকাউন্ট তৈরি করুন',
        description:
          'ব্যক্তিগত তথ্য ও OTP নিশ্চিতকরণের মাধ্যমে একটি যাচাইকৃত নাগরিক অ্যাকাউন্ট তৈরি করুন।',
        actionLabel: 'অ্যাকাউন্ট তৈরি করুন'
      },
      {
        title: 'স্মার্ট এনআইডির জন্য আবেদন',
        description:
          'প্রয়োজনীয় ডকুমেন্টসহ আপনার স্মার্ট এনআইডি আবেদন শুরু বা চালিয়ে যান।',
        actionLabel: 'আবেদন করতে লগইন'
      },
      {
        title: 'অ্যাপয়েন্টমেন্ট বুক করুন',
        description:
          'উপলব্ধ বায়োমেট্রিক সেন্টার, তারিখ এবং সময় নির্বাচন করুন।',
        actionLabel: 'অ্যাপয়েন্টমেন্ট বুক'
      },
      {
        title: 'আবেদন ট্র্যাক করুন',
        description:
          'আবেদন রিভিউ, প্রিন্টিং, ডিসপ্যাচ এবং ডেলিভারি অগ্রগতি দেখুন।',
        actionLabel: 'স্ট্যাটাস দেখুন'
      },
      {
        title: 'সাপোর্ট সেবা',
        description:
          'নিবন্ধন, আবেদন, অ্যাপয়েন্টমেন্ট বা যাচাইকরণ সমস্যা নিয়ে সহায়তা নিন।',
        actionLabel: 'সাপোর্ট খুলুন'
      }
    ],
    trust: {
      tag: 'কেন নাগরিকরা এই সেবার উপর আস্থা রাখতে পারেন',
      title: 'স্মার্ট এনআইডি সেবায় নিরাপদ, নির্দেশনামূলক এবং সহজ প্রবেশাধিকার',
      description:
        'হোমপেজে গুরুত্বপূর্ণ কাজগুলো পরিষ্কারভাবে রাখা হয়েছে, প্রক্রিয়াটি সহজে ব্যাখ্যা করা হয়েছে এবং সরকারি সেবার উপযোগী সংযত ডিজাইন ব্যবহার করা হয়েছে।',
      points: [
        'নিরাপদ অ্যাকাউন্ট যাচাইকরণ আগে দেখানো হয়েছে',
        'নাগরিক সেবাগুলো দ্রুত বোঝা যায়',
        'গুরুত্বপূর্ণ কাজগুলো পরিষ্কারভাবে সাজানো',
        'ডিজাইনটি সরকারি সেবা পোর্টালের জন্য উপযুক্ত'
      ],
      cards: [
        {
          title: 'যাচাইকরণ-প্রথম অ্যাক্সেস',
          description:
            'নিবন্ধন ও লগইনকে নিরাপদ পরিচয় যাচাই ধাপ হিসেবে দেখানো হয়েছে, নাগরিকদের জন্য পরিষ্কার নির্দেশনাসহ।'
        },
        {
          title: 'নাগরিক-বান্ধব প্রবাহ',
          description:
            'মূল সেবাগুলো উদ্দেশ্য অনুযায়ী সাজানো, তাই নতুন ব্যবহারকারীরাও দ্রুত সঠিক কাজ নির্বাচন করতে পারেন।'
        },
        {
          title: 'সরকারি সেবা ইন্টারফেস',
          description:
            'পাবলিক ডিজিটাল পরিচয় প্ল্যাটফর্মের জন্য উপযুক্ত সংযত ভিজ্যুয়াল স্ট্রাকচার ব্যবহার করা হয়েছে।'
        }
      ]
    },
    process: {
      tag: 'সহজ নাগরিক যাত্রা',
      title: 'স্মার্ট এনআইডি সেবা কীভাবে কাজ করে',
      description:
        'অ্যাকাউন্ট যাচাই থেকে চূড়ান্ত সেবা ডেলিভারি পর্যন্ত চারটি পরিষ্কার ধাপ অনুসরণ করুন।',
      stepLabel: 'ধাপ',
      steps: [
        {
          step: '০১',
          title: 'নিবন্ধন ও যাচাই',
          description:
            'জন্ম নিবন্ধন তথ্য দিয়ে অ্যাকাউন্ট তৈরি করুন এবং OTP যাচাই সম্পন্ন করুন।'
        },
        {
          step: '০২',
          title: 'আবেদন জমা',
          description:
            'স্মার্ট এনআইডি ফর্ম পূরণ করুন এবং প্রয়োজনীয় ডকুমেন্ট আপলোড করুন।'
        },
        {
          step: '০৩',
          title: 'বায়োমেট্রিক বুকিং',
          description:
            'এনরোলমেন্ট সেন্টার, তারিখ এবং উপলব্ধ সময় নির্বাচন করুন।'
        },
        {
          step: '০৪',
          title: 'ট্র্যাক ও গ্রহণ',
          description:
            'অনুমোদন, ডিজিটাল এনআইডি অ্যাক্সেস, প্রিন্টিং এবং ডেলিভারি অগ্রগতি দেখুন।'
        }
      ]
    },
    requirements: {
      tag: 'শুরু করার আগে',
      title: 'প্রয়োজনীয় তথ্য ও ডকুমেন্ট প্রস্তুত রাখুন',
      description:
        'আবেদন শুরুর আগে এগুলো প্রস্তুত রাখলে সংশোধন অনুরোধ ও বারবার জমা দেওয়ার ঝামেলা কমে।',
      miniPoints: [
        'OTP যাচাইয়ের জন্য মোবাইল নম্বর',
        'ঠিকানা ও সেন্টার নির্বাচনের জন্য সঠিক তথ্য',
        'ভালো প্রস্তুতি মানে সহজ ডিজিটাল আবেদন'
      ],
      items: [
        'জন্ম নিবন্ধন নম্বর',
        'সাম্প্রতিক পাসপোর্ট সাইজ ছবি',
        'পরিষ্কার স্বাক্ষরের ছবি',
        'বৈধ বাংলাদেশি মোবাইল নম্বর',
        'পিতা-মাতার এনআইডি তথ্য',
        'প্রয়োজন হলে ঠিকানার প্রমাণ'
      ]
    },
    cta: {
      tag: 'নিরাপদে শুরু করুন',
      title: 'আপনার স্মার্ট এনআইডি আবেদন শুরু করতে প্রস্তুত?',
      description:
        'অ্যাকাউন্ট তৈরি করুন, তথ্য যাচাই করুন এবং একটি নিরাপদ নাগরিক পোর্টালের মাধ্যমে আবেদন চালিয়ে যান।',
      createAccount: 'অ্যাকাউন্ট তৈরি করুন',
      loginToContinue: 'লগইন করে চালিয়ে যান'
    },
    imageAlt: 'নাগরিকরা স্মার্ট এনআইডি সেবা ব্যবহার করছেন'
  }
};

const quickActionMeta = [
  { icon: <FaUserPlus />, to: '/register' },
  { icon: <FaIdCard />, to: '/login' },
  { icon: <FaCalendarCheck />, to: '/login' },
  { icon: <FaSearch />, to: '/login' },
  { icon: <FaHeadset />, to: '/login' }
];

const trustCardIcons = [<FaShieldAlt />, <FaUserCheck />, <FaFingerprint />];

const processIcons = [
  <FaUserCheck />,
  <FaFileUpload />,
  <FaCalendarCheck />,
  <FaSearch />
];

const requirementIcons = [
  <FaIdCard />,
  <FaFileUpload />,
  <FaFileUpload />,
  <FaMobileAlt />,
  <FaIdCard />,
  <FaMapMarkerAlt />
];

const miniPointIcons = [<FaMobileAlt />, <FaMapMarkerAlt />, <FaDownload />];

const LandingPage = () => {
  const { language } = useLanguage();
  const copy = landingCopy[language] || landingCopy.en;

  const patternFrameRef = useRef(null);
  const patternPositionRef = useRef({
    x: 0,
    y: 0,
    target: null
  });

  const handlePatternMove = (event) => {
    patternPositionRef.current = {
      x: event.clientX,
      y: event.clientY,
      target: event.currentTarget
    };

    if (patternFrameRef.current) return;

    patternFrameRef.current = requestAnimationFrame(() => {
      const { x, y, target } = patternPositionRef.current;

      if (target) {
        target.style.setProperty('--cursor-x', `${x}px`);
        target.style.setProperty('--cursor-y', `${y}px`);
        target.style.setProperty('--cursor-opacity', '1');
      }

      patternFrameRef.current = null;
    });
  };

  const handlePatternLeave = (event) => {
    event.currentTarget.style.setProperty('--cursor-opacity', '0');
  };

  return (
    <div
      className="landing-page has-cursor-pattern bg-slate-50 text-slate-900 overflow-x-hidden"
      onMouseMove={handlePatternMove}
      onMouseLeave={handlePatternLeave}
    >
      <div className="landing-cursor-pattern" aria-hidden="true" />

      <section className="landing-hero bg-gradient-to-br from-emerald-50 via-green-50 to-white pt-8 pb-12 md:pt-10 md:pb-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hero-layout grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="hero-copy">
              <span className="hero-kicker inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide">
                {copy.hero.kicker}
              </span>

              <h1 className="hero-title mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-slate-950">
                {copy.hero.titleLine1}
                <span className="hero-title-accent block text-emerald-600">
                  {copy.hero.titleLine2}
                </span>
              </h1>

              <p className="hero-description mt-5 max-w-2xl text-base sm:text-lg leading-8 text-slate-600">
                {copy.hero.description}
              </p>

              <div className="hero-actions mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="hero-primary-btn inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  <FaUserPlus />
                  {copy.hero.createAccount}
                </Link>

                <Link
                  to="/login"
                  className="hero-secondary-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
                >
                  {copy.hero.loginToContinue}
                </Link>
              </div>

              <div className="hero-points mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {copy.heroPoints.map((point) => (
                  <div
                    key={point}
                    className="hero-point-item flex items-center gap-3 text-sm font-medium text-slate-700"
                  >
                    <FaCheckCircle className="text-emerald-600 shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>

              <div className="hero-summary-grid mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {copy.summaryCards.map((item) => (
                  <div
                    key={item.value}
                    className="hero-summary-card rounded-2xl border border-emerald-100 bg-white/80 px-5 py-4 shadow-sm"
                  >
                    <span className="block text-xl font-bold text-emerald-600">
                      {item.value}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-visual flex justify-center lg:justify-end">
              <div className="hero-image-shell relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-2xl shadow-slate-900/10">
                <img
                  src="hero/hero-img.webp"
                  alt={copy.imageAlt}
                  width="820"
                  height="600"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="hero-image h-[320px] sm:h-[390px] lg:h-[460px] w-full object-cover object-center"
                />

                <div className="hero-status-card hero-status-top hidden md:flex absolute top-6 right-6 max-w-[280px] items-start gap-3 rounded-2xl bg-white/95 px-4 py-4 shadow-xl backdrop-blur">
                  <div className="status-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {copy.hero.secureRegistration}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {copy.hero.secureRegistrationText}
                    </p>
                  </div>
                </div>

                <div className="hero-status-card hero-status-bottom hidden md:flex absolute left-6 bottom-6 max-w-[290px] items-start gap-3 rounded-2xl bg-white/95 px-4 py-4 shadow-xl backdrop-blur">
                  <div className="status-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FaClock />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {copy.hero.trackEveryStage}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {copy.hero.trackEveryStageText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-actions py-12 md:py-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="actions-panel rounded-[28px] border border-slate-200 bg-white p-5 md:p-7 lg:p-8 shadow-xl shadow-slate-900/5">
            <div className="section-heading mb-8 md:mb-10">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                {copy.actions.tag}
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                {copy.actions.title}
              </h2>

              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                {copy.actions.description}
              </p>
            </div>

            <div className="actions-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 lg:gap-4">
              {copy.quickActions.map((item, index) => (
                <div
                  key={item.title}
                  className="action-card flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md"
                >
                  <div className="action-icon action-icon-landing mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    {quickActionMeta[index].icon}
                  </div>

                  <h3 className="text-md font-semibold leading-6 text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>

                  <Link
                    to={quickActionMeta[index].to}
                    className="action-link mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                  >
                    {item.actionLabel}
                    <FaArrowRight />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-trust bg-white py-12 md:py-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="trust-layout grid grid-cols-1 lg:grid-cols-[1fr,1.05fr] gap-8 lg:gap-10 items-start">
            <div className="trust-copy">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                {copy.trust.tag}
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                {copy.trust.title}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                {copy.trust.description}
              </p>

              <div className="trust-list mt-6 space-y-4">
                {copy.trust.points.map((item) => (
                  <div
                    key={item}
                    className="trust-list-item flex items-center gap-3 text-sm sm:text-base font-medium text-slate-700"
                  >
                    <FaCheckCircle className="text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="trust-cards space-y-4">
              {copy.trust.cards.map((card, index) => (
                <div
                  key={card.title}
                  className="trust-card flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-6 shadow-sm"
                >
                  <div className="trust-card-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    {trustCardIcons[index]}
                  </div>

                  <div className="trust-card-content">
                    <h3 className="text-lg font-bold text-slate-900">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {card.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-process bg-slate-50 py-10 md:py-14">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="section-heading-center text-center mb-8 md:mb-10">
            <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
              {copy.process.tag}
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              {copy.process.title}
            </h2>

            <p className="mt-3 max-w-2xl mx-auto text-base leading-8 text-slate-600">
              {copy.process.description}
            </p>
          </div>

          <div className="journey-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {copy.process.steps.map((step, index) => (
              <div
                key={step.step}
                className="journey-card relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="journey-card-top flex items-center justify-between gap-4">
                  <span className="journey-step-badge">
                    {copy.process.stepLabel} {step.step}
                  </span>

                  <div className="journey-icon">
                    {processIcons[index]}
                  </div>
                </div>

                <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-950">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-requirements bg-white py-12 md:py-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="requirements-layout grid grid-cols-1 lg:grid-cols-[0.95fr,1.05fr] gap-8 lg:gap-10 items-stretch">
            <div className="requirements-copy flex flex-col justify-center items-start">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                {copy.requirements.tag}
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                {copy.requirements.title}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                {copy.requirements.description}
              </p>

              <div className="requirements-mini-points mt-6 space-y-4">
                {copy.requirements.miniPoints.map((item, index) => (
                  <div
                    key={item}
                    className="mini-point flex items-center gap-3 text-sm sm:text-base font-medium text-slate-700"
                  >
                    <span className="text-emerald-600 shrink-0">
                      {miniPointIcons[index]}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="requirements-grid grid grid-cols-2 sm:grid-cols-3 gap-4 lg:h-full lg:grid-rows-2">
              {copy.requirements.items.map((title, index) => (
                <div
                  key={title}
                  className="requirement-item flex h-full min-h-[150px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white px-4 py-6 text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="requirement-icon flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-600">
                    {requirementIcons[index]}
                  </div>

                  <h3 className="mt-4 max-w-[150px] text-sm sm:text-base font-semibold leading-6 text-slate-900">
                    {title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta bg-emerald-600 py-12 md:py-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="cta-box text-center max-w-3xl mx-auto">
            <span className="section-tag-light inline-flex items-center rounded-full bg-white/15 text-white px-4 py-2 text-xs sm:text-sm font-semibold">
              {copy.cta.tag}
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              {copy.cta.title}
            </h2>

            <p className="mt-4 text-base leading-8 text-emerald-50">
              {copy.cta.description}
            </p>

            <div className="cta-buttons mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="cta-primary-btn inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                {copy.cta.createAccount}
                <FaArrowRight />
              </Link>

              <Link
                to="/login"
                className="cta-secondary-btn inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                {copy.cta.loginToContinue}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
