import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaIdCard,
  FaDownload,
  FaArrowLeft,
  FaShieldAlt,
  FaQrcode,
  FaSpinner,
  FaUser,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { formatDate } from '../utils/helpers';
import '../styles/DigitalNID.css';

// Digital NID Page
const DigitalNID = () => {
  const { id } = useParams();

  const [digitalNidData, setDigitalNidData] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestWithFallback = async (requests = []) => {
    let lastError = null;

    for (const requestFn of requests) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  };

  useEffect(() => {
    const fetchDigitalNid = async () => {
      try {
        setLoading(true);

        const response = await requestWithFallback([
          () => api.get(`/applications/${id}`),
          () => api.get(`/applications/my/${id}`),
          () => api.get(`/users/profile`)
        ]);

        const responseData =
          response?.data?.application ||
          response?.data?.data ||
          response?.data?.user ||
          response?.data ||
          {};

        setDigitalNidData(responseData);
      } catch (error) {
        console.error('Error fetching digital NID data:', error);
        toast.error(
          error?.response?.data?.message || 'Failed to load digital NID'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDigitalNid();
  }, [id]);

  const applicant = useMemo(() => {
    if (!digitalNidData) return {};

    return (
      digitalNidData.userId ||
      digitalNidData.user ||
      digitalNidData.applicant ||
      digitalNidData
    );
  }, [digitalNidData]);

  const presentAddress = applicant?.presentAddress || {};
  const fullAddress = [
    presentAddress?.village,
    presentAddress?.union,
    presentAddress?.upazila,
    presentAddress?.district,
    presentAddress?.division
  ]
    .filter(Boolean)
    .join(', ');

  const generatedNidNumber =
    digitalNidData?.nidNumber ||
    applicant?.nidNumber ||
    digitalNidData?.smartNidNumber ||
    'Pending';

  const applicantName =
    applicant?.fullName || digitalNidData?.fullName || 'N/A';

  const applicantNameBangla =
    applicant?.fullNameBangla || digitalNidData?.fullNameBangla || 'N/A';

  const applicantDob =
    applicant?.dateOfBirth || digitalNidData?.dateOfBirth || '';

  const applicantPhone =
    applicant?.mobile || applicant?.phone || digitalNidData?.mobile || 'N/A';

  const applicantEmail =
    applicant?.email || digitalNidData?.email || 'N/A';

  const applicantPhoto =
    digitalNidData?.documents?.photo ||
    applicant?.documents?.photo ||
    applicant?.photo ||
    '';

  const handleDownload = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="digital-nid-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8">
        <div className="digital-nid-container mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center">
          <div className="digital-nid-loading-card rounded-2xl bg-white px-8 py-10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="digital-nid-loading-inner flex flex-col items-center justify-center gap-4 text-center">
              <FaSpinner className="digital-nid-loading-spinner animate-spin text-3xl text-[#16A34A]" />
              <p className="digital-nid-loading-text text-base font-medium text-[#374151]">
                Loading Digital NID...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!digitalNidData) {
    return (
      <div className="digital-nid-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8">
        <div className="digital-nid-container mx-auto max-w-4xl">
          <div className="digital-nid-empty-card rounded-2xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <h2 className="digital-nid-empty-title mb-3 text-2xl font-bold text-[#1F2937]">
              Digital NID Not Available
            </h2>
            <p className="digital-nid-empty-text mb-6 text-[#6B7280]">
              We could not find any digital NID information for this record.
            </p>
            <Link
              to="/dashboard"
              className="digital-nid-back-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
            >
              <FaArrowLeft />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="digital-nid-page-wrapper min-h-[calc(100vh-140px)] bg-[linear-gradient(135deg,#F0FDF4_0%,#DCFCE7_100%)] px-4 py-8">
      <div className="digital-nid-container mx-auto max-w-6xl">
        {/* Top actions */}
        <div className="digital-nid-topbar mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/dashboard"
            className="digital-nid-back-link inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          >
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={handleDownload}
            className="digital-nid-download-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
          >
            <FaDownload />
            <span>Download / Print</span>
          </button>
        </div>

        <div className="digital-nid-layout grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Main card area */}
          <div className="digital-nid-main-panel rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="digital-nid-header-block mb-6 flex items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
              <div>
                <h1 className="digital-nid-page-title text-2xl font-bold text-[#1F2937]">
                  Digital Smart NID
                </h1>
                <p className="digital-nid-page-subtitle mt-1 text-sm text-[#6B7280]">
                  Secure digital version of your National ID information
                </p>
              </div>

              <div className="digital-nid-verified-badge inline-flex items-center gap-2 rounded-full bg-[#ECFDF5] px-4 py-2 text-sm font-semibold text-[#166534]">
                <FaShieldAlt />
                <span>Verified</span>
              </div>
            </div>

            {/* Card preview */}
            <div className="digital-nid-card-shell mx-auto max-w-3xl rounded-[24px] bg-[linear-gradient(135deg,#065F46_0%,#16A34A_100%)] p-5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
              <div className="digital-nid-card-panel rounded-[20px] border border-white/20 bg-white/10 p-5 backdrop-blur-[2px]">
                <div className="digital-nid-card-header mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="digital-nid-card-country text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                      People&apos;s Republic of Bangladesh
                    </p>
                    <h2 className="digital-nid-card-title mt-2 flex items-center gap-2 text-xl font-bold">
                      <FaIdCard />
                      <span>Smart National ID Card</span>
                    </h2>
                  </div>

                  <div className="digital-nid-card-chip rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                    Digital Copy
                  </div>
                </div>

                <div className="digital-nid-card-body grid gap-5 md:grid-cols-[120px_1fr_110px]">
                  <div className="digital-nid-photo-box flex h-[140px] w-[120px] items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/15">
                    {applicantPhoto ? (
                      <img
                        src={applicantPhoto}
                        alt={applicantName}
                        className="digital-nid-photo h-full w-full object-cover"
                      />
                    ) : (
                      <div className="digital-nid-photo-placeholder flex flex-col items-center justify-center gap-2 text-white/80">
                        <FaUser className="text-3xl" />
                        <span className="text-xs">No Photo</span>
                      </div>
                    )}
                  </div>

                  <div className="digital-nid-info-block grid gap-3">
                    <div>
                      <p className="digital-nid-info-label text-[11px] uppercase tracking-wide text-white/70">
                        Name
                      </p>
                      <p className="digital-nid-info-value text-base font-semibold">
                        {applicantName}
                      </p>
                    </div>

                    <div>
                      <p className="digital-nid-info-label text-[11px] uppercase tracking-wide text-white/70">
                        নাম
                      </p>
                      <p className="digital-nid-info-value text-base font-semibold">
                        {applicantNameBangla}
                      </p>
                    </div>

                    <div className="digital-nid-info-grid grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="digital-nid-info-label text-[11px] uppercase tracking-wide text-white/70">
                          Date of Birth
                        </p>
                        <p className="digital-nid-info-value text-sm font-medium">
                          {applicantDob ? formatDate(applicantDob) : 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="digital-nid-info-label text-[11px] uppercase tracking-wide text-white/70">
                          NID Number
                        </p>
                        <p className="digital-nid-info-value text-sm font-bold tracking-wide">
                          {generatedNidNumber}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="digital-nid-info-label text-[11px] uppercase tracking-wide text-white/70">
                        Address
                      </p>
                      <p className="digital-nid-info-value text-sm font-medium leading-6">
                        {fullAddress || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="digital-nid-qr-box flex flex-col items-center justify-between">
                    <div className="digital-nid-qr-card flex h-[110px] w-[110px] items-center justify-center rounded-2xl border border-white/20 bg-white text-[#166534] shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
                      <FaQrcode className="text-6xl" />
                    </div>
                    <span className="digital-nid-qr-text mt-3 text-center text-[11px] uppercase tracking-wide text-white/75">
                      QR Verification
                    </span>
                  </div>
                </div>

                <div className="digital-nid-card-footer mt-5 border-t border-white/15 pt-4 text-xs text-white/80">
                  <p>
                    This digital copy can be used for identity verification where
                    accepted by the authority.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Side info */}
          <div className="digital-nid-side-panel space-y-6">
            <div className="digital-nid-info-card rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
              <h3 className="digital-nid-section-title mb-4 text-lg font-bold text-[#1F2937]">
                Holder Information
              </h3>

              <div className="digital-nid-detail-list space-y-4">
                <div className="digital-nid-detail-item flex items-start gap-3">
                  <div className="digital-nid-detail-icon mt-1 text-[#16A34A]">
                    <FaUser />
                  </div>
                  <div>
                    <p className="digital-nid-detail-label text-xs uppercase tracking-wide text-[#6B7280]">
                      Full Name
                    </p>
                    <p className="digital-nid-detail-value text-sm font-medium text-[#1F2937]">
                      {applicantName}
                    </p>
                  </div>
                </div>

                <div className="digital-nid-detail-item flex items-start gap-3">
                  <div className="digital-nid-detail-icon mt-1 text-[#16A34A]">
                    <FaPhoneAlt />
                  </div>
                  <div>
                    <p className="digital-nid-detail-label text-xs uppercase tracking-wide text-[#6B7280]">
                      Mobile
                    </p>
                    <p className="digital-nid-detail-value text-sm font-medium text-[#1F2937]">
                      {applicantPhone}
                    </p>
                  </div>
                </div>

                <div className="digital-nid-detail-item flex items-start gap-3">
                  <div className="digital-nid-detail-icon mt-1 text-[#16A34A]">
                    <FaEnvelope />
                  </div>
                  <div>
                    <p className="digital-nid-detail-label text-xs uppercase tracking-wide text-[#6B7280]">
                      Email
                    </p>
                    <p className="digital-nid-detail-value text-sm font-medium text-[#1F2937] break-all">
                      {applicantEmail}
                    </p>
                  </div>
                </div>

                <div className="digital-nid-detail-item flex items-start gap-3">
                  <div className="digital-nid-detail-icon mt-1 text-[#16A34A]">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <p className="digital-nid-detail-label text-xs uppercase tracking-wide text-[#6B7280]">
                      Present Address
                    </p>
                    <p className="digital-nid-detail-value text-sm font-medium leading-6 text-[#1F2937]">
                      {fullAddress || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="digital-nid-note-card rounded-2xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
              <h3 className="digital-nid-section-title mb-3 text-lg font-bold text-[#1F2937]">
                Important Note
              </h3>
              <ul className="digital-nid-note-list list-disc space-y-2 pl-5 text-sm leading-7 text-[#6B7280]">
                <li>Digital NID is generated from your approved application data.</li>
                <li>Always verify important details before using this copy.</li>
                <li>Use the print button for a clean downloadable version.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalNID;