/**
 * OAuth Module
 *
 * Handles Google OAuth 2.0 authentication with PKCE.
 * Client-side only, no server required.
 */

import {
  CalendarAuth,
  OAuthConfig,
  PKCEChallenge,
  GoogleTokenResponse,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_CALENDAR_SCOPE,
  AUTH_STORAGE_KEY,
  PKCE_STORAGE_KEY,
  createCalendarError,
  CalendarError,
} from './types';

// ============================================
// PKCE Utilities
// ============================================

/**
 * Generate a cryptographically random string.
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create SHA-256 hash and base64url encode it.
 */
async function sha256Base64Url(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate PKCE challenge.
 */
export async function generatePKCEChallenge(): Promise<PKCEChallenge> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const state = generateRandomString(16);

  return {
    codeVerifier,
    codeChallenge,
    state,
  };
}

// ============================================
// OAuth Flow
// ============================================

/**
 * Get OAuth configuration.
 * Client ID should be set via environment variable.
 */
export function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  if (!clientId) {
    console.warn('NEXT_PUBLIC_GOOGLE_CLIENT_ID not set');
  }

  return {
    clientId,
    redirectUri: typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '',
    scope: GOOGLE_CALENDAR_SCOPE,
  };
}

/**
 * Initiate OAuth flow.
 * Redirects user to Google's authorization page.
 */
export async function initiateOAuth(): Promise<void> {
  const config = getOAuthConfig();

  if (!config.clientId) {
    throw createCalendarError('auth_required', 'Google Client ID not configured');
  }

  // Generate PKCE challenge
  const pkce = await generatePKCEChallenge();

  // Store PKCE verifier for callback
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PKCE_STORAGE_KEY, JSON.stringify(pkce));
  }

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state: pkce.state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

  // Redirect to Google
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback.
 * Exchanges authorization code for tokens.
 */
export async function handleOAuthCallback(
  code: string,
  state: string
): Promise<CalendarAuth> {
  const config = getOAuthConfig();

  // Retrieve stored PKCE challenge
  const pkceJson = sessionStorage.getItem(PKCE_STORAGE_KEY);
  if (!pkceJson) {
    throw createCalendarError('auth_required', 'PKCE challenge not found');
  }

  const pkce: PKCEChallenge = JSON.parse(pkceJson);

  // Verify state
  if (state !== pkce.state) {
    throw createCalendarError('auth_required', 'OAuth state mismatch');
  }

  // Exchange code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      code,
      code_verifier: pkce.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw createCalendarError('api_error', `Token exchange failed: ${error}`, {
      code: tokenResponse.status,
    });
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();

  // Clean up PKCE storage
  sessionStorage.removeItem(PKCE_STORAGE_KEY);

  // Create auth object
  const auth: CalendarAuth = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
  };

  // Store auth
  storeAuth(auth);

  return auth;
}

/**
 * Refresh access token using refresh token.
 */
export async function refreshAccessToken(auth: CalendarAuth): Promise<CalendarAuth> {
  const config = getOAuthConfig();

  if (!auth.refreshToken) {
    throw createCalendarError('auth_expired', 'No refresh token available');
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      refresh_token: auth.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();

    // If refresh fails with 400/401, token is invalid
    if (tokenResponse.status === 400 || tokenResponse.status === 401) {
      clearAuth();
      throw createCalendarError('auth_expired', 'Refresh token expired');
    }

    throw createCalendarError('api_error', `Token refresh failed: ${error}`, {
      code: tokenResponse.status,
    });
  }

  const tokens: GoogleTokenResponse = await tokenResponse.json();

  // Update auth (keep existing refresh token if not returned)
  const newAuth: CalendarAuth = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || auth.refreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    scope: tokens.scope,
  };

  // Store updated auth
  storeAuth(newAuth);

  return newAuth;
}

// ============================================
// Auth Storage
// ============================================

/**
 * Store auth credentials.
 */
export function storeAuth(auth: CalendarAuth): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  }
}

/**
 * Get stored auth credentials.
 */
export function getStoredAuth(): CalendarAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const authJson = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!authJson) {
    return null;
  }

  try {
    return JSON.parse(authJson) as CalendarAuth;
  } catch {
    return null;
  }
}

/**
 * Clear stored auth credentials.
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/**
 * Check if auth is expired or about to expire.
 */
export function isAuthExpired(auth: CalendarAuth, bufferMs: number = 60000): boolean {
  return Date.now() >= auth.expiresAt - bufferMs;
}

/**
 * Get valid auth, refreshing if needed.
 */
export async function getValidAuth(): Promise<CalendarAuth | null> {
  const auth = getStoredAuth();

  if (!auth) {
    return null;
  }

  // Check if expired
  if (isAuthExpired(auth)) {
    try {
      return await refreshAccessToken(auth);
    } catch (error) {
      // If refresh fails, return null to trigger re-auth
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  return auth;
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  const auth = getStoredAuth();
  return auth !== null;
}

/**
 * Sign out - clear all auth data.
 */
export function signOut(): void {
  clearAuth();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PKCE_STORAGE_KEY);
  }
}
