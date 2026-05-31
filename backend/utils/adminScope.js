const normalizeDistrict = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

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
  const districtSet = new Map();

  [...scope.districts, scope.primaryDistrict].forEach((district) => {
    const trimmed = String(district || '').trim();
    if (!trimmed) return;
    districtSet.set(normalizeDistrict(trimmed), trimmed);
  });

  return [...districtSet.values()];
};

const buildJurisdictionDistrictFilter = (districts = []) => {
  const cleanDistricts = districts
    .map((district) => String(district || '').trim())
    .filter(Boolean);

  if (cleanDistricts.length === 0) {
    return { _id: null };
  }

  return {
    $or: [
      { 'jurisdiction.district': { $in: cleanDistricts } },
      { jurisdiction: { $in: cleanDistricts } }
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

  if (!baseFilter || Object.keys(baseFilter).length === 0) {
    return jurisdictionFilter;
  }

  return {
    $and: [baseFilter, jurisdictionFilter]
  };
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

const canAccessApplicationByJurisdiction = (req, application = {}) => {
  if (isNationalScope(req.user)) {
    return true;
  }

  const applicationDistrict = normalizeDistrict(getApplicationDistrict(application));
  const allowedDistricts = getAdminDistricts(req.user).map(normalizeDistrict);

  return Boolean(applicationDistrict && allowedDistricts.includes(applicationDistrict));
};

module.exports = {
  isNationalScope,
  getAdminDistricts,
  applyAdminJurisdictionFilter,
  canAccessApplicationByJurisdiction
};
