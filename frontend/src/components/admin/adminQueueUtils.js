export const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeStatus = (value) =>
  normalizeText(value).replace(/\s+/g, '_');

export const getApplicationsFromResponse = (response) => {
  const payload = response?.data;

  if (Array.isArray(payload?.applications)) return payload.applications;
  if (Array.isArray(payload?.data?.applications)) return payload.data.applications;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;

  return [];
};

export const getPaginationMeta = (response, fallbackPage = 1, fallbackLimit = 20) => {
  const meta = response?.data?.meta || {};
  const total = Number(meta.total || 0);
  const totalPages = Number(meta.totalPages || meta.pages || 1);

  return {
    page: Number(meta.page || fallbackPage),
    limit: Number(meta.limit || fallbackLimit),
    total,
    totalPages: Math.max(1, totalPages)
  };
};

export const getApplicantName = (application) =>
  application?.fullNameEnglish ||
  application?.applicant?.fullName ||
  'Unknown applicant';

export const getApplicantPhone = (application) =>
  application?.phone || application?.applicant?.phone || 'Not recorded';

export const getApplicantEmail = (application) =>
  application?.email || application?.applicant?.email || 'Not recorded';

export const getBiometricCompletedAt = (application) =>
  application?.biometricAppointment?.status === 'completed'
    ? application?.biometricAppointment?.completedAt || null
    : null;

export const isApplicationPrintReady = (application) =>
  normalizeStatus(application?.status) === 'approved' &&
  application?.printQueueState === 'ready' &&
  Boolean(getBiometricCompletedAt(application));

export const getPrintingStatus = (application) => {
  const mappedStatus = normalizeStatus(application?.printStatus);
  if (mappedStatus) return mappedStatus;

  const applicationStatus = normalizeStatus(application?.status);
  if (isApplicationPrintReady(application)) return 'ready_for_print';
  if (['printed', 'dispatched', 'delivered'].includes(applicationStatus)) {
    return 'printed';
  }
  if (['rejected', 'cancelled'].includes(applicationStatus)) {
    return applicationStatus;
  }
  return 'not_printable';
};

export const getPrintingStatusLabel = (application) => {
  const status = getPrintingStatus(application);
  const labels = {
    ready_for_print: 'Ready for Print',
    printed: 'Printed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    not_printable: 'Not Printable'
  };

  return labels[status] || 'Not Printable';
};

export const getPrintingStatusClass = (application) => {
  const status = getPrintingStatus(application);
  if (status === 'ready_for_print') return 'approved';
  if (status === 'printed') return 'printed';
  if (['rejected', 'cancelled'].includes(status)) return 'not-printable';
  return 'neutral';
};

export const getPrintingQueueDate = (application) =>
  getBiometricCompletedAt(application) ||
  application?.printReadyAt ||
  application?.approvedAt ||
  application?.submittedAt ||
  application?.createdAt;

export const getQueueAge = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
};

export const getDeliveryInfo = (application) => application?.deliveryInfo || {};

export const getDeliveryQueueDate = (application) =>
  application?.deliveryQueueAt ||
  getDeliveryInfo(application).paymentCompletedAt ||
  getDeliveryInfo(application).requestedAt ||
  application?.printedAt ||
  application?.updatedAt ||
  application?.createdAt;

export const isActiveDeliveryRequest = (application) =>
  normalizeStatus(application?.status) === 'printed' &&
  application?.deliveryQueueState === 'active';

export const getDeliveryStatus = (application) => {
  const applicationStatus = normalizeStatus(application?.status);
  const requestStatus = normalizeStatus(getDeliveryInfo(application).status);

  if (['delivered', 'cancelled'].includes(applicationStatus)) {
    return applicationStatus;
  }

  if (isActiveDeliveryRequest(application)) {
    return requestStatus && requestStatus !== 'not_requested'
      ? requestStatus
      : 'requested';
  }

  return requestStatus || applicationStatus || 'not_requested';
};

export const getDeliveryStatusLabel = (application) => {
  const status = getDeliveryStatus(application);
  const labels = {
    not_requested: 'Not Requested',
    requested: 'Requested',
    processing: 'Processing',
    dispatched: 'Dispatched',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  return labels[status] || 'Unknown';
};

export const getDeliveryStatusClass = (application) => {
  const status = getDeliveryStatus(application);
  if (status === 'delivered') return 'delivered';
  if (status === 'cancelled') return 'cancelled';
  if (['requested', 'processing', 'dispatched'].includes(status)) return 'active';
  return 'neutral';
};

export const getDeliveryAddress = (application) =>
  getDeliveryInfo(application).address ||
  application?.deliveryAddress ||
  application?.presentAddress?.villageOrArea ||
  'Not recorded';

export const getDeliveryPhone = (application) =>
  getDeliveryInfo(application).contactPhone || getApplicantPhone(application);

export const getDocumentSummary = (application) => {
  const documents = Object.values(application?.documentAssets || {});
  const uploaded = documents.filter((item) =>
    ['uploaded', 'verified'].includes(normalizeStatus(item?.status))
  ).length;
  const verified = documents.filter(
    (item) => normalizeStatus(item?.status) === 'verified'
  ).length;

  return { uploaded, verified, total: documents.length };
};
