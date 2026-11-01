import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto) {
    const normalizedUsername = dto.username.trim().toLowerCase();
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: normalizedUsername, mode: 'insensitive' } },
          ...(dto.email ? [{ email: { equals: dto.email.trim().toLowerCase(), mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username.toLowerCase() === normalizedUsername) {
        throw new ConflictException({
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken',
        });
      }
      throw new ConflictException({
        code: 'EMAIL_IN_USE',
        message: 'Email address is already in use',
      });
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: normalizedUsername,
          email: dto.email ? dto.email.trim().toLowerCase() : null,
          phone: dto.phone ? dto.phone.trim() : null,
          passwordHash,
          accountStatus: 'active',
          isVerified: false,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          displayName: dto.displayName.trim(),
        },
      });

      await tx.userSetting.create({
        data: {
          userId: newUser.id,
          showOnlineStatus: true,
          showLastSeen: true,
          themePreference: 'system',
        },
      });

      return newUser;
    });

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    const tokens = await this.generateTokens(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: profile?.displayName || user.username,
        avatarMediaId: profile?.avatarMediaId,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: {
        profile: true,
        settings: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password',
      });
    }

    if (user.accountStatus !== 'active') {
      throw new UnauthorizedException({
        code: 'ACCOUNT_INACTIVE',
        message: `Account is ${user.accountStatus}`,
      });
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username/email or password',
      });
    }

    const tokens = await this.generateTokens(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.profile?.displayName || user.username,
        bio: user.profile?.bio,
        avatarMediaId: user.profile?.avatarMediaId,
        coverMediaId: user.profile?.coverMediaId,
        themePreference: user.settings?.themePreference || 'system',
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret') || 'chithi_super_secret_jwt_refresh_key_2026_dev',
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is expired or invalid',
      });
    }

    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'Session has expired or has been revoked',
      });
    }

    // Revoke current session
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    return this.generateTokens(session.userId, session.user.username);
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, userId },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true, message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, username: string) {
    const sessionId = randomUUID();
    const accessSecret = this.configService.get<string>('jwt.accessSecret') || 'chithi_super_secret_jwt_access_key_2026_dev';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'chithi_super_secret_jwt_refresh_key_2026_dev';

    const accessToken = this.jwtService.sign(
      { sub: userId, username, sessionId },
      { secret: accessSecret, expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, username, sessionId },
      { secret: refreshSecret, expiresIn: '7d' },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 mins
    };
  }
}
