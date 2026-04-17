// Common helper functions

export const formatDate = (date) => {
  if (!date) return '';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateForInput = (date) => {
  if (!date) return '';

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const day = String(parsedDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getStatusColor = (status) => {
  const colors = {
    draft: 'gray',
    pending: 'warning',
    submitted: 'info',
    under_review: 'warning',
    approved: 'success',
    rejected: 'danger',
    printing: 'info',
    printed: 'success',
    dispatched: 'info',
    delivered: 'success',
    open: 'warning',
    in_progress: 'info',
    resolved: 'success',
    closed: 'gray',
    scheduled: 'info',
    booked: 'info',
    completed: 'success',
    cancelled: 'danger',
    active: 'success',
    inactive: 'gray',
    suspended: 'danger',
    failed: 'danger'
  };

  return colors[status] || 'gray';
};

export const capitalize = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export const formatStatus = (status) => {
  if (!status || typeof status !== 'string') return '';
  return status
    .replace(/-/g, '_')
    .split('_')
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
};

export const truncate = (text, length = 50) => {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const calculateAge = (dob) => {
  if (!dob) return 0;

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(2))} ${sizes[index]}`;
};

export const generateTimeSlots = (startTime, endTime, duration = 30) => {
  if (!startTime || !endTime || duration <= 0) return [];

  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMin < endMin)
  ) {
    const slotStart = `${String(currentHour).padStart(2, '0')}:${String(
      currentMin
    ).padStart(2, '0')}`;

    currentMin += duration;

    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }

    const slotEnd = `${String(currentHour).padStart(2, '0')}:${String(
      currentMin
    ).padStart(2, '0')}`;

    slots.push(`${slotStart}-${slotEnd}`);
  }

  return slots;
};

export const bangladeshLocations = {
  divisions: [
    'Dhaka',
    'Chittagong',
    'Rajshahi',
    'Khulna',
    'Barisal',
    'Sylhet',
    'Rangpur',
    'Mymensingh'
  ],
  districts: {
    Dhaka: [
      'Dhaka',
      'Gazipur',
      'Narayanganj',
      'Tangail',
      'Manikganj',
      'Munshiganj',
      'Narsingdi',
      'Faridpur',
      'Gopalganj',
      'Kishoreganj',
      'Madaripur',
      'Rajbari',
      'Shariatpur'
    ],
    Chittagong: [
      'Chittagong',
      "Cox's Bazar",
      'Comilla',
      'Feni',
      'Khagrachhari',
      'Lakshmipur',
      'Noakhali',
      'Rangamati',
      'Bandarban',
      'Brahmanbaria',
      'Chandpur'
    ],
    Rajshahi: [
      'Rajshahi',
      'Chapainawabganj',
      'Naogaon',
      'Natore',
      'Nawabganj',
      'Pabna',
      'Bogra',
      'Joypurhat',
      'Sirajganj'
    ],
    Khulna: [
      'Khulna',
      'Bagerhat',
      'Chuadanga',
      'Jessore',
      'Jhenaidah',
      'Kushtia',
      'Magura',
      'Meherpur',
      'Narail',
      'Satkhira'
    ],
    Barisal: [
      'Barisal',
      'Barguna',
      'Bhola',
      'Jhalokati',
      'Patuakhali',
      'Pirojpur'
    ],
    Sylhet: ['Sylhet', 'Habiganj', 'Moulvibazar', 'Sunamganj'],
    Rangpur: [
      'Rangpur',
      'Dinajpur',
      'Gaibandha',
      'Kurigram',
      'Lalmonirhat',
      'Nilphamari',
      'Panchagarh',
      'Thakurgaon'
    ],
    Mymensingh: ['Mymensingh', 'Jamalpur', 'Netrokona', 'Sherpur']
  }
};