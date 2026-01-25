/**
 * CSRF Protection Helper
 * 
 * Client-side CSRF token management.
 * Requires backend support for token generation and validation.
 */

const CSRF_TOKEN_KEY = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Get CSRF token from meta tag or cookie
 */
export function getCsrfToken(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    // Try to get from meta tag first (set by server)
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    // Fallback to sessionStorage (set by client after login)
    return sessionStorage.getItem(CSRF_TOKEN_KEY);
}

/**
 * Set CSRF token (called after login)
 */
export function setCsrfToken(token: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
}

/**
 * Clear CSRF token (called on logout)
 */
export function clearCsrfToken(): void {
    if (typeof window === 'undefined') {
        return;
    }

    sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Add CSRF token to request headers
 */
export function addCsrfHeader(headers: Record<string, string> = {}): Record<string, string> {
    const token = getCsrfToken();

    if (token) {
        return {
            ...headers,
            [CSRF_HEADER_NAME]: token,
        };
    }

    return headers;
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return protectedMethods.includes(method.toUpperCase());
}

// Export constants for use in API client
export { CSRF_HEADER_NAME, CSRF_TOKEN_KEY };
