// Jest setup file for auth-service tests

// Set environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_ISSUER = 'test-auth-service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn().mockImplementation((plaintext: string, hash: string) => {
    // Return true only if plaintext matches expected password
    return Promise.resolve(plaintext === 'correct-password' || plaintext === 'my-secret' || plaintext === 'test' || plaintext === 'password');
  }),
  hashSync: jest.fn().mockReturnValue('$2b$12$hashedpassword'),
}));

// Mock speakeasy
jest.mock('speakeasy', () => ({
  totp: {
    verify: jest.fn().mockReturnValue(true),
  },
  generateSecret: jest.fn().mockReturnValue({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url: 'otpauth://totp/Platform:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Platform',
  }),
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
}));

// Global test setup
beforeAll(() => {
  // Set timezone for consistent date testing
  process.env.TZ = 'UTC';
});
