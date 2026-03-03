// lib/suredone-config.js
// Shared SureDone API configuration
// Resolves both legacy (SUREDONE_USER/TOKEN) and newer (SUREDONE_API_USER/TOKEN) env vars

export function getSureDoneCredentials() {
  const user = process.env.SUREDONE_API_USER || process.env.SUREDONE_USER;
  const token = process.env.SUREDONE_API_TOKEN || process.env.SUREDONE_TOKEN || process.env.SUREDONE_PASS;
  const baseUrl = process.env.SUREDONE_URL || 'https://api.suredone.com/v1';

  if (!user || !token) {
    throw new Error('Missing SureDone credentials. Set SUREDONE_API_USER and SUREDONE_API_TOKEN (or SUREDONE_USER and SUREDONE_TOKEN) in environment.');
  }

  return { user, token, baseUrl };
}

export function getSureDoneHeaders() {
  const { user, token } = getSureDoneCredentials();
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-auth-user': user,
    'x-auth-token': token,
  };
}

export function getSureDoneJsonHeaders() {
  const { user, token } = getSureDoneCredentials();
  return {
    'Content-Type': 'application/json',
    'x-auth-user': user,
    'x-auth-token': token,
  };
}
