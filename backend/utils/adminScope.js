const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeDistrict = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const uniqueDistricts = (districts = []) => {
  const districtMap = new Map();

  districts.forEach((district) => {
    const trimmed = String(district || '').trim();
    if (!trimmed) return;
    districtMap.set(normalizeDistrict(trimmed), trimmed);
  });

  return [...districtMap.values()];
};

const combineMongoFilters = (...filters) => {
  const cleanFilters = filters.filter(
    (filter) => filter && typeof filter === 'object' && Object.keys(filter).length > 0
  );

  if (cleanFilters.length === 0) return {};
  if (cleanFilters.length === 1) return cleanFilters[0];

  return { $and: cleanFilters };
};

const getAdminScope = (user = {}) => {
  const scope = user?.adminScope || {};
  const scopeType = scope.scopeType === 'district' ? 'district' : 'national';
  const districts = Array.isArray(scope.districts) ? scope.districts : [];
  const primaryDistrict = scope.primaryDistrict || '';

  return {
    scopeType,
    districts,
    primaryDistrict
  };
};

const isNationalScope = (user = {}) => {
  if (!user) return false;

  const scope = getAdminScope(user);
  return scope.scopeType !== 'district';
};

const getAdminDistricts = (user = {}) => {
  const scope = getAdminScope(user);
  return uniqueDistricts([...scope.districts, scope.primaryDistrict]);
};

const buildDistrictValueMatcher = (districts = []) => {
  const cleanDistricts = uniqueDistricts(districts);

  if (cleanDistricts.length === 0) {
    return null;
  }

  return {
    $in: cleanDistricts.flatMap((district) => [
      district,
      new RegExp(`^${escapeRegex(district)}$`, 'i')
    ])
  };
};

const buildFieldDistrictFilter = (field, districts = []) => {
  const matcher = buildDistrictValueMatcher(districts);

  if (!matcher) {
    return { _id: null };
  }

  return {
    [field]: matcher
  };
};

const buildUserDistrictFilter = (districts = []) => {
  const matcher = buildDistrictValueMatcher(districts);

  if (!matcher) {
    return { _id: null };
  }

  return {
    $or: [
      { 'presentAddress.district': matcher },
      { 'permanentAddress.district': matcher }
    ]
  };
};

const buildCenterDistrictFilter = (districts = []) =>
  buildFieldDistrictFilter('district', districts);

const buildAppointmentDistrictFilter = (districts = []) =>
  buildFieldDistrictFilter('centerDistrict', districts);

const buildJurisdictionDistrictFilter = (districts = []) => {
  const matcher = buildDistrictValueMatcher(districts);

  if (!matcher) {
    return { _id: null };
  }

  return {
    $or: [
      { 'jurisdiction.district': matcher },
      { jurisdiction: matcher },
      { 'permanentAddress.district': matcher },
      { 'presentAddress.district': matcher }
    ]
  };
};

const applyAdminJurisdictionFilter = (req, baseFilter = {}) => {
  if (isNationalScope(req.user)) {
    return { ...baseFilter };
  }

  const jurisdictionFilter = buildJurisdictionDistrictFilter(
    getAdminDistricts(req.user)
  );

  return combineMongoFilters(baseFilter, jurisdictionFilter);
};

const applyAdminDistrictFilter = (req, baseFilter = {}, field = 'district') => {
  if (isNationalScope(req.user)) {
    return { ...baseFilter };
  }

  const districtFilter = buildFieldDistrictFilter(field, getAdminDistricts(req.user));
  return combineMongoFilters(baseFilter, districtFilter);
};

const getApplicationDistrict = (application = {}) => {
  if (typeof application?.jurisdiction === 'string') {
    return application.jurisdiction;
  }

  return (
    application?.jurisdiction?.district ||
    application?.permanentAddress?.district ||
    application?.presentAddress?.district ||
    ''
  );
};

const getUserDistricts = (user = {}) =>
  uniqueDistricts([
    user?.presentAddress?.district,
    user?.permanentAddress?.district
  ]);

const getCenterDistrict = (center = {}) => center?.district || '';

const getAppointmentDistrict = (appointment = {}) =>
  appointment?.centerDistrict || appointment?.center?.district || '';

const canAccessDistrict = (reqOrUser, district = '') => {
  const user = reqOrUser?.user || reqOrUser;

  if (isNationalScope(user)) {
    return true;
  }

  const requestedDistrict = normalizeDistrict(district);
  const allowedDistricts = getAdminDistricts(user).map(normalizeDistrict);

  return Boolean(requestedDistrict && allowedDistricts.includes(requestedDistrict));
};

const canAccessApplicationByJurisdiction = (req, application = {}) => {
  if (isNationalScope(req.user)) {
    return true;
  }

  return canAccessDistrict(req, getApplicationDistrict(application));
};

const canAccessUserByDistrict = (reqOrUser, targetUser = {}) => {
  const user = reqOrUser?.user || reqOrUser;

  if (isNationalScope(user)) {
    return true;
  }

  const allowedDistricts = getAdminDistricts(user).map(normalizeDistrict);
  return getUserDistricts(targetUser)
    .map(normalizeDistrict)
    .some((district) => district && allowedDistricts.includes(district));
};

const canAccessCenterByDistrict = (reqOrUser, center = {}) =>
  canAccessDistrict(reqOrUser, getCenterDistrict(center));

const canAccessAppointmentByDistrict = (reqOrUser, appointment = {}) =>
  canAccessDistrict(reqOrUser, getAppointmentDistrict(appointment));

module.exports = {
  normalizeDistrict,
  uniqueDistricts,
  combineMongoFilters,
  getAdminScope,
  isNationalScope,
  getAdminDistricts,
  buildFieldDistrictFilter,
  buildUserDistrictFilter,
  buildCenterDistrictFilter,
  buildAppointmentDistrictFilter,
  buildJurisdictionDistrictFilter,
  applyAdminJurisdictionFilter,
  applyAdminDistrictFilter,
  getApplicationDistrict,
  getUserDistricts,
  getCenterDistrict,
  getAppointmentDistrict,
  canAccessDistrict,
  canAccessApplicationByJurisdiction,
  canAccessUserByDistrict,
  canAccessCenterByDistrict,
  canAccessAppointmentByDistrict
};
