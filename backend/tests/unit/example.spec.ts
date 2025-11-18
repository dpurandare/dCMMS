/**
 * Example unit test
 *
 * Unit tests should test individual functions/classes in isolation
 * without external dependencies (database, HTTP, etc.)
 */

describe('Example Unit Test Suite', () => {
  describe('calculateTotal', () => {
    it('should calculate the sum of numbers', () => {
      // Arrange
      const numbers = [1, 2, 3, 4, 5];
      const expected = 15;

      // Act
      const result = numbers.reduce((a, b) => a + b, 0);

      // Assert
      expect(result).toBe(expected);
    });

    it('should return 0 for empty array', () => {
      const numbers: number[] = [];
      const result = numbers.reduce((a, b) => a + b, 0);
      expect(result).toBe(0);
    });
  });

  describe('UUID validation', () => {
    it('should validate correct UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      expect(validUUID).toBeValidUUID();
    });

    it('should reject invalid UUID format', () => {
      const invalidUUID = 'not-a-uuid';
      expect(invalidUUID).not.toBeValidUUID();
    });
  });

  describe('Date validation', () => {
    it('should validate ISO 8601 date format', () => {
      const isoDate = '2025-11-18T12:00:00.000Z';
      expect(isoDate).toBeISO8601DateString();
    });

    it('should reject invalid date format', () => {
      const invalidDate = '2025-11-18';
      expect(invalidDate).not.toBeISO8601DateString();
    });
  });
});
