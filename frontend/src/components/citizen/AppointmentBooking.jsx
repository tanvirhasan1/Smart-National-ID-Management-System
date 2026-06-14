// Appointment Booking Page Start
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaIdCard,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaSpinner,
  FaSyncAlt,
  FaUsers
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { formatStatus, getStatusColor } from '../utils/helpers';
import '../styles/AppointmentBooking.css';

const formatDateKey = (dateKey) => {
  if (!dateKey) return 'N/A';

  const parsedDate = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return dateKey;

  return parsedDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getDayStatusLabel = (day) => {
  const labels = {
    available: `${day.remaining} left`,
    weekly_off: 'Off day',
    closed: 'Closed',
    full: 'Full',
    too_early: 'Too early',
    outside_window: 'Not open',
    not_configured: 'Not configured'
  };

  return labels[day?.status] || 'Unavailable';
};

const AppointmentBooking = () => {
  const navigate = useNavigate();
  const { applicationId } = useParams();

  const [application, setApplication] = useState(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [applicationId]);

  const isApplicationApproved = application?.status === 'approved';

  const calendarDays = availability?.calendarDays || [];
  const slots = availability?.slots || [];
  const selectedDay = availability?.selectedDay || null;

  const firstBookableDay = useMemo(() => {
    return calendarDays.find((day) => day.isBookable);
  }, [calendarDays]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [applicationResponse, centersResponse] = await Promise.all([
        api.get(`/applications/${applicationId}`),
        api.get('/appointments/centers')
      ]);

      setApplication(applicationResponse?.data?.application || null);
      setCenters(centersResponse?.data?.centers || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Appointment booking page could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async (centerId, dateKey = '') => {
    try {
      setAvailabilityLoading(true);

      const params = new URLSearchParams({
        centerId,
        days: '60'
      });

      if (dateKey) {
        params.set('date', dateKey);
      }

      const response = await api.get(`/appointments/availability?${params.toString()}`);
      const data = response?.data || null;

      setAvailability(data);

      const nextSelectedDate = data?.selectedDay?.dateKey || dateKey || '';
      setSelectedDate(nextSelectedDate);
      setSelectedSlot(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || 'Appointment availability could not be loaded.'
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleCenterSelect = async (center) => {
    setSelectedCenter(center);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailability(null);
    setBookingStep(2);
    await fetchAvailability(center._id);
  };

  const handleDateSelect = async (day) => {
    if (!day?.isBookable || !selectedCenter?._id) {
      return;
    }

    setSelectedDate(day.dateKey);
    setSelectedSlot(null);
    await fetchAvailability(selectedCenter._id, day.dateKey);
  };

  const handleRefreshAvailability = async () => {
    if (!selectedCenter?._id) return;
    await fetchAvailability(selectedCenter._id, selectedDate);
  };

  const handleContinueToConfirm = () => {
    if (!selectedCenter || !selectedDay?.isBookable || !selectedDate || !selectedSlot) {
      toast.error('Please select an available date and time slot.');
      return;
    }

    setBookingStep(3);
  };

  const handleBookingConfirm = async () => {
    if (!applicationId || !selectedCenter || !selectedDate || !selectedSlot) {
      toast.error('Please complete all booking information.');
      return;
    }

    try {
      setBookingLoading(true);

      const response = await api.post('/appointments', {
        applicationId,
        centerId: selectedCenter._id,
        appointmentDateKey: selectedDate,
        slotKey: selectedSlot.slotKey,
        notes: notes || ''
      });

      setAppointment(response?.data?.appointment || null);
      toast.success('Appointment booked successfully.');
    } catch (error) {
      const statusCode = error?.response?.status;
      const message = error?.response?.data?.message || 'Appointment could not be booked.';

      toast.error(message);

      if (statusCode === 409 && selectedCenter?._id) {
        setBookingStep(2);
        setSelectedSlot(null);
        await fetchAvailability(selectedCenter._id, selectedDate);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBack = () => {
    if (bookingStep > 1) {
      setBookingStep((prev) => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="appointment-booking appointment-booking--loading">
        <Loader size="large" text="Loading appointment booking..." />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="appointment-booking">
        <div className="appointment-booking__shell appointment-booking__shell--narrow">
          <div className="appointment-booking__empty-card">
            <FaExclamationTriangle className="appointment-booking__empty-icon" />
            <h2>Application not found</h2>
            <p>We could not find the selected application for appointment booking.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/track-application')}>
              Back to Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isApplicationApproved && !appointment) {
    return (
      <div className="appointment-booking">
        <div className="appointment-booking__shell appointment-booking__shell--narrow">
          <div className="appointment-booking__notice-card">
            <div className="appointment-booking__notice-head">
              <span className="appointment-booking__notice-icon appointment-booking__notice-icon--danger">
                <FaExclamationTriangle />
              </span>
              <div>
                <h2>Appointment not available yet</h2>
                <p>You can only book an appointment after your application is approved.</p>
              </div>
            </div>

            <div className="appointment-booking__summary-grid">
              <div>
                <span>Application ID</span>
                <strong>{application.applicationId}</strong>
              </div>
              <div>
                <span>Current Status</span>
                <strong className={`badge badge-${getStatusColor(application.status)}`}>
                  {formatStatus(application.status)}
                </strong>
              </div>
            </div>

            <div className="appointment-booking__actions">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/track-application')}>
                Track Application
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderProgress = () => (
    <div className="appointment-booking__progress" aria-label="Booking progress">
      {[
        { step: 1, label: 'Center' },
        { step: 2, label: 'Date & Slot' },
        { step: 3, label: 'Confirm' }
      ].map((item) => (
        <div
          key={item.step}
          className={`appointment-booking__progress-item ${bookingStep >= item.step ? 'is-active' : ''}`}
        >
          <span>{item.step}</span>
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="appointment-booking__step">
      <div className="appointment-booking__section-title">
        <div>
          <h3>
            <FaMapMarkerAlt />
            Select a Center
          </h3>
          <p>Choose the biometric enrollment center where you want to visit.</p>
        </div>
      </div>

      {centers.length === 0 ? (
        <div className="appointment-booking__empty-card">
          <FaInfoCircle className="appointment-booking__empty-icon" />
          <h3>No appointment center is available</h3>
          <p>Please try again later or contact support.</p>
        </div>
      ) : (
        <div className="appointment-booking__center-grid">
          {centers.map((center) => (
            <button
              key={center._id}
              type="button"
              className={`appointment-booking__center-card ${selectedCenter?._id === center._id ? 'is-selected' : ''}`}
              onClick={() => handleCenterSelect(center)}
            >
              <span className="appointment-booking__center-icon">
                <FaMapMarkerAlt />
              </span>
              <div>
                <h4>{center.name}</h4>
                <p>{center.address || 'Address not provided'}</p>
                <ul>
                  <li>District: {center.district || 'N/A'}</li>
                  <li>Office hours: {center.officeHours || 'N/A'}</li>
                  <li>
                    Booking window:{' '}
                    {center.appointmentConfig
                      ? `${center.appointmentConfig.minLeadDays} - ${center.appointmentConfig.maxAdvanceDays} days`
                      : 'Not configured'}
                  </li>
                </ul>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDateCalendar = () => (
    <div className="appointment-booking__calendar-card">
      <div className="appointment-booking__section-title appointment-booking__section-title--compact">
        <div>
          <h3>
            <FaCalendarAlt />
            Select Date
          </h3>
          <p>Unavailable dates are disabled. Weekly off days and holidays are marked clearly.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleRefreshAvailability}
          disabled={availabilityLoading}
        >
          {availabilityLoading ? <FaSpinner className="appointment-booking__spin" /> : <FaSyncAlt />}
          Refresh
        </button>
      </div>

      {availabilityLoading && !availability ? (
        <div className="appointment-booking__inline-loader">
          <FaSpinner className="appointment-booking__spin" />
          Loading available dates...
        </div>
      ) : (
        <div className="appointment-booking__date-grid">
          {calendarDays.map((day) => (
            <button
              key={day.dateKey}
              type="button"
              disabled={!day.isBookable || availabilityLoading}
              className={`appointment-booking__date-card ${selectedDate === day.dateKey ? 'is-selected' : ''} is-${day.status} ${day.isSpecialDate ? 'is-special' : ''}`}
              title={day.reason || ''}
              onClick={() => handleDateSelect(day)}
            >
              <span className="appointment-booking__date-day">{day.dayName}</span>
              <strong>{day.dateKey.slice(8, 10)}</strong>
              <span>{day.dateKey.slice(0, 7)}</span>
              <em>{getDayStatusLabel(day)}</em>
            </button>
          ))}
        </div>
      )}

      {!firstBookableDay && calendarDays.length > 0 && (
        <div className="appointment-booking__warning-box">
          <FaExclamationTriangle />
          No available appointment date found in this booking window.
        </div>
      )}
    </div>
  );

  const renderSlotPicker = () => (
    <div className="appointment-booking__slot-card">
      <div className="appointment-booking__section-title appointment-booking__section-title--compact">
        <div>
          <h3>
            <FaClock />
            Select Time Slot
          </h3>
          <p>
            {selectedDay?.isBookable
              ? `${formatDateKey(selectedDay.dateKey)} has ${selectedDay.remaining} appointment place left.`
              : selectedDay?.reason || 'Please select an available date.'}
          </p>
        </div>
      </div>

      {!selectedDay?.isBookable ? (
        <div className="appointment-booking__warning-box appointment-booking__warning-box--soft">
          <FaInfoCircle />
          Select an available date first.
        </div>
      ) : slots.length === 0 ? (
        <div className="appointment-booking__warning-box">
          <FaExclamationTriangle />
          No slot is configured for this date.
        </div>
      ) : (
        <div className="appointment-booking__slot-grid">
          {slots.map((slot) => (
            <button
              key={slot.slotKey}
              type="button"
              disabled={!slot.isAvailable || availabilityLoading}
              className={`appointment-booking__slot-option ${selectedSlot?.slotKey === slot.slotKey ? 'is-selected' : ''} ${!slot.isAvailable ? 'is-disabled' : ''}`}
              onClick={() => setSelectedSlot(slot)}
            >
              <span>
                <FaClock />
                {slot.label}
              </span>
              <strong>{slot.remaining > 0 ? `${slot.remaining} left` : 'Full'}</strong>
              <small>
                Capacity {slot.capacity} / Booked {slot.bookedCount}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="appointment-booking__step">
      <div className="appointment-booking__step-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={handleBack}>
          <FaArrowLeft />
          Back
        </button>
        <div>
          <h3>Choose Date & Time</h3>
          <p>{selectedCenter?.name}</p>
        </div>
      </div>

      <div className="appointment-booking__center-summary">
        <FaMapMarkerAlt />
        <div>
          <strong>{selectedCenter?.name}</strong>
          <span>{selectedCenter?.address || 'Address not provided'}</span>
          <small>District: {selectedCenter?.district || 'N/A'}</small>
        </div>
      </div>

      {renderDateCalendar()}
      {renderSlotPicker()}

      <div className="appointment-booking__form-group">
        <label htmlFor="appointment-notes">Notes (Optional)</label>
        <textarea
          id="appointment-notes"
          rows="4"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add any note for the appointment"
          className="form-textarea"
        />
      </div>

      <div className="appointment-booking__actions appointment-booking__actions--right">
        <button type="button" className="btn btn-primary" onClick={handleContinueToConfirm}>
          Continue
          <FaArrowRight />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="appointment-booking__step">
      <div className="appointment-booking__step-bar">
        <button type="button" className="btn btn-outline btn-sm" onClick={handleBack}>
          <FaArrowLeft />
          Back
        </button>
        <div>
          <h3>Confirm Appointment</h3>
          <p>Please check all information before submitting.</p>
        </div>
      </div>

      <div className="appointment-booking__confirm-card">
        <div className="appointment-booking__confirm-icon">
          <FaCheckCircle />
        </div>

        <div className="appointment-booking__summary-grid">
          <div>
            <span>Application ID</span>
            <strong>{application?.applicationId}</strong>
          </div>
          <div>
            <span>Application Type</span>
            <strong>{(application?.applicationType || 'N/A').toUpperCase()}</strong>
          </div>
          <div>
            <span>Center</span>
            <strong>{selectedCenter?.name}</strong>
          </div>
          <div>
            <span>District</span>
            <strong>{selectedCenter?.district || 'N/A'}</strong>
          </div>
          <div>
            <span>Appointment Date</span>
            <strong>{formatDateKey(selectedDate)}</strong>
          </div>
          <div>
            <span>Time Slot</span>
            <strong>{selectedSlot?.label || 'N/A'}</strong>
          </div>
          <div>
            <span>Available Places</span>
            <strong>{selectedSlot?.remaining || 0}</strong>
          </div>
          <div>
            <span>Notes</span>
            <strong>{notes || 'N/A'}</strong>
          </div>
        </div>

        <div className="appointment-booking__safe-note">
          <FaInfoCircle />
          If another citizen books this same slot before you submit, the system will refresh availability and ask you to pick another slot.
        </div>
      </div>

      <div className="appointment-booking__actions appointment-booking__actions--right">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleBookingConfirm}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <>
              <FaSpinner className="appointment-booking__spin" />
              Confirming...
            </>
          ) : (
            <>
              <FaCheckCircle />
              Confirm Appointment
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="appointment-booking">
      <div className="appointment-booking__shell">
        {!appointment ? (
          <>
            <div className="appointment-booking__header-card">
              <div>
                <h1>Appointment Booking</h1>
                <p>Book your biometric appointment for Smart NID processing.</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/track-application')}>
                <FaArrowLeft />
                Back to Applications
              </button>
            </div>

            <div className="appointment-booking__application-card">
              <div>
                <FaIdCard />
                <span>Application</span>
                <strong>{application.applicationId}</strong>
              </div>
              <div>
                <FaUsers />
                <span>Applicant</span>
                <strong>{application.fullNameEnglish || application.fullNameBangla || 'N/A'}</strong>
              </div>
              <div>
                <FaCheckCircle />
                <span>Status</span>
                <strong className={`badge badge-${getStatusColor(application.status)}`}>
                  {formatStatus(application.status)}
                </strong>
              </div>
            </div>

            {renderProgress()}

            <div className="appointment-booking__content-card">
              {bookingStep === 1 && renderStep1()}
              {bookingStep === 2 && renderStep2()}
              {bookingStep === 3 && renderStep3()}
            </div>
          </>
        ) : (
          <div className="appointment-booking__success-card">
            <div className="appointment-booking__success-icon">
              <FaCheckCircle />
            </div>
            <h1>Appointment booked successfully</h1>
            <p>Your biometric appointment has been scheduled. Please arrive on time with required documents.</p>

            <div className="appointment-booking__summary-grid">
              <div>
                <span>Application ID</span>
                <strong>{application?.applicationId}</strong>
              </div>
              <div>
                <span>Center</span>
                <strong>{appointment.centerName || selectedCenter?.name}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{formatDateKey(appointment.appointmentDateKey)}</strong>
              </div>
              <div>
                <span>Time Slot</span>
                <strong>{appointment.timeSlot}</strong>
              </div>
              <div>
                <span>Serial</span>
                <strong>#{appointment.slotSerial}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong className={`badge badge-${getStatusColor(appointment.status)}`}>
                  {formatStatus(appointment.status)}
                </strong>
              </div>
            </div>

            <div className="appointment-booking__actions">
              <button type="button" className="btn btn-primary" onClick={() => navigate('/track-application')}>
                Track Application
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
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
