import bcrypt from 'bcrypt';
import { AuthService } from '../services/AuthService';
import { AppDataSource } from '../config/database';

// Mock TypeORM
jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    initialize: jest.fn(),
  },
}));

const mockUserRepo = {
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};
const mockSessionRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn() };
const mockProviderRepo = { find: jest.fn().mockResolvedValue([]) };

(AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
  const name = entity?.name || '';
  if (name === 'User') return mockUserRepo;
  if (name === 'AuthSession') return mockSessionRepo;
  return mockProviderRepo;
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  describe('authenticateLocal', () => {
    it('returns error for unknown user (timing-safe)', async () => {
      const qb = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(null) };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await authService.authenticateLocal('unknown@test.com', 'password', 'tenant1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('returns error for wrong password', async () => {
      const hashedPw = await bcrypt.hash('correct-password', 10);
      const qb = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue({ id: '1', email: 'u@t.com', password: hashedPw, roles: ['user'], isActive: true, mfaEnabled: false }) };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
      mockUserRepo.save.mockResolvedValue({});
      mockSessionRepo.create.mockReturnValue({ expiresAt: new Date(Date.now() + 3600000) });
      mockSessionRepo.save.mockResolvedValue({});

      const result = await authService.authenticateLocal('u@t.com', 'wrong-password', 'tenant1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('succeeds with correct credentials', async () => {
      const hashedPw = await bcrypt.hash('correct-password', 10);
      const user = { id: '1', email: 'u@t.com', password: hashedPw, roles: ['user'], isActive: true, mfaEnabled: false, tenantId: 'tenant1' };
      const qb = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(user) };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
      mockUserRepo.save.mockResolvedValue(user);
      mockSessionRepo.create.mockReturnValue({ expiresAt: new Date(Date.now() + 3600000) });
      mockSessionRepo.save.mockResolvedValue({});

      const result = await authService.authenticateLocal('u@t.com', 'correct-password', 'tenant1');
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('requires MFA token when mfaEnabled is true', async () => {
      const hashedPw = await bcrypt.hash('password', 10);
      const user = { id: '1', email: 'u@t.com', password: hashedPw, roles: ['user'], isActive: true, mfaEnabled: true, mfaSecret: 'JBSWY3DPEHPK3PXP', tenantId: 'tenant1' };
      const qb = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(user) };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);
      mockUserRepo.save.mockResolvedValue(user);

      const result = await authService.authenticateLocal('u@t.com', 'password', 'tenant1');
      expect(result.success).toBe(false);
      expect((result as any).mfaRequired).toBe(true);
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies correctly', async () => {
      const hash = await authService.hashPassword('my-secret');
      expect(await authService.verifyPassword('my-secret', hash)).toBe(true);
      expect(await authService.verifyPassword('wrong', hash)).toBe(false);
    });

    it('uses bcrypt rounds >= 12', async () => {
      const hash = await authService.hashPassword('test');
      const rounds = parseInt(hash.split('$')[2]);
      expect(rounds).toBeGreaterThanOrEqual(12);
    });
  });
});