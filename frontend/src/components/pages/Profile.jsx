// Profile Page Start
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaShieldAlt,
  FaCheckCircle,
  FaSpinner,
  FaSave
} from 'react-icons/fa';
import api from '../api/axios';
import Loader from '../common/Loader';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import '../styles/Profile.css';

const Profile = () => {
  // Auth user and page state
  const { user, setUser } = useAuth();

  const [profileLoading, setProfileLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  // Load current profile from backend
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);

      const response = await api.get('/users/profile');
      const currentProfile = response?.data?.user || response?.data || null;

      setProfileData(currentProfile);

      reset({
        fullName: currentProfile?.fullName || '',
        email: currentProfile?.email || '',
        phone: currentProfile?.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(
        error?.response?.data?.message || 'Failed to load profile'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // Save updated profile info
  const onSubmit = async (formData) => {
    setSaveLoading(true);

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone
      };

      const response = await api.put('/users/profile', payload);
      const updatedUser = response?.data?.user || response?.data || null;

      setProfileData(updatedUser);

      if (setUser) {
        setUser(updatedUser);
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(
        error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.msg ||
          'Failed to update profile'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const getInputClass = (hasError = false) =>
    `profile-form-input w-full rounded-lg border bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:ring-4 ${
      hasError
        ? 'border-red-600 focus:border-red-600 focus:ring-red-600/10'
        : 'border-[#D1D5DB] focus:border-[#16A34A] focus:ring-[#16A34A]/10'
    }`;

  // Loading state
  if (profileLoading) {
    return (
      <div className="profile-loading-wrapper flex min-h-[60vh] items-center justify-center">
        <Loader size="large" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper min-h-[calc(100vh-140px)] bg-[#F9FAFB] px-4 py-8">
      <div className="profile-page-shell mx-auto w-full max-w-[1100px]">
        {/* Page header */}
        <div className="profile-header-panel mb-8 rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="profile-header-content">
              <h1 className="profile-page-title mb-1 text-[1.9rem] font-bold text-[#1F2937]">
                My Profile
              </h1>
              <p className="profile-page-subtitle text-[#6B7280]">
                View and update your Smart NID account information.
              </p>
            </div>

            <div className="profile-status-badge-wrap">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F0FDF4] px-4 py-2 text-sm font-medium text-[#16A34A]">
                <FaCheckCircle />
                <span>{profileData?.isVerified ? 'Verified Account' : 'Account Active'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="profile-content-grid grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left summary panel */}
          <div className="profile-summary-panel rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <div className="profile-avatar-wrap mb-5 flex justify-center">
              <div className="profile-avatar flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,#16A34A_0%,#15803D_100%)] text-4xl text-white">
                <FaUser />
              </div>
            </div>

            <div className="profile-summary-text text-center">
              <h2 className="mb-1 text-xl font-bold text-[#1F2937]">
                {profileData?.fullName || user?.fullName || 'Citizen User'}
              </h2>
              <p className="mb-4 text-sm text-[#6B7280]">
                {profileData?.email || 'No email added'}
              </p>
            </div>

            <div className="profile-summary-cards flex flex-col gap-3">
              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Role</p>
                <p className="font-semibold text-[#1F2937]">
                  {profileData?.role || 'citizen'}
                </p>
              </div>

              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Phone</p>
                <p className="font-semibold text-[#1F2937]">
                  {profileData?.phone || 'N/A'}
                </p>
              </div>

              <div className="rounded-xl bg-[#F9FAFB] p-4">
                <p className="mb-1 text-sm text-[#6B7280]">Joined</p>
                <p className="font-semibold text-[#1F2937]">
                  {profileData?.createdAt ? formatDate(profileData.createdAt) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Right edit form */}
          <div className="profile-form-panel rounded-2xl bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] sm:p-8">
            <div className="profile-form-header mb-6">
              <h3 className="text-xl font-semibold text-[#1F2937]">
                Personal Information
              </h3>
              <p className="mt-1 text-sm text-[#6B7280]">
                Keep your account information up to date.
              </p>
            </div>

            <form className="profile-form space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="profile-form-group">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                  <FaUser className="text-[#16A34A]" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  className={getInputClass(!!errors.fullName)}
                  placeholder="Enter your full name"
                  {...register('fullName', {
                    required: 'Full name is required',
                    minLength: {
                      value: 3,
                      message: 'Name must be at least 3 characters'
                    }
                  })}
                />
                {errors.fullName && (
                  <span className="mt-2 block text-sm text-red-600">
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              <div className="profile-form-row grid gap-5 md:grid-cols-2">
                <div className="profile-form-group">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaEnvelope className="text-[#16A34A]" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    className={getInputClass(!!errors.email)}
                    placeholder="Enter your email"
                    {...register('email', {
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Enter a valid email address'
                      }
                    })}
                  />
                  {errors.email && (
                    <span className="mt-2 block text-sm text-red-600">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="profile-form-group">
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#374151]">
                    <FaPhone className="text-[#16A34A]" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="text"
                    className={getInputClass(!!errors.phone)}
                    placeholder="01XXXXXXXXX"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^01[0-9]{9}$/,
                        message: 'Enter a valid Bangladeshi mobile number'
                      }
                    })}
                  />
                  {errors.phone && (
                    <span className="mt-2 block text-sm text-red-600">
                      {errors.phone.message}
                    </span>
                  )}
                </div>
              </div>

              {/* Small account note */}
              <div className="profile-security-note rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-4">
                <div className="mb-2 flex items-center gap-2 text-[#1F2937]">
                  <FaShieldAlt className="text-[#16A34A]" />
                  <span className="font-semibold">Account Note</span>
                </div>
                <p className="text-sm leading-7 text-[#6B7280]">
                  Your profile changes will be saved to your Smart NID account.
                  Keep your phone and email updated for important notifications.
                </p>
              </div>

              <div className="profile-form-actions flex justify-end">
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="profile-save-button inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveLoading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
// Profile Page End