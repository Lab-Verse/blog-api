import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserStatus } from '../users/entities/user.entity';

import { RolesService } from '../roles/roles.service';
import { EmailService } from './email.service';

interface ResetPasswordPayload {
  sub: string;
  type: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private rolesService: RolesService,
    private emailService: EmailService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername = await this.usersService.findByUsernameOrNull(dto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Allow any role value, don't restrict to enum

    // ✅ check if role_id exists in DB (assuming you have a Role entity/table)
    if (dto.role_id) {
      const roleExists = await this.rolesService.findById(dto.role_id);
      if (!roleExists) {
        throw new BadRequestException(`Invalid role_id: ${dto.role_id}`);
      }
    }

    // Note: usersService.create() handles password hashing
    // Set status to PENDING for all new registrations - admin must verify
    const userPayload: CreateUserDto = {
      username: dto.username,
      email: dto.email,
      password: dto.password, // Plain password - usersService.create() will hash it
      role: dto.role || 'visitor',
      status: UserStatus.PENDING,
    };

    const user = await this.usersService.create(userPayload);

    // Send notification email to admin for verification
    try {
      await this.emailService.sendNewUserRegistrationNotification({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Don't fail registration if email fails
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return {
      success: true,
      message: 'Registration successful! Your account is pending admin verification. You will receive an email once approved.',
      data: {
        user: result,
        // No tokens returned - user must wait for admin verification
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has admin role
    if (user.role_id) {
      const role = await this.rolesService.findById(user.role_id);
      if (!role || (role.slug !== 'admin' && role.slug !== 'super_admin')) {
        throw new UnauthorizedException('Access denied. Admin privileges required');
      }
    } else {
      throw new UnauthorizedException('Access denied. Admin privileges required');
    }

    const payload = { sub: user.id, email: user.email, role_id: user.role_id };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = await this.generateRefreshToken(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userResult } = user;
    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken: refreshToken.token,
        user: userResult,
      },
    };
  }

  // Frontend user login - checks user status
  async frontLogin(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check user status - must be ACTIVE to login
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Your account is pending admin verification. Please wait for approval.');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Your account has been deactivated. Please contact support.');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Your account has been banned. Please contact support.');
    }

    const payload = { sub: user.id, email: user.email, role_id: user.role_id };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = await this.generateRefreshToken(user.id);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userResult } = user;
    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken: refreshToken.token,
        user: userResult,
      },
    };
  }

  // Get current authenticated user
  async getMe(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      success: true,
      data: user,
    };
  }

  // Admin verify user - changes status from PENDING to ACTIVE
  async verifyUser(userId: string) {
    const user = await this.usersService.findOne(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException('User is not in pending status');
    }

    await this.usersService.update(userId, { status: UserStatus.ACTIVE });

    // Send notification email to user
    try {
      await this.emailService.sendUserVerifiedNotification({
        email: user.email,
        username: user.username,
      });
    } catch (emailError) {
      console.error('Failed to send verification notification email:', emailError);
    }

    return {
      success: true,
      message: 'User verified successfully',
    };
  }

  // Admin reject user - changes status to INACTIVE
  async rejectUser(userId: string, reason?: string) {
    const user = await this.usersService.findOne(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersService.update(userId, { status: UserStatus.INACTIVE });

    return {
      success: true,
      message: 'User rejected successfully',
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // Validate refreshToken to prevent NoSQL injection
    if (
      typeof dto.refreshToken !== 'string' ||
      !/^[A-Za-z0-9\-._~+/]+=*$/.test(dto.refreshToken)
    ) {
      throw new UnauthorizedException('Invalid refresh token format');
    }
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: dto.refreshToken, is_revoked: false },
      relations: ['user'],
    });

    if (!refreshToken || refreshToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = {
      sub: refreshToken.user.id,
      email: refreshToken.user.email,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: { accessToken },
    };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.refreshTokenRepository.update(
        { token: refreshToken },
        { is_revoked: true },
      );
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'password-reset' },
      { expiresIn: '1h' },
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/reset-password?token=${resetToken}`;

    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetUrl);
      return {
        success: true,
        message: 'Password reset link sent to your email',
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: true,
        message: 'Email service unavailable. Use this link:',
        token: resetToken,
        resetUrl,
      };
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify<ResetPasswordPayload>(dto.token);
      if (payload.type !== 'password-reset') {
        throw new UnauthorizedException('Invalid token type');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      await this.usersService.updatePassword(payload.sub, hashedPassword);

      await this.refreshTokenRepository.update(
        { user_id: payload.sub },
        { is_revoked: true },
      );

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async generateRefreshToken(userId: string): Promise<RefreshToken> {
    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '7d' },
    );

    const refreshToken = this.refreshTokenRepository.create({
      token,
      user_id: userId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return this.refreshTokenRepository.save(refreshToken);
  }
}
