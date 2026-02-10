import { sanitizeHtml, sanitizeText, sanitizeInput, containsMaliciousContent } from '@/lib/sanitize';

// Mock DOMPurify for testing
jest.mock('dompurify', () => ({
    __esModule: true,
    default: {
        sanitize: jest.fn((input: string, options?: any) => {
            if (options?.ALLOWED_TAGS?.length === 0) {
                // Strip all HTML
                return input.replace(/<[^>]*>/g, '');
            }
            // Remove script tags
            return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }),
    },
}));

describe('Sanitization Utilities', () => {
    describe('sanitizeHtml', () => {
        it('should allow safe HTML tags', () => {
            const input = '<p>Hello <b>World</b></p>';
            const result = sanitizeHtml(input);
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });

        it('should remove script tags', () => {
            const input = '<p>Safe</p><script>alert("XSS")</script>';
            const result = sanitizeHtml(input);
            expect(result).not.toContain('script');
            expect(result).not.toContain('alert');
        });

        it('should handle empty string', () => {
            expect(sanitizeHtml('')).toBe('');
        });
    });

    describe('sanitizeText', () => {
        it('should strip all HTML tags', () => {
            const input = '<p>Hello <b>World</b></p>';
            const result = sanitizeText(input);
            expect(result).toBe('Hello World');
        });

        it('should remove script tags', () => {
            const input = 'Safe<script>alert("XSS")</script>Text';
            const result = sanitizeText(input);
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
        });
    });

    describe('sanitizeInput', () => {
        it('should trim whitespace', () => {
            expect(sanitizeInput('  hello  ')).toBe('hello');
        });

        it('should remove script tags', () => {
            const input = 'text<script>alert(1)</script>more';
            const result = sanitizeInput(input);
            expect(result).not.toContain('script');
        });

        it('should remove inline event handlers', () => {
            const input = '<div onclick="alert(1)">Click</div>';
            const result = sanitizeInput(input);
            expect(result).not.toContain('onclick');
        });

        it('should remove javascript: protocol', () => {
            const input = '<a href="javascript:alert(1)">Link</a>';
            const result = sanitizeInput(input);
            expect(result).not.toContain('javascript:');
        });
    });

    describe('containsMaliciousContent', () => {
        it('should detect script tags', () => {
            expect(containsMaliciousContent('<script>alert(1)</script>')).toBe(true);
        });

        it('should detect javascript: protocol', () => {
            expect(containsMaliciousContent('javascript:alert(1)')).toBe(true);
        });

        it('should detect inline event handlers', () => {
            expect(containsMaliciousContent('<div onclick="hack()">')).toBe(true);
        });

        it('should detect iframe tags', () => {
            expect(containsMaliciousContent('<iframe src="evil.com">')).toBe(true);
        });

        it('should return false for safe content', () => {
            expect(containsMaliciousContent('<p>Safe content</p>')).toBe(false);
        });

        it('should return false for plain text', () => {
            expect(containsMaliciousContent('Just plain text')).toBe(false);
        });
    });
});
