const mongoose = require('mongoose');

const DEFAULT_COLLECTION_CANDIDATES = ['birthcertificates'];

const collectionCache = {
  loadedAt: 0,
  names: []
};

const normalizeName = (value = '') =>
  String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const normalizeBirthDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getCandidateCollectionNames = async () => {
  const now = Date.now();

  if (collectionCache.names.length > 0 && now - collectionCache.loadedAt < 10 * 60 * 1000) {
    return collectionCache.names;
  }

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('Database connection is not ready for birth certificate lookup');
  }

  const envCandidates = (process.env.BIRTH_CERTIFICATE_COLLECTIONS || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const allCollections = await db.listCollections({}, { nameOnly: true }).toArray();
  const allNames = allCollections.map((entry) => entry.name);

  const prioritized = [
    ...envCandidates,
    ...DEFAULT_COLLECTION_CANDIDATES,
    ...allNames.filter((name) => /birth/i.test(name))
  ];

  const uniqueNames = [...new Set(prioritized)].filter((name) => allNames.includes(name));

  collectionCache.loadedAt = now;
  collectionCache.names = uniqueNames;

  return uniqueNames;
};

const findBirthCertificateRecord = async ({
  birthRegNumber,
  fullName,
  fullNameBangla,
  dateOfBirth
}) => {
  const normalizedInputName = normalizeName(fullName);
  const normalizedInputBangla = normalizeName(fullNameBangla);
  const normalizedInputDob = normalizeBirthDate(dateOfBirth);

  if (!birthRegNumber || !normalizedInputName || !normalizedInputDob) {
    return null;
  }

  const collectionNames = await getCandidateCollectionNames();

  for (const collectionName of collectionNames) {
    const collection = mongoose.connection.db.collection(collectionName);

    const candidate = await collection.findOne({
      $or: [
        { birthRegNumber },
        { birthRegistrationNumber: birthRegNumber }
      ]
    });

    if (!candidate) {
      continue;
    }

    const normalizedRecordDob = normalizeBirthDate(candidate.dateOfBirth);
    const recordEnglishName = normalizeName(candidate.fullName);
    const recordBanglaName = normalizeName(candidate.fullNameBangla);

    const englishMatches = recordEnglishName === normalizedInputName;
    const banglaMatches =
      !normalizedInputBangla || !recordBanglaName
        ? true
        : recordBanglaName === normalizedInputBangla;
    const dobMatches = normalizedRecordDob === normalizedInputDob;

    if (englishMatches && banglaMatches && dobMatches) {
      return {
        collectionName,
        record: candidate
      };
    }
  }

  return null;
};

module.exports = {
  findBirthCertificateRecord,
  normalizeBirthDate,
  normalizeName
};