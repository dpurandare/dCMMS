import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Allows safe HTML tags for rich text formatting
 */
export function sanitizeHtml(dirty: string): string {
    if (typeof window === 'undefined') {
        // Server-side: return as-is (will be sanitized on client)
        return dirty;
    }

    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
        ALLOW_DATA_ATTR: false,
    });
}

/**
 * Sanitize plain text (strips all HTML)
 * Use for user input that should never contain HTML
 */
export function sanitizeText(dirty: string): string {
    if (typeof window === 'undefined') {
        return dirty.replace(/<[^>]*>/g, '');
    }

    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize user input before storing/displaying
 * Removes dangerous scripts and attributes
 */
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove inline event handlers
        .replace(/javascript:/gi, ''); // Remove javascript: protocol
}

/**
 * Check if string contains potentially malicious content
 */
export function containsMaliciousContent(input: string): boolean {
    const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
    ];

    return maliciousPatterns.some((pattern) => pattern.test(input));
}
