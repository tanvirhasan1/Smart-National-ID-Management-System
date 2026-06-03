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
import { formatDate, formatStatus } from '../utils/helpers';
import '../styles/DeliveryPayment.css';

const DELIVERY_FEE = 80;

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

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const paymentCompleted = isPaymentCompleted(application);
  const canPayForDelivery = application?.status === 'printed' && !paymentCompleted;

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
        toast.error(error?.response?.data?.message || 'Failed to load application');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id, navigate]);

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
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!canPayForDelivery) {
      toast.info(
        paymentCompleted
          ? 'Delivery request already submitted'
          : 'Delivery payment is available only after printing'
      );
      return;
    }

    if (!formData.deliveryAddress.trim()) {
      toast.error('Delivery address is required');
      return;
    }

    if (!formData.contactPhone.trim()) {
      toast.error('Contact phone is required');
      return;
    }

    try {
      setSubmitting(true);

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

      toast.success('Delivery payment completed successfully');
    } catch (error) {
      console.error('Delivery payment failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to complete payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="delivery-payment-loading">
        <Loader size="large" text="Loading delivery payment..." />
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
            <span>Back to dashboard</span>
          </Link>

          <div className="delivery-payment-title-row">
            <div>
              <span className="delivery-payment-eyebrow">Smart NID Delivery</span>
              <h1>Delivery Payment</h1>
              <p>
                Complete mock payment after the card is printed to request home delivery.
              </p>
            </div>

            <div className="delivery-payment-fee-card">
              <span>Delivery Fee</span>
              <strong>৳{application.deliveryInfo?.deliveryFee || DELIVERY_FEE}</strong>
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
                <h2>Application Summary</h2>
                <p>Review your printed application before payment.</p>
              </div>
            </div>

            <div className="delivery-payment-summary-list">
              <div>
                <span>Application ID</span>
                <strong>#{application.applicationId}</strong>
              </div>
              <div>
                <span>Application Type</span>
                <strong>{String(application.applicationType || 'new').toUpperCase()}</strong>
              </div>
              <div>
                <span>Current Status</span>
                <strong className={`delivery-payment-status status-${application.status}`}>
                  {formatStatus(application.status)}
                </strong>
              </div>
              <div>
                <span>Printed On</span>
                <strong>{application.printedAt ? formatDate(application.printedAt) : 'N/A'}</strong>
              </div>
            </div>

            {paymentCompleted ? (
              <div className="delivery-payment-success-box">
                <FaCheckCircle />
                <div>
                  <h3>Delivery request submitted</h3>
                  <p>
                    Payment is completed. Your Smart NID is waiting for admin dispatch.
                  </p>
                  {application.deliveryInfo?.transactionId && (
                    <small>Transaction ID: {application.deliveryInfo.transactionId}</small>
                  )}
                </div>
              </div>
            ) : application.status !== 'printed' ? (
              <div className="delivery-payment-warning-box">
                <FaTruck />
                <div>
                  <h3>Payment not available yet</h3>
                  <p>
                    Delivery payment will be available only when your application reaches
                    the Printed stage.
                  </p>
                </div>
              </div>
            ) : (
              <div className="delivery-payment-info-box">
                <FaMoneyBillWave />
                <div>
                  <h3>Mock academic payment</h3>
                  <p>
                    This payment is simulated for your academic prototype. No real money is
                    charged.
                  </p>
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
                <h2>Payment & Delivery Details</h2>
                <p>Confirm address and choose a mock payment method.</p>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="delivery-payment-form">
              <label>
                <span>Payment Method</span>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  disabled={!canPayForDelivery || submitting}
                >
                  <option value="bkash">bKash Mock</option>
                  <option value="nagad">Nagad Mock</option>
                  <option value="rocket">Rocket Mock</option>
                  <option value="card">Card Mock</option>
                  <option value="mock">Generic Mock Payment</option>
                </select>
              </label>

              <label>
                <span>Mock Transaction ID</span>
                <input
                  type="text"
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={handleChange}
                  placeholder="Auto generated if empty"
                  disabled={!canPayForDelivery || submitting}
                />
              </label>

              <label>
                <span>
                  <FaPhoneAlt /> Contact Phone
                </span>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  placeholder="Enter delivery contact phone"
                  disabled={!canPayForDelivery || submitting}
                  required
                />
              </label>

              <label>
                <span>
                  <FaMapMarkerAlt /> Delivery Address
                </span>
                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  placeholder="Enter full delivery address"
                  disabled={!canPayForDelivery || submitting}
                  rows="4"
                  required
                />
              </label>

              <label>
                <span>Note (optional)</span>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Example: Call before delivery"
                  disabled={!canPayForDelivery || submitting}
                  rows="3"
                />
              </label>

              <div className="delivery-payment-actions">
                <Link to={`/track-application?id=${application._id}`} className="delivery-payment-secondary-btn">
                  Track Application
                </Link>

                <button
                  type="submit"
                  className="delivery-payment-primary-btn"
                  disabled={!canPayForDelivery || submitting}
                  title={
                    canPayForDelivery
                      ? 'Complete payment and request delivery'
                      : 'Delivery payment is not available'
                  }
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="delivery-payment-spin" />
                      Processing...
                    </>
                  ) : paymentCompleted ? (
                    <>
                      <FaCheckCircle />
                      Request Submitted
                    </>
                  ) : (
                    <>
                      <FaMoneyBillWave />
                      Pay ৳{application.deliveryInfo?.deliveryFee || DELIVERY_FEE} & Request Delivery
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
