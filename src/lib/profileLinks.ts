const PUBLIC_PROFILE_BASE_URL = 'https://chatr.chat';

export const normalizePublicHandle = (handle?: string | null) =>
  (handle || '').replace(/^@/, '').trim().toLowerCase();

export const buildPublicProfilePath = (handle?: string | null) => {
  const normalizedHandle = normalizePublicHandle(handle);
  return normalizedHandle ? `/${normalizedHandle}` : '/';
};

export const buildPublicProfileUrl = (handle?: string | null) =>
  `${PUBLIC_PROFILE_BASE_URL}${buildPublicProfilePath(handle)}`;