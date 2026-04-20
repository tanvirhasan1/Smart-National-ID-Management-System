import React from 'react';
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
  FaUserPlus
} from 'react-icons/fa';
import '../styles/LandingPage.css';

const heroPoints = [
  'Birth Certificate validation',
  'OTP secured login flow',
  'Biometric appointment booking',
  'Application and delivery tracking'
];

const quickActions = [
  {
    icon: <FaUserPlus />,
    title: 'Create Account',
    description:
      'Start your Smart NID journey with secure citizen registration and OTP verification.',
    to: '/register',
    actionLabel: 'Register Now'
  },
  {
    icon: <FaIdCard />,
    title: 'Apply for Smart NID',
    description:
      'Continue your application with a verified account and the required supporting documents.',
    to: '/login',
    actionLabel: 'Login to Apply'
  },
  {
    icon: <FaCalendarCheck />,
    title: 'Book Appointment',
    description:
      'Choose a biometric enrollment date and center slot from available schedules.',
    to: '/login',
    actionLabel: 'Book via Login'
  },
  {
    icon: <FaSearch />,
    title: 'Track Application',
    description:
      'Monitor review, printing, dispatch, and delivery progress through one secure portal.',
    to: '/login',
    actionLabel: 'Track via Login'
  },
  {
    icon: <FaHeadset />,
    title: 'Support Service',
    description:
      'Get help with registration, application issues, verification steps, or service questions.',
    to: '/login',
    actionLabel: 'Open Support'
  }
];

const trustCards = [
  {
    icon: <FaShieldAlt />,
    title: 'Verification-First Access',
    description:
      'The platform presents registration and login as secure, guided steps instead of casual website actions.'
  },
  {
    icon: <FaUserCheck />,
    title: 'Citizen-Friendly Flow',
    description:
      'Important actions are grouped clearly so first-time users understand what to do next without confusion.'
  },
  {
    icon: <FaFingerprint />,
    title: 'Digital Identity Service Feel',
    description:
      'The interface looks more official and service-oriented, which is important for a national ID platform.'
  }
];

const processSteps = [
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
      'Fill out the Smart NID application and upload the required documents.'
  },
  {
    step: '03',
    title: 'Book Biometrics',
    description:
      'Select a convenient biometric enrollment center and appointment slot.'
  },
  {
    step: '04',
    title: 'Track & Receive',
    description:
      'Follow approval, digital NID access, printing, and delivery status online.'
  }
];

const requirements = [
  'Birth Registration Number',
  'Recent passport-size photo',
  'Clear signature image',
  'Valid Bangladeshi mobile number',
  "Parent's NID information",
  'Address proof if required'
];

const summaryCards = [
  {
    value: 'Secure',
    label: 'Identity-first access'
  },
  {
    value: 'Guided',
    label: 'Citizen-friendly flow'
  },
  {
    value: 'Digital',
    label: 'Tracking and ID access'
  }
];

const miniPoints = [
  {
    icon: <FaMobileAlt />,
    text: 'Mobile number for OTP verification'
  },
  {
    icon: <FaMapMarkerAlt />,
    text: 'Accurate information for address and center selection'
  },
  {
    icon: <FaDownload />,
    text: 'Better preparation means smoother digital submission'
  }
];

const LandingPage = () => {
  return (
    <div className="landing-page bg-slate-50 text-slate-900 overflow-x-hidden">
      <section className="landing-hero bg-gradient-to-br from-emerald-50 via-green-50 to-white py-16 md:py-20">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hero-layout grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="hero-copy">
              <span className="hero-kicker inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide">
                Government Digital Identity Service
              </span>

              <h1 className="hero-title mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.02] tracking-tight text-slate-950">
                Smart National ID
                <span className="hero-title-accent block text-emerald-600">
                  Management System
                </span>
              </h1>

              <p className="hero-description mt-5 max-w-2xl text-base sm:text-lg leading-8 text-slate-600">
                Apply, verify, book appointments, track progress, and access your
                digital Smart NID through one secure citizen portal designed for
                clarity, trust, and public service.
              </p>

              <div className="hero-actions mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="hero-primary-btn inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  <FaUserPlus />
                  Register Now
                </Link>

                <Link
                  to="/login"
                  className="hero-secondary-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
                >
                  Login to Dashboard
                </Link>
              </div>

              <div className="hero-points mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {heroPoints.map((point) => (
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
                {summaryCards.map((item) => (
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
                  src="https://i.ibb.co.com/0W7yVCf/1776456590.png"
                  alt="Bangladesh Smart NID citizens"
                  className="hero-image h-[340px] sm:h-[420px] lg:h-[520px] w-full object-cover object-center"
                />

                <div className="hero-status-card hero-status-top hidden md:flex absolute top-5 left-5 max-w-[280px] items-start gap-3 rounded-2xl bg-white/95 px-4 py-4 shadow-xl backdrop-blur">
                  <div className="status-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FaShieldAlt />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Secure Registration
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Birth Certificate and OTP-based verification flow
                    </p>
                  </div>
                </div>

                <div className="hero-status-card hero-status-bottom hidden md:flex absolute right-5 bottom-5 max-w-[290px] items-start gap-3 rounded-2xl bg-white/95 px-4 py-4 shadow-xl backdrop-blur">
                  <div className="status-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <FaClock />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Track Every Stage
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Application, appointment, printing, and delivery status
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-actions py-14 md:py-20">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="actions-panel rounded-[28px] border border-slate-200 bg-white p-6 md:p-8 lg:p-10 shadow-xl shadow-slate-900/5">
            <div className="section-heading mb-8 md:mb-10">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                Citizen quick actions
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Start the service you need in one step
              </h2>

              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                A production-level public service homepage should make the next
                citizen action obvious immediately.
              </p>
            </div>

            <div className="actions-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {quickActions.map((item) => (
                <div
                  key={item.title}
                  className="action-card flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-lg"
                >
                  <div className="action-icon action-icon-landing mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    {item.icon}
                  </div>

                  <h3 className="text-lg font-bold leading-6 text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>

                  <Link
                    to={item.to}
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

      <section className="landing-trust bg-white py-14 md:py-20">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="trust-layout grid grid-cols-1 lg:grid-cols-[1fr,1.05fr] gap-8 lg:gap-10 items-start">
            <div className="trust-copy">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                Why this version feels better
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Cleaner, smarter, and more reliable for a national ID service
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Instead of repeating too many similar card sections, this version
                gives stronger hierarchy, quicker service entry points, better
                readability, and a more official digital-service experience.
              </p>

              <div className="trust-list mt-6 space-y-4">
                {[
                  'More official and trustworthy visual structure',
                  'Less clutter and better section flow',
                  'Stronger focus on real citizen actions',
                  'Better fit for production-level Smart NID service'
                ].map((item) => (
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
              {trustCards.map((card) => (
                <div
                  key={card.title}
                  className="trust-card flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6 shadow-sm"
                >
                  <div className="trust-card-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    {card.icon}
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

      <section className="landing-process bg-slate-50 py-14 md:py-20">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="section-heading-center text-center mb-8 md:mb-10">
            <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
              Simple citizen journey
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              How the Smart NID service works
            </h2>

            <p className="mt-3 max-w-2xl mx-auto text-base leading-8 text-slate-600">
              Keep the process clear and confidence-building for first-time users.
            </p>
          </div>

          <div className="process-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="process-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="process-top mb-4 flex items-center justify-between">
                  <span className="process-step inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {step.step}
                  </span>

                  <FaArrowRight className="process-arrow text-emerald-300" />
                </div>

                <h3 className="text-lg font-bold text-slate-900">
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

      <section className="landing-requirements bg-white py-14 md:py-20">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="requirements-layout grid grid-cols-1 lg:grid-cols-[0.95fr,1.05fr] gap-8 lg:gap-10 items-start">
            <div className="requirements-copy">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                Before you start
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                Prepare the important information and documents
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                A clearer checklist helps citizens begin the application process
                with fewer mistakes and fewer support requests.
              </p>

              <div className="requirements-mini-points mt-6 space-y-4">
                {miniPoints.map((item) => (
                  <div
                    key={item.text}
                    className="mini-point flex items-center gap-3 text-sm sm:text-base font-medium text-slate-700"
                  >
                    <span className="text-emerald-600 shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="requirements-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
              {requirements.map((item) => (
                <div
                  key={item}
                  className="requirement-item flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  <FaCheckCircle className="text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta bg-emerald-600 py-14 md:py-20">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="cta-box text-center max-w-3xl mx-auto">
            <span className="section-tag-light inline-flex items-center rounded-full bg-white/15 text-white px-4 py-2 text-xs sm:text-sm font-bold">
              Get started
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ready to apply for your Smart NID?
            </h2>

            <p className="mt-4 text-base leading-8 text-emerald-50">
              Create your account, verify your identity, and continue the full
              application flow through one secure platform.
            </p>

            <div className="cta-buttons mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="cta-primary-btn inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Get Started
                <FaArrowRight />
              </Link>

              <Link
                to="/login"
                className="cta-secondary-btn inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Already have an account?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;