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
      'Create a verified citizen account with your personal information and OTP confirmation.',
    to: '/register',
    actionLabel: 'Create Account'
  },
  {
    icon: <FaIdCard />,
    title: 'Apply for Smart NID',
    description:
      'Start or continue your Smart NID application with the required documents.',
    to: '/login',
    actionLabel: 'Login to Apply'
  },
  {
    icon: <FaCalendarCheck />,
    title: 'Book Appointment',
    description:
      'Choose an available biometric enrollment center, date, and time slot.',
    to: '/login',
    actionLabel: 'Book Appointment'
  },
  {
    icon: <FaSearch />,
    title: 'Track Application',
    description:
      'Check application review, printing, dispatch, and delivery progress.',
    to: '/login',
    actionLabel: 'Track Status'
  },
  {
    icon: <FaHeadset />,
    title: 'Support Service',
    description:
      'Get support for registration, application, appointment, or verification issues.',
    to: '/login',
    actionLabel: 'Open Support'
  }
];

const trustCards = [
  {
    icon: <FaShieldAlt />,
    title: 'Verification-First Access',
    description:
      'Registration and login are presented as protected identity steps, with clear guidance for citizens.'
  },
  {
    icon: <FaUserCheck />,
    title: 'Citizen-Friendly Flow',
    description:
      'Core services are grouped by purpose, so first-time users can choose the right action quickly.'
  },
  {
    icon: <FaFingerprint />,
    title: 'Official Service Interface',
    description:
      'The page uses a restrained visual structure suitable for a public digital identity platform.'
  }
];

const processSteps = [
  {
    step: '01',
    icon: <FaUserCheck />,
    title: 'Register & Verify',
    description:
      'Create your account with BRN details and complete OTP verification.'
  },
  {
    step: '02',
    icon: <FaFileUpload />,
    title: 'Submit Application',
    description:
      'Fill out the Smart NID form and upload the required documents.'
  },
  {
    step: '03',
    icon: <FaCalendarCheck />,
    title: 'Book Biometrics',
    description:
      'Select an enrollment center, date, and available appointment slot.'
  },
  {
    step: '04',
    icon: <FaSearch />,
    title: 'Track & Receive',
    description:
      'Track approval, digital NID access, printing, and delivery progress.'
  }
];

const requirements = [
  {
    icon: <FaIdCard />,
    title: 'Birth Registration Number'
  },
  {
    icon: <FaFileUpload />,
    title: 'Recent passport-size photo'
  },
  {
    icon: <FaFileUpload />,
    title: 'Clear signature image'
  },
  {
    icon: <FaMobileAlt />,
    title: 'Valid Bangladeshi mobile number'
  },
  {
    icon: <FaIdCard />,
    title: "Parent's NID information"
  },
  {
    icon: <FaMapMarkerAlt />,
    title: 'Address proof if required'
  }
];

const summaryCards = [
  {
    value: 'Secure',
    label: 'Verified citizen access'
  },
  {
    value: 'Guided',
    label: 'Clear service steps'
  },
  {
    value: 'Digital',
    label: 'Online NID services'
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
    <div className="landing-page has-cursor-pattern bg-slate-50 text-slate-900 overflow-x-hidden" onMouseMove={handlePatternMove}
  onMouseLeave={handlePatternLeave}>
    <div className="landing-cursor-pattern" aria-hidden="true" />
      <section className="landing-hero bg-gradient-to-br from-emerald-50 via-green-50 to-white pt-8 pb-12 md:pt-10 md:pb-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hero-layout grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="hero-copy">
              <span className="hero-kicker inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold tracking-wide">
                Government Digital Identity Service
              </span>

              <h1 className="hero-title mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-slate-950">
                Smart National ID
                <span className="hero-title-accent block text-emerald-600">
                  Management System
                </span>
              </h1>

              <p className="hero-description mt-5 max-w-2xl text-base sm:text-lg leading-8 text-slate-600">
                Apply, verify your account, book appointments, track progress,
                and access Smart NID services through one secure citizen portal.
              </p>

              <div className="hero-actions mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="hero-primary-btn inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
                >
                  <FaUserPlus />
                  Create Account
                </Link>

                <Link
                  to="/login"
                  className="hero-secondary-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
                >
                  Login to Continue
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
                  src="../../../public/hero/hero-img.webp"
                  alt="Citizens using Smart NID card services"
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
                      Secure Registration
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Birth Certificate and OTP-based verification flow
                    </p>
                  </div>
                </div>

                <div className="hero-status-card hero-status-bottom hidden md:flex absolute left-6 bottom-6 max-w-[290px] items-start gap-3 rounded-2xl bg-white/95 px-4 py-4 shadow-xl backdrop-blur">
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

      <section className="landing-actions py-12 md:py-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="actions-panel rounded-[28px] border border-slate-200 bg-white p-5 md:p-7 lg:p-8 shadow-xl shadow-slate-900/5">
            <div className="section-heading mb-8 md:mb-10">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                Citizen quick actions
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Choose your Smart NID service
              </h2>

              <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                Start registration, submit an application, book biometrics, or
                check your service status from one place.
              </p>
            </div>

            <div className="actions-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 lg:gap-4">
              {quickActions.map((item) => (
                <div
                  key={item.title}
                  className="action-card flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md"
                >
                  <div className="action-icon action-icon-landing mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    {item.icon}
                  </div>

                  <h3 className="text-md font-semibold leading-6 text-slate-900">
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

      <section className="landing-trust bg-white py-12 md:py-16">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="trust-layout grid grid-cols-1 lg:grid-cols-[1fr,1.05fr] gap-8 lg:gap-10 items-start">
            <div className="trust-copy">
              <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
                Why citizens can trust this service
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Secure, guided, and simple access to Smart NID services
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                The homepage keeps key actions visible, explains the process clearly,
                and uses a restrained official layout for a public identity service.
              </p>

              <div className="trust-list mt-6 space-y-4">
                {[
                  'Secure account verification is shown first',
                  'Citizen services are easier to scan',
                  'Important actions are grouped clearly',
                  'The design feels suitable for a public service portal'
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
                  className="trust-card flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-6 shadow-sm"
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

      <section className="landing-process bg-slate-50 py-10 md:py-14">
        <div className="landing-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="section-heading-center text-center mb-8 md:mb-10">
            <span className="section-tag inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-4 py-2 text-xs sm:text-sm font-bold">
              Simple citizen journey
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
              How the Smart NID service works
            </h2>

            <p className="mt-3 max-w-2xl mx-auto text-base leading-8 text-slate-600">
              Follow four clear steps from account verification to final service delivery.
            </p>
          </div>

          <div className="journey-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="journey-card relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="journey-card-top flex items-center justify-between gap-4">
                  <span className="journey-step-badge">
                    Step {step.step}
                  </span>

                  <div className="journey-icon">
                    {step.icon}
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
                Before you start
              </span>

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Prepare the important information and documents
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Keep these details ready before starting your application to avoid
                correction requests and repeated submissions.
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

            <div className="requirements-grid grid grid-cols-2 sm:grid-cols-3 gap-4 lg:h-full lg:grid-rows-2">
              {requirements.map((item) => (
                <div
                  key={item.title}
                  className="requirement-item flex h-full min-h-[150px] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white px-4 py-6 text-center shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="requirement-icon flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl text-emerald-600">
                    {item.icon}
                  </div>

                  <h3 className="mt-4 max-w-[150px] text-sm sm:text-base font-semibold leading-6 text-slate-900">
                    {item.title}
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
              Start securely
            </span>

            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Ready to start your Smart NID application?
            </h2>

            <p className="mt-4 text-base leading-8 text-emerald-50">
              Create an account, verify your information, and continue your
              application through one secure citizen portal.
            </p>

            <div className="cta-buttons mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="cta-primary-btn inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Create Account
                <FaArrowRight />
              </Link>

              <Link
                to="/login"
                className="cta-secondary-btn inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                Login to Continue
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;