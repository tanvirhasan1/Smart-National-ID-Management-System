#!/usr/bin/env node
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = "mongodb://127.0.0.1:27017";
const DB_NAME = "smartnid";
const COLLECTION_NAME = "birthcertificates";

const DRY = process.argv.includes('--dry-run');
const SEED_MARKER = 'BIRTH-CERTIFICATE-DEMO-SEED-V1';

const birthCertificates = [
  {
    fullName: "Mehedi Hasan",
    fullNameBangla: "মেহেদী হাসান",
    birthRegNumber: "20001000000000000",
    birthRegistrationNumber: "20001000000000000",
    dateOfBirth: new Date("1988-01-01T00:00:00.000Z"),
    gender: "male",
    placeOfBirth: "Dhaka",
    fatherName: "Sajid Ahmed",
    motherName: "Maliha Chowdhury",
    presentAddress: {
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Dhamrai",
      unionOrWard: "Kulla",
      villageOrArea: "Islampur",
      postOffice: "Dhamrai",
      postalCode: "1350",
    },
    permanentAddress: {
      division: "Dhaka",
      district: "Dhaka",
      upazila: "Dhamrai",
      unionOrWard: "Kulla",
      villageOrArea: "Islampur",
      postOffice: "Dhamrai",
      postalCode: "1350",
    },
    seedTag: "smartnid-demo-v3",
    seedMarker: SEED_MARKER,
    isPublicRegistrationOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    fullName: "Tanvir Ahmed",
    fullNameBangla: "তানভীর আহমেদ",
    birthRegNumber: "20011000000000001",
    birthRegistrationNumber: "20011000000000001",
    dateOfBirth: new Date("1992-07-15T00:00:00.000Z"),
    gender: "male",
    placeOfBirth: "Manikganj",
    fatherName: "Mahbubur Rahman",
    motherName: "Shirin Akter",
    presentAddress: {
      division: "Dhaka",
      district: "Manikganj",
      upazila: "Saturia",
      unionOrWard: "Baliati",
      villageOrArea: "South Baliati",
      postOffice: "Saturia",
      postalCode: "1810",
    },
    permanentAddress: {
      division: "Dhaka",
      district: "Manikganj",
      upazila: "Saturia",
      unionOrWard: "Baliati",
      villageOrArea: "South Baliati",
      postOffice: "Saturia",
      postalCode: "1810",
    },
    seedTag: "smartnid-demo-v3",
    seedMarker: SEED_MARKER,
    isPublicRegistrationOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    fullName: "Nusrat Jahan",
    fullNameBangla: "নুসরাত জাহান",
    birthRegNumber: "20021000000000002",
    birthRegistrationNumber: "20021000000000002",
    dateOfBirth: new Date("1995-11-21T00:00:00.000Z"),
    gender: "female",
    placeOfBirth: "Faridpur",
    fatherName: "Abdul Kader",
    motherName: "Rokeya Begum",
    presentAddress: {
      division: "Dhaka",
      district: "Faridpur",
      upazila: "Boalmari",
      unionOrWard: "Chatul",
      villageOrArea: "Kazibari",
      postOffice: "Boalmari",
      postalCode: "7860",
    },
    permanentAddress: {
      division: "Dhaka",
      district: "Faridpur",
      upazila: "Boalmari",
      unionOrWard: "Chatul",
      villageOrArea: "Kazibari",
      postOffice: "Boalmari",
      postalCode: "7860",
    },
    seedTag: "smartnid-demo-v3",
    seedMarker: SEED_MARKER,
    isPublicRegistrationOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    fullName: "Rakibul Islam",
    fullNameBangla: "রাকিবুল ইসলাম",
    birthRegNumber: "20031000000000003",
    birthRegistrationNumber: "20031000000000003",
    dateOfBirth: new Date("1987-03-09T00:00:00.000Z"),
    gender: "male",
    placeOfBirth: "Cumilla",
    fatherName: "Jalal Uddin",
    motherName: "Selina Begum",
    presentAddress: {
      division: "Chattogram",
      district: "Cumilla",
      upazila: "Daudkandi",
      unionOrWard: "Eliotganj",
      villageOrArea: "North Eliotganj",
      postOffice: "Daudkandi",
      postalCode: "3516",
    },
    permanentAddress: {
      division: "Chattogram",
      district: "Cumilla",
      upazila: "Daudkandi",
      unionOrWard: "Eliotganj",
      villageOrArea: "North Eliotganj",
      postOffice: "Daudkandi",
      postalCode: "3516",
    },
    seedTag: "smartnid-demo-v3",
    seedMarker: SEED_MARKER,
    isPublicRegistrationOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    fullName: "Sabina Yeasmin",
    fullNameBangla: "সাবিনা ইয়াসমিন",
    birthRegNumber: "20041000000000004",
    birthRegistrationNumber: "20041000000000004",
    dateOfBirth: new Date("1998-09-30T00:00:00.000Z"),
    gender: "female",
    placeOfBirth: "Khulna",
    fatherName: "Harun Or Rashid",
    motherName: "Nasima Khatun",
    presentAddress: {
      division: "Khulna",
      district: "Khulna",
      upazila: "Batiaghata",
      unionOrWard: "Gangarampur",
      villageOrArea: "Boro Boyra",
      postOffice: "Batiaghata",
      postalCode: "9260",
    },
    permanentAddress: {
      division: "Khulna",
      district: "Khulna",
      upazila: "Batiaghata",
      unionOrWard: "Gangarampur",
      villageOrArea: "Boro Boyra",
      postOffice: "Batiaghata",
      postalCode: "9260",
    },
    seedTag: "smartnid-demo-v3",
    seedMarker: SEED_MARKER,
    isPublicRegistrationOnly: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

async function seedBirthCertificates() {
  try {
    const connectionUri = `${MONGO_URI}/${DB_NAME}`;
    await mongoose.connect(connectionUri);

    console.log(`MongoDB connected: ${connectionUri}`);

    const collection = mongoose.connection.db.collection(COLLECTION_NAME);

    if (DRY) {
      console.log('[DRY RUN] Following data would be inserted:');
      console.log(JSON.stringify(birthCertificates, null, 2));
      return;
    }

    const regNumbers = birthCertificates.map(item => item.birthRegistrationNumber);

    const existingDocs = await collection
      .find({ birthRegistrationNumber: { $in: regNumbers } })
      .project({ birthRegistrationNumber: 1 })
      .toArray();

    const existingRegSet = new Set(
      existingDocs.map(doc => doc.birthRegistrationNumber)
    );

    const docsToInsert = birthCertificates.filter(
      item => !existingRegSet.has(item.birthRegistrationNumber)
    );

    if (!docsToInsert.length) {
      console.log('No new birth certificate data to insert. All already exist.');
      return;
    }

    const result = await collection.insertMany(docsToInsert);

    console.log(`${result.insertedCount} birth certificates inserted successfully.`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

seedBirthCertificates();