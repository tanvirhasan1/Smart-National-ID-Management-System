#!/usr/bin/env node
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Application = require('../models/Application');
const Appointment = require('../models/Appointment');
const Center = require('../models/Center');

const DRY = process.argv.includes('--dry-run');
const SEED_MARKER = 'APPOINTMENT-DEMO-SEED-V1';

const daysAgo = (d = 0, h = 10) => {
  const x = new Date();
  x.setUTCHours(h, 0, 0, 0);
  x.setUTCDate(x.getUTCDate() - d);
  return x;
};

const daysFromNow = (d = 0, h = 10) => {
  const x = new Date();
  x.setUTCHours(h, 0, 0, 0);
  x.setUTCDate(x.getUTCDate() + d);
  return x;
};

async function cleanupOldAppointments() {
  const old = await Appointment.find({ notes: new RegExp(SEED_MARKER) }).select('_id');
  if (!old.length) return 0;
  const ids = old.map((x) => x._id);
  await Appointment.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

async function loadCenters() {
  const centers = await Center.find({ isActive: true }).lean();
  if (!centers.length) {
    throw new Error('No active centers found. Seed centers first.');
  }
  return centers;
}

async function loadApplications() {
  const applicationIds = [
    'APP-DEMO-0019',
    'APP-DEMO-0020',
    'APP-DEMO-0021',
    'APP-DEMO-0022',
    'APP-DEMO-0023',
    'APP-DEMO-0024',
    'APP-DEMO-0025',
    'APP-DEMO-0034',
    'APP-DEMO-0035',
    'APP-DEMO-0036',
    'APP-DEMO-0037',
    'APP-DEMO-0038',
    'APP-DEMO-0040',
    'APP-DEMO-0041',
    'APP-DEMO-0042',
    'APP-DEMO-0043',
    'APP-DEMO-0044',
    'APP-DEMO-0045'
  ];

  const apps = await Application.find({ applicationId: { $in: applicationIds } })
    .select('_id applicant applicationId presentAddress status')
    .lean();

  const byId = new Map(apps.map((a) => [a.applicationId, a]));
  const missing = applicationIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`Missing applications for appointment seed: ${missing.join(', ')}`);
  }
  return byId;
}

function buildAppointments(appMap, centers) {
  const plan = [
    ['APP-DEMO-0019', 'booked', 2, '10:00 AM - 10:30 AM', 'Dhaka'],
    ['APP-DEMO-0020', 'booked', 3, '11:30 AM - 12:00 PM', 'Gazipur'],
    ['APP-DEMO-0021', 'booked', 4, '2:00 PM - 2:30 PM', 'Chattogram'],
    ['APP-DEMO-0022', 'booked', 5, '10:00 AM - 10:30 AM', 'Cumilla'],
    ['APP-DEMO-0023', 'booked', 6, '11:30 AM - 12:00 PM', 'Rajshahi'],
    ['APP-DEMO-0024', 'booked', 7, '2:00 PM - 2:30 PM', 'Khulna'],
    ['APP-DEMO-0025', 'cancelled', 8, '10:00 AM - 10:30 AM', 'Sylhet'],

    ['APP-DEMO-0034', 'completed', -12, '9:30 AM - 10:00 AM', 'Dhaka'],
    ['APP-DEMO-0035', 'completed', -13, '11:00 AM - 11:30 AM', 'Gazipur'],
    ['APP-DEMO-0036', 'completed', -14, '9:30 AM - 10:00 AM', 'Chattogram'],
    ['APP-DEMO-0037', 'completed', -15, '11:00 AM - 11:30 AM', 'Rajshahi'],
    ['APP-DEMO-0038', 'completed', -16, '9:30 AM - 10:00 AM', 'Khulna'],

    ['APP-DEMO-0040', 'completed', -24, '10:30 AM - 11:00 AM', 'Dhaka'],
    ['APP-DEMO-0041', 'completed', -25, '1:00 PM - 1:30 PM', 'Gazipur'],
    ['APP-DEMO-0042', 'completed', -26, '10:30 AM - 11:00 AM', 'Chattogram'],
    ['APP-DEMO-0043', 'completed', -27, '1:00 PM - 1:30 PM', 'Sylhet'],
    ['APP-DEMO-0044', 'completed', -28, '10:30 AM - 11:00 AM', 'Barishal'],
    ['APP-DEMO-0045', 'completed', -29, '1:00 PM - 1:30 PM', 'Rajshahi']
  ];

  return plan.map(([applicationId, status, dayOffset, timeSlot, preferredDistrict], idx) => {
    const app = appMap.get(applicationId);

    const center =
      centers.find((c) => c.district === preferredDistrict) ||
      centers.find((c) => c.district === app?.presentAddress?.district) ||
      centers[idx % centers.length];

    const appointmentDate = dayOffset >= 0 ? daysFromNow(dayOffset) : daysAgo(Math.abs(dayOffset));

    let notes = `${SEED_MARKER} | Bring original birth registration certificate and the registered mobile number used during application.`;
    if (status === 'completed') {
      notes = `${SEED_MARKER} | Biometric enrollment completed successfully and the application progressed in the workflow.`;
    }
    if (status === 'cancelled') {
      notes = `${SEED_MARKER} | Appointment was cancelled after scheduling due to an applicant-side reschedule request.`;
    }

    return {
      _id: new mongoose.Types.ObjectId(),
      application: app._id,
      applicant: app.applicant,
      appointmentDate,
      timeSlot,
      centerName: center.name,
      centerDistrict: center.district,
      notes,
      status,
      bookedAt: dayOffset >= 0 ? daysAgo(idx + 1) : daysAgo(Math.abs(dayOffset) + 3),
      createdAt: dayOffset >= 0 ? daysAgo(idx + 1) : daysAgo(Math.abs(dayOffset) + 3),
      updatedAt:
        status === 'booked'
          ? daysAgo((idx % 3) + 1)
          : daysAgo(Math.max(Math.abs(dayOffset) - 1, 1))
    };
  });
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const deleted = await cleanupOldAppointments();
    const centers = await loadCenters();
    const appMap = await loadApplications();
    const docs = buildAppointments(appMap, centers);

    console.log('=== Appointment Demo Seed ===');
    console.log('Deleted old demo appointments:', deleted);
    console.log('Prepared appointments:', docs.length);
    console.log('Status mix:', {
      booked: docs.filter((x) => x.status === 'booked').length,
      cancelled: docs.filter((x) => x.status === 'cancelled').length,
      completed: docs.filter((x) => x.status === 'completed').length
    });

    if (DRY) {
      console.log('Dry run only. No insert executed.');
      return;
    }

    await Appointment.collection.insertMany(docs, { ordered: true });
    console.log('Appointment seed completed successfully.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Appointment seed failed:', err);
  process.exitCode = 1;
});