import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaIdCard,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhoneAlt,
  FaSpinner,
  FaTruck
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { useLanguage } from '../context/LanguageContext';
import { formatStatus } from '../utils/helpers';
import '../styles/DeliveryPayment.css';

const DELIVERY_FEE = 80;

const DELIVERY_PAYMENT_COPY = {
  en: {
    loading: 'Loading delivery payment...',
    backToDashboard: 'Back to dashboard',
    eyebrow: 'Smart NID Delivery',
    title: 'Delivery payment',
    subtitle:
      'Complete the delivery request to receive your printed NID card at your address.',
    feeLabel: 'Delivery fee',
    summaryTitle: 'Application summary',
    summarySubtitle: 'Review the application before requesting delivery.',
    applicationId: 'Application ID',
    applicationType: 'Application Type',
    currentStatus: 'Current stage',
    printedOn: 'Printed on',
    requestReceivedTitle: 'Delivery request received',
    requestReceivedBody: 'Your delivery request has already been received.',
    dispatchedTitle: 'Card dispatched',
    dispatchedBody: 'Your card has been dispatched.',
    unavailableTitle: 'Payment not available',
    unavailableBody: 'Delivery payment is available after your card is printed.',
    demoTitle: 'Demo payment',
    demoBody: 'Demo payment: no real money will be charged.',
    detailsTitle: 'Payment and delivery details',
    detailsSubtitle: 'Confirm the delivery address and payment reference.',
    deliveryAddress: 'Delivery address',
    contactPhone: 'Contact phone',
    paymentMethod: 'Payment method',
    transactionId: 'Transaction ID / reference',
    optionalNote: 'Optional note',
    addressPlaceholder: 'Enter full delivery address',
    phonePlaceholder: 'Enter delivery contact phone',
    transactionPlaceholder: 'Auto generated if empty',
    notePlaceholder: 'Add delivery instruction if needed',
    trackApplication: 'Track application',
    processing: 'Processing...',
    requestSubmitted: 'Request submitted',
    primaryTitleAvailable: 'Pay delivery fee and request delivery',
    primaryTitleUnavailable: 'Delivery payment is not available',
    addressRequired: 'Delivery address is required',
    phoneRequired: 'Contact phone is required',
    alreadySubmittedToast: 'Your delivery request has already been received.',
    notPrintedToast: 'Delivery payment is available after your card is printed.',
    successToast: 'Delivery request received.',
    failedLoad: 'Failed to load application',
    failedPayment: 'Failed to complete payment',
    paymentMethods: {
      bkash: 'bKash demo',
      nagad: 'Nagad demo',
      rocket: 'Rocket demo',
      card: 'Card demo',
      mock: 'Demo payment'
    }
  },
  bn: {
    loading: 'ডেলিভারি পেমেন্ট লোড হচ্ছে...',
    backToDashboard: 'ড্যাশবোর্ডে ফিরুন',
    eyebrow: 'স্মার্ট এনআইডি ডেলিভারি',
    title: 'ডেলিভারি পেমেন্ট',
    subtitle:
      'আপনার প্রিন্ট করা এনআইডি কার্ড ঠিকানায় পেতে ডেলিভারি অনুরোধ সম্পন্ন করুন।',
    feeLabel: 'ডেলিভারি ফি',
    summaryTitle: 'আবেদনের সংক্ষিপ্ত তথ্য',
    summarySubtitle: 'ডেলিভারি অনুরোধের আগে আবেদনটি পর্যালোচনা করুন।',
    applicationId: 'আবেদন আইডি',
    applicationType: 'আবেদনের ধরন',
    currentStatus: 'বর্তমান ধাপ',
    printedOn: 'প্রিন্টের তারিখ',
    requestReceivedTitle: 'ডেলিভারি অনুরোধ গ্রহণ করা হয়েছে',
    requestReceivedBody: 'আপনার ডেলিভারি অনুরোধ ইতিমধ্যে গ্রহণ করা হয়েছে।',
    dispatchedTitle: 'কার্ড পাঠানো হয়েছে',
    dispatchedBody: 'আপনার কার্ড পাঠানো হয়েছে।',
    unavailableTitle: 'পেমেন্ট এখনো চালু নয়',
    unavailableBody: 'কার্ড প্রিন্ট সম্পন্ন হলে ডেলিভারি পেমেন্ট করা যাবে।',
    demoTitle: 'ডেমো পেমেন্ট',
    demoBody: 'ডেমো পেমেন্ট: কোনো বাস্তব অর্থ কাটা হবে না।',
    detailsTitle: 'পেমেন্ট ও ডেলিভারি তথ্য',
    detailsSubtitle: 'ডেলিভারি ঠিকানা ও পেমেন্ট রেফারেন্স নিশ্চিত করুন।',
    deliveryAddress: 'ডেলিভারি ঠিকানা',
    contactPhone: 'যোগাযোগের ফোন নম্বর',
    paymentMethod: 'পেমেন্ট পদ্ধতি',
    transactionId: 'ট্রানজ্যাকশন আইডি / রেফারেন্স',
    optionalNote: 'ঐচ্ছিক নোট',
    addressPlaceholder: 'সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন',
    phonePlaceholder: 'ডেলিভারির যোগাযোগ নম্বর লিখুন',
    transactionPlaceholder: 'খালি থাকলে স্বয়ংক্রিয়ভাবে তৈরি হবে',
    notePlaceholder: 'প্রয়োজন হলে ডেলিভারি নির্দেশনা লিখুন',
    trackApplication: 'আবেদন ট্র্যাক করুন',
    processing: 'প্রক্রিয়াধীন...',
    requestSubmitted: 'অনুরোধ জমা হয়েছে',
    primaryTitleAvailable: 'ডেলিভারি ফি পরিশোধ করে অনুরোধ করুন',
    primaryTitleUnavailable: 'ডেলিভারি পেমেন্ট এখন চালু নয়',
    addressRequired: 'ডেলিভারি ঠিকানা প্রয়োজন',
    phoneRequired: 'যোগাযোগের ফোন নম্বর প্রয়োজন',
    alreadySubmittedToast: 'আপনার ডেলিভারি অনুরোধ ইতিমধ্যে গ্রহণ করা হয়েছে।',
    notPrintedToast: 'কার্ড প্রিন্ট সম্পন্ন হলে ডেলিভারি পেমেন্ট করা যাবে।',
    successToast: 'ডেলিভারি অনুরোধ গ্রহণ করা হয়েছে।',
    failedLoad: 'আবেদন লোড করা যায়নি',
    failedPayment: 'পেমেন্ট সম্পন্ন করা যায়নি',
    paymentMethods: {
      bkash: 'বিকাশ ডেমো',
      nagad: 'নগদ ডেমো',
      rocket: 'রকেট ডেমো',
      card: 'কার্ড ডেমো',
      mock: 'ডেমো পেমেন্ট'
    }
  }
};

const STATUS_LABELS_BN = {
  draft: 'খসড়া',
  pending: 'অপেক্ষমাণ',
  submitted: 'জমা দেওয়া হয়েছে',
  under_review: 'পর্যালোচনাধীন',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
  printing: 'প্রিন্টিং পর্যায়ে',
  printed: 'প্রিন্ট সম্পন্ন',
  dispatched: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভারি সম্পন্ন'
};

const APPLICATION_TYPE_LABELS = {
  en: {
    new: 'New NID',
    correction: 'Correction',
    duplicate: 'Duplicate NID',
    renewal: 'Renewal'
  },
  bn: {
    new: 'নতুন এনআইডি',
    correction: 'সংশোধন',
    duplicate: 'ডুপ্লিকেট এনআইডি',
    renewal: 'নবায়ন'
  }
};

const formatDeliveryFee = (amount, language) => {
  const numericAmount = Number(amount) || DELIVERY_FEE;
  const locale = language === 'bn' ? 'bn-BD' : 'en-US';

  return `৳${numericAmount.toLocaleString(locale)}`;
};

const formatLocalizedDate = (value, language) => {
  if (!value) return '';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDisplayStatus = (status, language) => {
  if (language === 'bn') {
    return STATUS_LABELS_BN[status] || formatStatus(status);
  }

  return formatStatus(status);
};

const formatApplicationType = (applicationType, language) => {
  const normalizedType = String(applicationType || 'new').toLowerCase();
  const typeLabels = APPLICATION_TYPE_LABELS[language] || APPLICATION_TYPE_LABELS.en;

  return (
    typeLabels[normalizedType] ||
    normalizedType
      .replace(/-/g, '_')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
};

const buildAddressText = (address = {}) =>
  [
    address.villageOrArea,
    address.unionOrWard,
    address.upazila,
    address.district,
    address.division,
    address.postalCode
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(', ');

const isPaymentCompleted = (application) =>
  ['paid', 'waived'].includes(application?.deliveryInfo?.paymentStatus);

const DeliveryPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const languageKey = language === 'bn' ? 'bn' : 'en';
  const copy = DELIVERY_PAYMENT_COPY[languageKey];

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    paymentMethod: 'bkash',
    transactionId: '',
    deliveryAddress: '',
    contactPhone: '',
    note: ''
  });

  const defaultDeliveryAddress = useMemo(() => {
    if (!application) return '';

    return (
      application.deliveryInfo?.deliveryAddress ||
      buildAddressText(application.permanentAddress) ||
      buildAddressText(application.presentAddress)
    );
  }, [application]);

  const deliveryInfo = application?.deliveryInfo || {};
  const currentStatus = String(application?.status || '').toLowerCase();
  const currentDeliveryStatus = String(deliveryInfo.deliveryStatus || '').toLowerCase();
  const paymentCompleted = isPaymentCompleted(application);
  const deliveryRequestReceived = Boolean(deliveryInfo.requested) || paymentCompleted;
  const deliveryDispatched =
    ['dispatched', 'delivered'].includes(currentStatus) ||
    ['dispatched', 'delivered'].includes(currentDeliveryStatus);
  const canPayForDelivery = currentStatus === 'printed' && !deliveryRequestReceived;
  const deliveryFee = deliveryInfo.deliveryFee || DELIVERY_FEE;
  const deliveryFeeText = formatDeliveryFee(deliveryFee, languageKey);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/applications/${id}`);
        const applicationData = response?.data?.application || null;

        setApplication(applicationData);

        if (applicationData) {
          setFormData((current) => ({
            ...current,
            paymentMethod: applicationData.deliveryInfo?.paymentMethod || 'bkash',
            transactionId: applicationData.deliveryInfo?.transactionId || '',
            deliveryAddress:
              applicationData.deliveryInfo?.deliveryAddress ||
              buildAddressText(applicationData.permanentAddress) ||
              buildAddressText(applicationData.presentAddress) ||
              '',
            contactPhone:
              applicationData.deliveryInfo?.contactPhone || applicationData.phone || '',
            note: applicationData.deliveryInfo?.note || ''
          }));
        }
      } catch (error) {
        console.error('Error loading delivery payment:', error);
        toast.error(error?.response?.data?.message || copy.failedLoad);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [copy.failedLoad, id, navigate]);

  useEffect(() => {
    if (!application || formData.deliveryAddress) return;

    setFormData((current) => ({
      ...current,
      deliveryAddress: defaultDeliveryAddress
    }));
  }, [application, defaultDeliveryAddress, formData.deliveryAddress]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));

    if (fieldErrors[name]) {
      setFieldErrors((current) => ({
        ...current,
        [name]: ''
      }));
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!canPayForDelivery) {
      toast.info(
        deliveryRequestReceived ? copy.alreadySubmittedToast : copy.notPrintedToast
      );
      return;
    }

    const nextFieldErrors = {};

    if (!formData.contactPhone.trim()) {
      nextFieldErrors.contactPhone = copy.phoneRequired;
    }

    if (!formData.deliveryAddress.trim()) {
      nextFieldErrors.deliveryAddress = copy.addressRequired;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      toast.error(nextFieldErrors.deliveryAddress || nextFieldErrors.contactPhone);
      return;
    }

    try {
      setSubmitting(true);
      setFieldErrors({});

      const response = await api.patch(`/applications/${id}/delivery-payment`, {
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId.trim(),
        deliveryAddress: formData.deliveryAddress.trim(),
        contactPhone: formData.contactPhone.trim(),
        note: formData.note.trim()
      });

      const updatedApplication = response?.data?.application;

      if (updatedApplication) {
        setApplication(updatedApplication);
      }

      toast.success(copy.successToast);
    } catch (error) {
      console.error('Delivery payment failed:', error);
      toast.error(error?.response?.data?.message || copy.failedPayment);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="delivery-payment-loading">
        <Loader size="large" text={copy.loading} />
      </div>
    );
  }

  if (!application) {
    return null;
  }

  return (
    <div className="delivery-payment-page">
      <div className="delivery-payment-shell">
        <div className="delivery-payment-header">
          <Link to="/dashboard" className="delivery-payment-back-link">
            <FaArrowLeft />
            <span>{copy.backToDashboard}</span>
          </Link>

          <div className="delivery-payment-title-row">
            <div>
              <span className="delivery-payment-eyebrow">{copy.eyebrow}</span>
              <h1>{copy.title}</h1>
              <p>{copy.subtitle}</p>
            </div>

            <div className="delivery-payment-fee-card">
              <span>{copy.feeLabel}</span>
              <strong>{deliveryFeeText}</strong>
            </div>
          </div>
        </div>

        <div className="delivery-payment-grid">
          <section className="delivery-payment-card delivery-payment-summary-card">
            <div className="delivery-payment-card-heading">
              <div className="delivery-payment-heading-icon">
                <FaIdCard />
              </div>
              <div>
                <h2>{copy.summaryTitle}</h2>
                <p>{copy.summarySubtitle}</p>
              </div>
            </div>

            <div className="delivery-payment-summary-list">
              <div>
                <span>{copy.applicationId}</span>
                <strong>#{application.applicationId}</strong>
              </div>
              <div>
                <span>{copy.applicationType}</span>
                <strong>{formatApplicationType(application.applicationType, languageKey)}</strong>
              </div>
              <div>
                <span>{copy.currentStatus}</span>
                <strong className={`delivery-payment-status status-${application.status}`}>
                  {formatDisplayStatus(application.status, languageKey)}
                </strong>
              </div>
              {application.printedAt && (
                <div>
                  <span>{copy.printedOn}</span>
                  <strong>{formatLocalizedDate(application.printedAt, languageKey)}</strong>
                </div>
              )}
            </div>

            {deliveryDispatched ? (
              <div className="delivery-payment-success-box">
                <FaTruck />
                <div>
                  <h3>{copy.dispatchedTitle}</h3>
                  <p>{copy.dispatchedBody}</p>
                  {deliveryInfo.transactionId && (
                    <small>
                      {copy.transactionId}: {deliveryInfo.transactionId}
                    </small>
                  )}
                </div>
              </div>
            ) : deliveryRequestReceived ? (
              <div className="delivery-payment-success-box">
                <FaCheckCircle />
                <div>
                  <h3>{copy.requestReceivedTitle}</h3>
                  <p>{copy.requestReceivedBody}</p>
                  {deliveryInfo.transactionId && (
                    <small>
                      {copy.transactionId}: {deliveryInfo.transactionId}
                    </small>
                  )}
                </div>
              </div>
            ) : currentStatus !== 'printed' ? (
              <div className="delivery-payment-warning-box">
                <FaTruck />
                <div>
                  <h3>{copy.unavailableTitle}</h3>
                  <p>{copy.unavailableBody}</p>
                </div>
              </div>
            ) : (
              <div className="delivery-payment-info-box">
                <FaMoneyBillWave />
                <div>
                  <h3>{copy.demoTitle}</h3>
                  <p>{copy.demoBody}</p>
                </div>
              </div>
            )}
          </section>

          <section className="delivery-payment-card delivery-payment-form-card">
            <div className="delivery-payment-card-heading">
              <div className="delivery-payment-heading-icon">
                <FaCreditCard />
              </div>
              <div>
                <h2>{copy.detailsTitle}</h2>
                <p>{copy.detailsSubtitle}</p>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="delivery-payment-form">
              <label>
                <span>
                  <FaMapMarkerAlt /> {copy.deliveryAddress}
                </span>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  placeholder={copy.addressPlaceholder}
                  disabled={!canPayForDelivery || submitting}
                  rows="4"
                  required
                />
                {fieldErrors.deliveryAddress && (
                  <small className="delivery-payment-field-error" role="alert">
                    {fieldErrors.deliveryAddress}
                  </small>
                )}
              </label>

              <label>
                <span>
                  <FaPhoneAlt /> {copy.contactPhone}
                </span>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder={copy.phonePlaceholder}
                  disabled={!canPayForDelivery || submitting}
                  required
                />
                {fieldErrors.contactPhone && (
                  <small className="delivery-payment-field-error" role="alert">
                    {fieldErrors.contactPhone}
                  </small>
                )}
              </label>

              <label>
                <span>{copy.paymentMethod}</span>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  disabled={!canPayForDelivery || submitting}
                >
                  <option value="bkash">{copy.paymentMethods.bkash}</option>
                  <option value="nagad">{copy.paymentMethods.nagad}</option>
                  <option value="rocket">{copy.paymentMethods.rocket}</option>
                  <option value="card">{copy.paymentMethods.card}</option>
                  <option value="mock">{copy.paymentMethods.mock}</option>
                </select>
              </label>

              <label>
                <span>{copy.transactionId}</span>
                <input
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleChange}
                  placeholder={copy.transactionPlaceholder}
                  disabled={!canPayForDelivery || submitting}
                />
              </label>

              <label>
                <span>{copy.optionalNote}</span>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder={copy.notePlaceholder}
                  disabled={!canPayForDelivery || submitting}
                  rows="3"
                />
              </label>

              <div className="delivery-payment-actions">
                <Link to={`/track-application?id=${application._id}`} className="delivery-payment-secondary-btn">
                  {copy.trackApplication}
                </Link>

                <button
                  type="submit"
                  className="delivery-payment-primary-btn"
                  disabled={!canPayForDelivery || submitting}
                  title={
                    canPayForDelivery
                      ? copy.primaryTitleAvailable
                      : copy.primaryTitleUnavailable
                  }
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="delivery-payment-spin" />
                      {copy.processing}
                    </>
                  ) : deliveryRequestReceived ? (
                    <>
                      <FaCheckCircle />
                      {copy.requestSubmitted}
                    </>
                  ) : (
                    <>
                      <FaMoneyBillWave />
                      {languageKey === 'bn'
                        ? `${deliveryFeeText} পরিশোধ করে ডেলিভারি অনুরোধ করুন`
                        : `Pay ${deliveryFeeText} and request delivery`}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPayment;
