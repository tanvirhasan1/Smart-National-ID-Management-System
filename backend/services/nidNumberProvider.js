const { randomInt } = require('crypto');
const NidNumberAssignment = require('../models/NidNumberAssignment');

const MOCK_PROVIDER_NAME = 'mock';
const DEFAULT_MAX_ASSIGNMENT_ATTEMPTS = 10;

const generateMockNidNumber = () =>
  String(randomInt(1000000000, 10000000000));

const isDuplicateKeyError = (error) => error?.code === 11000;

const createAssignmentError = (message) => {
  const error = new Error(message);
  error.code = 'NID_NUMBER_ASSIGNMENT_FAILED';
  return error;
};

const buildAssignmentResult = (assignment, created) => ({
  assignment,
  created,
  nidNumber: assignment.nidNumber,
  provider: assignment.provider
});

const getOrCreateNidNumberAssignment = async (
  application,
  {
    provider = MOCK_PROVIDER_NAME,
    externalReference = null,
    metadata = {},
    maxAttempts = DEFAULT_MAX_ASSIGNMENT_ATTEMPTS
  } = {}
) => {
  if (!application?._id || !application?.applicant) {
    throw createAssignmentError(
      'Application and citizen are required for NID number assignment'
    );
  }

  const existingAssignment = await NidNumberAssignment.findOne({
    application: application._id
  });

  if (existingAssignment) {
    application.nidNumber = existingAssignment.nidNumber;
    return buildAssignmentResult(existingAssignment, false);
  }

  const existingApplicationNumber = String(application.nidNumber || '').trim();
  const hasExistingApplicationNumber = /^[1-9]\d{9}$/.test(
    existingApplicationNumber
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const nidNumber = hasExistingApplicationNumber
      ? existingApplicationNumber
      : generateMockNidNumber();

    try {
      const assignment = await NidNumberAssignment.create({
        application: application._id,
        citizen: application.applicant,
        nidNumber,
        provider,
        status: 'assigned',
        assignedAt: new Date(),
        externalReference,
        metadata
      });

      application.nidNumber = assignment.nidNumber;
      return buildAssignmentResult(assignment, true);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const concurrentAssignment = await NidNumberAssignment.findOne({
        application: application._id
      });

      if (concurrentAssignment) {
        application.nidNumber = concurrentAssignment.nidNumber;
        return buildAssignmentResult(concurrentAssignment, false);
      }

      if (hasExistingApplicationNumber) {
        throw createAssignmentError(
          'The existing application NID number is already assigned'
        );
      }

      if (attempt === maxAttempts) {
        throw createAssignmentError(
          'Unable to generate a unique NID number after multiple attempts'
        );
      }
    }
  }

  throw createAssignmentError('Unable to assign an NID number');
};

module.exports = {
  MOCK_PROVIDER_NAME,
  generateMockNidNumber,
  getOrCreateNidNumberAssignment
};
