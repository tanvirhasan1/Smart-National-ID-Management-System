import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaDownload,
  FaShieldAlt,
  FaSpinner,
  FaUser,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import { canViewDigitalNid } from '../../utils/applicationLifecycle';
import '../styles/DigitalNID.css';

const NA = 'N/A';

const DIGITAL_NID_COPY = {
  en: {
    backToDashboard: 'Back to Dashboard',
    title: 'Digital Smart NID',
    subtitle: 'Secure digital version generated after card printing.',
    demoNote: 'Demo digital NID for academic use.',
    downloadPrint: 'Download / Print',
    preparingDownload: 'Opening print dialog...',
    downloadFailed: 'Print dialog could not be opened.',
    loading: 'Loading Digital NID...',
    unavailableTitle: 'Digital NID Not Available',
    noData: 'No digital NID data found.',
    verified: 'Verified',
  },
  bn: {
    backToDashboard: 'ড্যাশবোর্ডে ফিরে যান',
    title: 'ডিজিটাল স্মার্ট এনআইডি',
    subtitle: 'কার্ড প্রিন্টের পর তৈরি নিরাপদ ডিজিটাল সংস্করণ।',
    demoNote: 'শিক্ষামূলক ব্যবহারের জন্য ডেমো ডিজিটাল এনআইডি।',
    downloadPrint: 'ডাউনলোড / প্রিন্ট',
    preparingDownload: 'প্রিন্ট ডায়ালগ খোলা হচ্ছে...',
    downloadFailed: 'প্রিন্ট ডায়ালগ খোলা যায়নি।',
    loading: 'ডিজিটাল এনআইডি লোড হচ্ছে...',
    unavailableTitle: 'ডিজিটাল এনআইডি পাওয়া যায়নি',
    noData: 'ডিজিটাল এনআইডির তথ্য পাওয়া যায়নি।',
    verified: 'যাচাইকৃত',
  },
};

const pick = (...values) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && String(item).trim() !== ''
  );

  return value !== undefined && value !== null ? String(value).trim() : NA;
};

const formatDate = (value) => {
  if (!value || value === NA) return NA;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NA;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatNid = (value) => {
  if (!value || value === NA || value === 'Pending') return 'Pending';

  return String(value)
    .replace(/\s+/g, '')
    .replace(/(.{3})/g, '$1 ')
    .trim();
};

const makeAddress = (address = {}) => {
  const parts = [
    address.house || address.holdingNo || address.holding,
    address.road || address.roadNo || address.street,
    address.village || address.villageOrArea || address.area,
    address.postOffice,
    address.union || address.unionOrWard || address.ward,
    address.upazila || address.thana,
    address.district,
    address.division,
    address.postCode || address.postalCode,
  ].filter((item) => item !== undefined && item !== null && String(item).trim() !== '');

  return parts.length ? parts.join(', ') : NA;
};

const imageUrl = (path) => {
  if (!path || path === NA) return '';

  if (typeof path === 'object') {
    const nestedPath = pick(
      path.secureUrl,
      path.url,
      path.path,
      path.fileUrl,
      path.location,
      path.current?.secureUrl,
      path.current?.url,
      path.current?.path,
      path.cloudinary?.secureUrl,
      path.cloudinary?.url
    );

    if (nestedPath === NA) return '';
    return imageUrl(nestedPath);
  }

  const cleanPath = String(path).trim();
  if (!cleanPath) return '';

  if (/^https?:\/\//i.test(cleanPath)) return cleanPath;

  const base = (api?.defaults?.baseURL || '')
    .replace(/\/api\/?$/i, '')
    .replace(/\/$/, '');

  return `${base}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
};


const OBFUSCATION_KEY = 'smart-nid-card-display-v1';

const encodeUnicode = (value) =>
  window.btoa(unescape(encodeURIComponent(value)));

const decodeUnicode = (value) =>
  decodeURIComponent(escape(window.atob(value)));

const encryptDisplayText = (value) => {
  const text = String(value ?? NA);
  let shifted = '';

  for (let index = 0; index < text.length; index += 1) {
    shifted += String.fromCharCode(
      text.charCodeAt(index) ^ OBFUSCATION_KEY.charCodeAt(index % OBFUSCATION_KEY.length)
    );
  }

  return encodeUnicode(shifted);
};

const decryptDisplayText = (token) => {
  try {
    const shifted = decodeUnicode(token || '');
    let text = '';

    for (let index = 0; index < shifted.length; index += 1) {
      text += String.fromCharCode(
        shifted.charCodeAt(index) ^ OBFUSCATION_KEY.charCodeAt(index % OBFUSCATION_KEY.length)
      );
    }

    return text;
  } catch (_) {
    return NA;
  }
};

const wrapCanvasText = (context, text, maxWidth, maxLines = 1) => {
  const cleanText = String(text || NA).replace(/\s+/g, ' ').trim();

  if (maxLines <= 1 || context.measureText(cleanText).width <= maxWidth) {
    return [cleanText];
  }

  const words = cleanText.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);

  if (lines.length > maxLines) {
    const visibleLines = lines.slice(0, maxLines);
    let lastLine = visibleLines[maxLines - 1] || '';

    while (lastLine.length > 1 && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }

    visibleLines[maxLines - 1] = `${lastLine}…`;
    return visibleLines;
  }

  return lines;
};

const ProtectedCanvasText = ({
  value,
  className = '',
  block = false,
  maxLines = 1,
  align = 'left',
}) => {
  const canvasRef = useRef(null);
  const token = useMemo(() => encryptDisplayText(value), [value]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const draw = () => {
      const text = decryptDisplayText(canvas.dataset.secureToken);
      const style = window.getComputedStyle(canvas);
      const context = canvas.getContext('2d');
      if (!context) return;

      const fontSize = Number.parseFloat(style.fontSize) || 14;
      const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.25;
      const fontWeight = style.fontWeight || '500';
      const fontFamily = style.fontFamily || 'Inter, sans-serif';
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
      const dpr = window.devicePixelRatio || 1;
      const parentWidth = canvas.parentElement?.clientWidth || 0;

      context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

      const measuredWidth = context.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
      const cssWidth = block
        ? Math.max(16, Math.floor(parentWidth || measuredWidth + 4))
        : Math.max(16, Math.ceil(measuredWidth + 4));
      const lines = wrapCanvasText(context, text, Math.max(12, cssWidth - 2), maxLines);
      const cssHeight = Math.max(10, Math.ceil(lines.length * lineHeight + 2));

      canvas.width = Math.ceil(cssWidth * dpr);
      canvas.height = Math.ceil(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      context.fillStyle = style.color || '#0f172a';
      context.textBaseline = 'middle';

      lines.forEach((line, index) => {
        const textWidth = context.measureText(line).width;
        const x = align === 'right' ? cssWidth - textWidth : align === 'center' ? (cssWidth - textWidth) / 2 : 0;
        const y = lineHeight / 2 + index * lineHeight + 1;
        context.fillText(line, x, y);
      });
    };

    draw();
    window.addEventListener('resize', draw);

    return () => window.removeEventListener('resize', draw);
  }, [token, block, maxLines, align]);

  return (
    <canvas
      ref={canvasRef}
      className={`protected-canvas-text ${block ? 'protected-canvas-text--block' : ''} ${className}`}
      data-secure-token={token}
      aria-label="Protected digital NID information"
      role="img"
      onContextMenu={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    />
  );
};

const DigitalNID = () => {
  const { id } = useParams();
  const { language } = useLanguage();
  const languageKey = language === 'bn' ? 'bn' : 'en';
  const copy = DIGITAL_NID_COPY[languageKey];

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [signatureError, setSignatureError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadDigitalNid = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        setPhotoError(false);
        setSignatureError(false);

        const response = await api.get(`/applications/${id}`, {
          params: { purpose: 'digital_nid' },
        });

        const payload =
          response?.data?.application ||
          response?.data?.data ||
          response?.data?.user ||
          response?.data ||
          null;

        let citizenProfile = null;

        try {
          const profileResponse = await api.get('/users/profile');

          citizenProfile =
            profileResponse?.data?.user ||
            profileResponse?.data?.data ||
            profileResponse?.data ||
            null;
        } catch (_) {
          citizenProfile = null;
        }

        const mergedPayload =
          citizenProfile && payload && typeof payload === 'object'
            ? { ...payload, _citizenProfile: citizenProfile }
            : payload || citizenProfile;

        if (!canViewDigitalNid(mergedPayload?.status)) {
          throw new Error('Digital NID will be available after your card is printed.');
        }

        setRecord(mergedPayload);
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Digital NID could not be loaded.';
        setErrorMessage(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadDigitalNid();
    } else {
      setLoading(false);
      setErrorMessage('Application ID is missing.');
    }
  }, [id]);

  const app = record?.application || record || {};
  const applicant = app.userId || app.user || app.applicant || app.citizen || {};
  const profile = record?._citizenProfile || record?.profile || record?.userProfile || {};
  const info = app.personalInfo || applicant.personalInfo || profile.personalInfo || {};
  const docs = app.documents || applicant.documents || {};
  const assets = app.documentAssets || applicant.documentAssets || {};

  const presentAddress = app.presentAddress || info.presentAddress || applicant.presentAddress || {};
  const permanentAddress =
    app.permanentAddress || info.permanentAddress || applicant.permanentAddress || {};

  const data = {
    applicationId: pick(app.applicationId, app._id, record?._id, id),

    nidNumber: pick(
      record?.nidNumber,
      record?.digitalNidNumber,
      record?.nationalId,
      record?.nidNo,
      app.nidNumber,
      app.digitalNidNumber,
      app.generatedNidNumber,
      app.nationalId,
      app.nidNo,
      applicant.nidNumber,
      applicant.nationalId,
      'Pending'
    ),

    name: pick(
      app.fullNameEnglish,
      app.nameEnglish,
      app.englishName,
      app.fullNameEn,
      app.fullName,
      info.fullNameEnglish,
      info.nameEnglish,
      info.englishName,
      info.fullNameEn,
      info.fullName,
      applicant.fullNameEnglish,
      applicant.nameEnglish,
      applicant.englishName,
      applicant.fullNameEn,
      applicant.fullName,
      applicant.name
    ),

    nameBangla: pick(
      app.fullNameBangla,
      app.nameBangla,
      app.banglaName,
      info.fullNameBangla,
      info.nameBangla,
      info.banglaName,
      applicant.fullNameBangla,
      applicant.nameBangla,
      applicant.banglaName
    ),

    father: pick(
      app.fatherName,
      app.fatherNameEnglish,
      info.fatherName,
      info.fatherNameEnglish,
      applicant.fatherName,
      applicant.fatherNameEnglish
    ),

    mother: pick(
      app.motherName,
      app.motherNameEnglish,
      info.motherName,
      info.motherNameEnglish,
      applicant.motherName,
      applicant.motherNameEnglish
    ),

    dob: pick(
      app.dateOfBirth,
      app.dob,
      info.dateOfBirth,
      info.dob,
      applicant.dateOfBirth,
      applicant.dob
    ),

    blood: pick(app.bloodGroup, info.bloodGroup, applicant.bloodGroup),

    birthPlace: pick(
      app.placeOfBirth,
      app.birthPlace,
      app.birthDistrict,
      app.districtOfBirth,
      info.placeOfBirth,
      info.birthPlace,
      info.birthDistrict,
      info.districtOfBirth,
      applicant.placeOfBirth,
      applicant.birthPlace,
      applicant.birthDistrict,
      applicant.districtOfBirth,
      profile.placeOfBirth,
      profile.birthPlace,
      profile.birthDistrict,
      profile.districtOfBirth,
      permanentAddress.district,
      presentAddress.district
    ),

    phone: pick(
      app.mobileNumber,
      app.phoneNumber,
      app.phone,
      app.mobile,
      app.contactNumber,
      info.mobileNumber,
      info.phoneNumber,
      info.phone,
      info.mobile,
      info.contactNumber,
      applicant.mobileNumber,
      applicant.phoneNumber,
      applicant.phone,
      applicant.mobile,
      applicant.contactNumber
    ),

    email: pick(app.email, info.email, applicant.email),

    photo: imageUrl(
      assets.photograph?.current?.secureUrl ||
        assets.photograph?.current?.url ||
        assets.photograph?.current?.path ||
        assets.photograph?.cloudinary?.secureUrl ||
        assets.photograph?.cloudinary?.url ||
        assets.photograph?.secureUrl ||
        assets.photograph?.url ||
        assets.applicantPhoto?.current?.secureUrl ||
        assets.applicantPhoto?.current?.url ||
        assets.photo?.current?.secureUrl ||
        assets.photo?.current?.url ||
        docs.photograph?.secureUrl ||
        docs.photograph?.url ||
        docs.applicantPhoto?.secureUrl ||
        docs.applicantPhoto?.url ||
        docs.photo?.secureUrl ||
        docs.photo?.url ||
        info.applicantPhoto ||
        info.photo ||
        applicant.photo ||
        applicant.avatar ||
        app.photo ||
        app.photoUrl
    ),

    signature: imageUrl(
      assets.signature?.current?.secureUrl ||
        assets.signature?.current?.url ||
        assets.signature?.current?.path ||
        assets.signature?.cloudinary?.secureUrl ||
        assets.signature?.cloudinary?.url ||
        assets.signature?.secureUrl ||
        assets.signature?.url ||
        assets.signature?.path ||
        assets.applicantSignature?.current?.secureUrl ||
        assets.applicantSignature?.current?.url ||
        assets.applicantSignature?.current?.path ||
        assets.applicantSignature?.cloudinary?.secureUrl ||
        assets.applicantSignature?.cloudinary?.url ||
        docs.signature?.secureUrl ||
        docs.signature?.url ||
        docs.signature?.path ||
        docs.applicantSignature?.secureUrl ||
        docs.applicantSignature?.url ||
        docs.applicantSignature?.path ||
        info.signatureUrl ||
        info.signature ||
        applicant.signatureUrl ||
        applicant.signature ||
        app.signatureUrl ||
        app.signature
    ),

    address: makeAddress(presentAddress),

    permanentAddress: makeAddress(permanentAddress),

    issueDate: formatDate(
      record?.issuedAt ||
        record?.approvedAt ||
        app.issuedAt ||
        app.approvedAt ||
        app.updatedAt ||
        app.createdAt ||
        new Date()
    ),
  };

  const mrzLines = useMemo(() => {
    const compactNid = String(data.nidNumber || 'PENDING')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .padEnd(10, '<')
      .slice(0, 10);

    const safeName = String(data.name || 'SMART NID')
      .replace(/[^A-Za-z\s]/g, '')
      .trim()
      .toUpperCase();

    const parts = safeName.split(/\s+/).filter(Boolean);
    const surname = parts.pop() || 'CITIZEN';
    const given = parts.join('<') || 'SMART';
    const birth = formatDate(data.dob).replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 7);

    return [
      `I<BGD${compactNid}4<43<<<<<<<<<<<<<<<`,
      `${birth.padEnd(7, '<')}M3011294BGD<<<<<<<<<<8`,
      `${surname}<<${given}`.padEnd(30, '<'),
    ];
  }, [data.nidNumber, data.name, data.dob]);

  const handleDownloadPrint = () => {
    if (downloading) return;

    try {
      setDownloading(true);
      toast.info(copy.preparingDownload, { autoClose: 1400 });

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          window.print();
          setDownloading(false);
        }, 120);
      });
    } catch (_) {
      toast.error(copy.downloadFailed);
      setDownloading(false);
    }
  };

  const preventCardInteraction = (event) => {
    event.preventDefault();
  };

  if (loading) {
    return (
      <div className={`digital-nid-page-wrapper digital-nid-page-wrapper--${languageKey}`}>
        <div className="digital-nid-container digital-nid-container--narrow">
          <div className="digital-nid-state-card">
            <FaSpinner className="digital-nid-spinner" />
            <p>{copy.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !record) {
    return (
      <div className={`digital-nid-page-wrapper digital-nid-page-wrapper--${languageKey}`}>
        <div className="digital-nid-container digital-nid-container--narrow">
          <div className="digital-nid-state-card">
            <h2>{copy.unavailableTitle}</h2>
            <p>{errorMessage || copy.noData}</p>

            <Link to="/dashboard" className="digital-nid-primary-btn">
              <FaArrowLeft />
              {copy.backToDashboard}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`digital-nid-page-wrapper digital-nid-page-wrapper--${languageKey}`}>
      <div className="digital-nid-container">
        <div className="digital-nid-topbar">
          <Link to="/dashboard" className="digital-nid-back-link">
            <FaArrowLeft />
            {copy.backToDashboard}
          </Link>

          <button
            type="button"
            onClick={handleDownloadPrint}
            className="digital-nid-download-button"
            disabled={downloading}
          >
            {downloading ? <FaSpinner className="digital-nid-button-spinner" /> : <FaDownload />}
            {downloading ? copy.preparingDownload : copy.downloadPrint}
          </button>
        </div>

        <div className="digital-nid-layout">
          <section className="digital-nid-main-panel">
            <div className="digital-nid-header-block">
              <div>
                <h1>{copy.title}</h1>
                <p>{copy.subtitle}</p>
                <small>{copy.demoNote}</small>
              </div>

              <span className="digital-nid-verified-badge">
                <FaShieldAlt />
                {copy.verified}
              </span>
            </div>

            <div
              className="nid-card-stack nid-card-stack--protected"
              onContextMenu={preventCardInteraction}
              onCopy={preventCardInteraction}
              onCut={preventCardInteraction}
              onDragStart={preventCardInteraction}
              title="Digital NID preview is protected"
            >
              <article className="bd-nid-card bd-nid-card--front">
                <div className="bd-nid-security-grid" />
                <div className="bd-nid-rose-ring" />
                <div className="bd-nid-ghost-map" />
                <div className="bd-nid-ghost-photo-watermark">
                  <FaUser />
                </div>

                <header className="bd-nid-government-head">
                  <div className="bd-nid-emblem" aria-hidden="true">
                    <span />
                  </div>

                  <div>
                    <p className="bd-nid-bangla-title">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
                    <p className="bd-nid-english-title">
                      Government of the People&apos;s Republic of Bangladesh
                    </p>
                    <h2>জাতীয় পরিচয়পত্র / National ID Card</h2>
                  </div>
                </header>

                <div className="bd-nid-front-body">
                  <div className="bd-nid-left-column">
                    <div className="bd-nid-photo-frame">
                      {data.photo && !photoError ? (
                        <img
                          src={data.photo}
                          alt="Applicant photo"
                          draggable="false"
                          onContextMenu={preventCardInteraction}
                          onDragStart={preventCardInteraction}
                          onError={() => setPhotoError(true)}
                        />
                      ) : (
                        <div className="bd-nid-photo-placeholder">
                          <FaUser />
                          <span>Photo</span>
                        </div>
                      )}
                    </div>

                    <div
                      className={`bd-nid-signature-box ${
                        data.signature && !signatureError
                          ? 'bd-nid-signature-box--image'
                          : 'bd-nid-signature-box--empty'
                      }`}
                      aria-label="Citizen signature"
                    >
                      {data.signature && !signatureError ? (
                        <img
                          src={data.signature}
                          alt="Citizen signature"
                          draggable="false"
                          onContextMenu={preventCardInteraction}
                          onDragStart={preventCardInteraction}
                          onError={() => setSignatureError(true)}
                        />
                      ) : (
                        <span>Signature</span>
                      )}
                    </div>
                  </div>

                  <div className="bd-nid-front-info">
                    <div className="bd-nid-field bd-nid-field--bangla">
                      <span>নাম</span>
                      <strong><ProtectedCanvasText value={data.nameBangla} /></strong>
                    </div>

                    <div className="bd-nid-field">
                      <span>Name</span>
                      <strong><ProtectedCanvasText value={data.name} /></strong>
                    </div>

                    <div className="bd-nid-field bd-nid-field--bangla-small">
                      <span>পিতা</span>
                      <strong><ProtectedCanvasText value={data.father} /></strong>
                    </div>

                    <div className="bd-nid-field bd-nid-field--bangla-small">
                      <span>মাতা</span>
                      <strong><ProtectedCanvasText value={data.mother} /></strong>
                    </div>

                    <div className="bd-nid-number-row">
                      <span>Date of Birth</span>
                      <strong><ProtectedCanvasText value={formatDate(data.dob)} /></strong>
                    </div>

                    <div className="bd-nid-number-row bd-nid-number-row--nid">
                      <span>NID No.</span>
                      <strong><ProtectedCanvasText value={formatNid(data.nidNumber)} /></strong>
                    </div>
                  </div>

                  <div className="bd-nid-chip-area">
                    <div className="bd-nid-chip" aria-hidden="true" />
                  </div>
                </div>
              </article>

              <article className="bd-nid-card bd-nid-card--back">
                <div className="bd-nid-security-grid" />
                <div className="bd-nid-back-flower" />
                <div className="bd-nid-back-ghost-photo">
                  <FaUser />
                </div>

                <div className="bd-nid-barcode-strip" aria-hidden="true">
                  <span />
                </div>

                <div className="bd-nid-back-address">
                  <span>ঠিকানা / Address</span>
                  <p><ProtectedCanvasText value={data.address !== NA ? data.address : data.permanentAddress} block maxLines={2} /></p>
                </div>

                <div className="bd-nid-back-meta-grid">
                  <div>
                    <span>Blood Group:</span>
                    <strong><ProtectedCanvasText value={data.blood} /></strong>
                  </div>

                  <div>
                    <span>Place of Birth:</span>
                    <strong><ProtectedCanvasText value={String(data.birthPlace).toUpperCase()} /></strong>
                  </div>

                  <div>
                    <span>Issue Date:</span>
                    <strong><ProtectedCanvasText value={data.issueDate} /></strong>
                  </div>
                </div>

                <div className="bd-nid-mrz-block" aria-label="machine readable zone">
                  {mrzLines.map((line, index) => (
                    <p key={`${index}-${line.length}`}>
                      <ProtectedCanvasText value={line} block maxLines={1} />
                    </p>
                  ))}
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DigitalNID;
