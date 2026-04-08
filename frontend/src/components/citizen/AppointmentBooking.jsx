// Appointment Booking Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaArrowLeft,
  FaArrowRight,
  FaIdCard
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatDate, formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/AppointmentBooking.css';

const AppointmentBooking = () => {
  // Route and page state
  const navigate = useNavigate();
  const { applicationId } = useParams();

  const [application, setApplication] = useState(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [appointment, setAppointment] = useState(null);

  // Static time slots
  const timeSlots = useMemo(
    () => [
      '09:00 AM - 09:30 AM',
      '09:30 AM - 10:00 AM',
      '10:00 AM - 10:30 AM',
      '10:30 AM - 11:00 AM',
      '11:00 AM - 11:30 AM',
      '11:30 AM - 12:00 PM',
      '02:00 PM - 02:30 PM',
      '02:30 PM - 03:00 PM',
      '03:00 PM - 03:30 PM',
      '03:30 PM - 04:00 PM'
    ],
    []
  );

  // Load application and available centers
  useEffect(() => {
    fetchInitialData();
  }, [applicationId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [applicationResponse, centersResponse] = await Promise.all([
        api.get(`/applications/${applicationId}`),
        api.get('/appointments/centers')
      ]);

      const applicationData = applicationResponse?.data?.application;
      const centerList = centersResponse?.data?.centers || [];

      setApplication(applicationData);
      setCenters(centerList);
    } catch (error) {
      console.error('Error fetching appointment booking data:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load appointment booking page'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCenterSelect = (center) => {
    setSelectedCenter(center);
    setSelectedSlot('');
    setBookingStep(2);
  };

  const handleContinueToConfirm = () => {
    if (!selectedDate || !selectedSlot) {
      toast.error('Please select appointment date and time slot');
      return;
    }

    setBookingStep(3);
  };

  // Final appointment booking request
  const handleBookingConfirm = async () => {
    if (!applicationId || !selectedCenter || !selectedDate || !selectedSlot) {
      toast.error('Please complete all booking information');
      return;
    }

    setBookingLoading(true);

    try {
      const bookingData = {
        applicationId,
        appointmentDate: selectedDate,
        timeSlot: selectedSlot,
        centerName: selectedCenter.name,
        centerDistrict: selectedCenter.district,
        notes: notes || ''
      };

      const response = await api.post('/appointments', bookingData);
      const createdAppointment = response?.data?.appointment;

      setAppointment(createdAppointment);
      toast.success('Appointment booked successfully!');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to book appointment'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBack = () => {
    if (bookingStep > 1) {
      setBookingStep((prev) => prev - 1);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const isApplicationApproved = application?.status === 'approved';

  // Loading state
  if (loading) {
    return (
      <div className="appointment-booking-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text="Loading appointment booking..." />
      </div>
    );
  }

  // Invalid application state
  if (!application) {
    return (
      <div className="appointment-booking-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
        <div className="appointment-booking-shell mx-auto max-w-[920px]">
          <div className="appointment-booking-empty rounded-2xl bg-white p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <FaExclamationTriangle className="mx-auto mb-4 text-4xl text-red-500" />
            <h2 className="mb-2 text-2xl font-bold text-[#1F2937]">
              Application not found
            </h2>
            <p className="mb-6 text-[#6B7280]">
              We could not find the selected application for appointment booking.
            </p>
            <button
              type="button"
              className="inline-flex items-center rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
              onClick={() => navigate('/track-application')}
            >
              Back to Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only approved applications can book appointments
  if (!isApplicationApproved && !appointment) {
    return (
      <div className="appointment-booking-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
        <div className="appointment-booking-shell mx-auto max-w-[920px]">
          <div className="appointment-booking-alert rounded-2xl bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-500">
                <FaExclamationTriangle />
              </div>
              <div>
                <h2 className="mb-2 text-2xl font-bold text-[#1F2937]">
                  Appointment not available yet
                </h2>
                <p className="text-[#6B7280]">
                  You can only book an appointment after your application is approved.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
              <h3 className="mb-3 text-lg font-semibold text-[#1F2937]">
                Application Summary
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-[#6B7280]">Application ID</p>
                  <p className="font-semibold text-[#1F2937]">
                    {application.applicationId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">Current Status</p>
                  <span className={`badge badge-${getStatusColor(application.status)}`}>
                    {formatStatus(application.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                onClick={() => navigate('/track-application')}
              >
                Track Application
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 1: center selection
  const renderStep1 = () => (
    <div className="appointment-booking-step space-y-6">
      <div className="appointment-booking-section-header">
        <h3 className="text-xl font-semibold text-[#1F2937]">
          <span className="inline-flex items-center gap-2">
            <FaMapMarkerAlt className="text-[#16A34A]" />
            Select a Center
          </span>
        </h3>
        <p className="mt-2 text-[#6B7280]">
          Choose your preferred biometric enrollment center.
        </p>
      </div>

      <div className="appointment-booking-centers-grid grid gap-5 md:grid-cols-2">
        {centers.map((center) => (
          <button
            key={center._id}
            type="button"
            className={`appointment-booking-center-card text-left rounded-xl border bg-white p-5 transition ${
              selectedCenter?._id === center._id
                ? 'border-[#16A34A] shadow-[0_4px_12px_rgba(22,163,74,0.12)]'
                : 'border-[#E5E7EB] hover:border-[#16A34A]'
            }`}
            onClick={() => handleCenterSelect(center)}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0FDF4] text-xl text-[#16A34A]">
              <FaMapMarkerAlt />
            </div>

            <h4 className="mb-2 text-lg font-semibold text-[#1F2937]">
              {center.name}
            </h4>
            <p className="mb-2 text-sm text-[#6B7280]">{center.address}</p>
            <p className="mb-2 text-sm text-[#6B7280]">
              District: {center.district}
            </p>
            <p className="text-sm text-[#6B7280]">
              Daily Capacity: {center.dailyCapacity || 'N/A'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  // Step 2: date and slot selection
  const renderStep2 = () => (
    <div className="appointment-booking-step space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="appointment-booking-back-button inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          onClick={handleBack}
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>

        <div className="text-right">
          <h3 className="text-xl font-semibold text-[#1F2937]">
            <span className="inline-flex items-center gap-2">
              <FaCalendarAlt className="text-[#16A34A]" />
              Choose Date & Time
            </span>
          </h3>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
        <h4 className="mb-2 text-lg font-semibold text-[#1F2937]">
          {selectedCenter?.name}
        </h4>
        <p className="text-sm text-[#6B7280]">{selectedCenter?.address}</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          District: {selectedCenter?.district}
        </p>
      </div>

      <div className="appointment-booking-date-section">
        <label className="mb-2 block text-sm font-medium text-[#374151]">
          Appointment Date *
        </label>
        <input
          type="date"
          min={today}
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="appointment-booking-date-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
        />
      </div>

      <div className="appointment-booking-slot-section">
        <h4 className="mb-4 text-lg font-semibold text-[#1F2937]">
          Available Time Slots
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`appointment-booking-slot-card rounded-xl border px-4 py-4 text-left transition ${
                selectedSlot === slot
                  ? 'border-[#16A34A] bg-[#F0FDF4]'
                  : 'border-[#E5E7EB] bg-white hover:border-[#16A34A]'
              }`}
              onClick={() => setSelectedSlot(slot)}
            >
              <div className="mb-2 flex items-center gap-2 text-[#16A34A]">
                <FaClock />
                <span className="text-sm font-medium">Slot</span>
              </div>
              <p className="font-semibold text-[#1F2937]">{slot}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="appointment-booking-notes-section">
        <label className="mb-2 block text-sm font-medium text-[#374151]">
          Notes (Optional)
        </label>
        <textarea
          rows="4"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add any note for the appointment"
          className="appointment-booking-notes-input w-full rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="appointment-booking-next-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
          onClick={handleContinueToConfirm}
        >
          <span>Continue</span>
          <FaArrowRight />
        </button>
      </div>
    </div>
  );

  // Step 3: final confirmation
  const renderStep3 = () => (
    <div className="appointment-booking-step space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          className="appointment-booking-back-button inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          onClick={handleBack}
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>

        <div className="text-right">
          <h3 className="text-xl font-semibold text-[#1F2937]">
            <span className="inline-flex items-center gap-2">
              <FaCheckCircle className="text-[#16A34A]" />
              Confirm Appointment
            </span>
          </h3>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F0FDF4] text-3xl text-[#16A34A]">
          <FaCheckCircle />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-[#6B7280]">Application ID</p>
            <p className="font-semibold text-[#1F2937]">
              {application?.applicationId}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#6B7280]">Application Type</p>
            <p className="font-semibold text-[#1F2937]">
              {(application?.applicationType || 'N/A').toUpperCase()}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#6B7280]">Center</p>
            <p className="font-semibold text-[#1F2937]">{selectedCenter?.name}</p>
          </div>

          <div>
            <p className="text-sm text-[#6B7280]">District</p>
            <p className="font-semibold text-[#1F2937]">
              {selectedCenter?.district}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#6B7280]">Appointment Date</p>
            <p className="font-semibold text-[#1F2937]">{selectedDate}</p>
          </div>

          <div>
            <p className="text-sm text-[#6B7280]">Time Slot</p>
            <p className="font-semibold text-[#1F2937]">{selectedSlot}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-[#6B7280]">Notes</p>
            <p className="font-semibold text-[#1F2937]">{notes || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="appointment-booking-confirm-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleBookingConfirm}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <>
              <FaSpinner className="animate-spin" />
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <FaCheckCircle />
              <span>Confirm Appointment</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="appointment-booking-page appointment-booking-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="appointment-booking-shell mx-auto w-full max-w-[960px]">
        {!appointment ? (
          <>
            <div className="appointment-booking-header mb-8 rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="mb-2 text-[1.9rem] font-bold text-[#1F2937]">
                    Appointment Booking
                  </h1>
                  <p className="text-[#6B7280]">
                    Book your biometric appointment for Smart NID processing.
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                  onClick={() => navigate('/track-application')}
                >
                  <FaArrowLeft />
                  <span>Back to Applications</span>
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="mb-1 text-sm text-[#6B7280]">Application</p>
                  <p className="font-semibold text-[#1F2937]">
                    {application.applicationId}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="mb-1 text-sm text-[#6B7280]">Applicant</p>
                  <p className="font-semibold text-[#1F2937]">
                    {application.fullNameEnglish}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F9FAFB] p-4">
                  <p className="mb-1 text-sm text-[#6B7280]">Status</p>
                  <span className={`badge badge-${getStatusColor(application.status)}`}>
                    {formatStatus(application.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="appointment-booking-progress mb-8 flex items-center justify-center gap-3 overflow-x-auto px-1">
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${bookingStep >= 1 ? 'bg-[#16A34A] text-white' : 'bg-white text-[#6B7280]'}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  1
                </span>
                <span>Select Center</span>
              </div>
              <div className="h-[2px] w-10 bg-[#D1D5DB]" />
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${bookingStep >= 2 ? 'bg-[#16A34A] text-white' : 'bg-white text-[#6B7280]'}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  2
                </span>
                <span>Date & Time</span>
              </div>
              <div className="h-[2px] w-10 bg-[#D1D5DB]" />
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${bookingStep >= 3 ? 'bg-[#16A34A] text-white' : 'bg-white text-[#6B7280]'}`}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                  3
                </span>
                <span>Confirm</span>
              </div>
            </div>

            <div className="appointment-booking-card rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] sm:p-8">
              {bookingStep === 1 && renderStep1()}
              {bookingStep === 2 && renderStep2()}
              {bookingStep === 3 && renderStep3()}
            </div>
          </>
        ) : (
          <div className="appointment-booking-success-card rounded-2xl bg-white p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#F0FDF4] text-4xl text-[#16A34A]">
              <FaCheckCircle />
            </div>

            <h2 className="mb-2 text-3xl font-bold text-[#1F2937]">
              Appointment Confirmed!
            </h2>
            <p className="mb-8 text-[#6B7280]">
              Your biometric appointment has been booked successfully.
            </p>

            <div className="mx-auto mb-8 max-w-[640px] rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-6 text-left">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-[#6B7280]">Application</p>
                  <p className="font-semibold text-[#1F2937]">
                    {appointment?.application?.applicationId || application?.applicationId}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#6B7280]">Appointment Date</p>
                  <p className="font-semibold text-[#1F2937]">
                    {formatDate(appointment?.appointmentDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#6B7280]">Time Slot</p>
                  <p className="font-semibold text-[#1F2937]">{appointment?.timeSlot}</p>
                </div>

                <div>
                  <p className="text-sm text-[#6B7280]">Center</p>
                  <p className="font-semibold text-[#1F2937]">{appointment?.centerName}</p>
                </div>

                <div>
                  <p className="text-sm text-[#6B7280]">District</p>
                  <p className="font-semibold text-[#1F2937]">
                    {appointment?.centerDistrict || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#6B7280]">Status</p>
                  <span className={`badge badge-${getStatusColor(appointment?.status || 'booked')}`}>
                    {formatStatus(appointment?.status || 'booked')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-[#D1D5DB] bg-white px-5 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
                onClick={() => window.print()}
              >
                Print
              </button>

              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-[#16A34A] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#15803D]"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentBooking;
// Appointment Booking Page End