import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('auth')
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Audit({ action: 'USER_REGISTER', resource: 'User' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Audit({ action: 'USER_LOGIN', resource: 'User' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('front-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @Audit({ action: 'USER_FRONT_LOGIN', resource: 'User' })
  async frontLogin(@Body() dto: LoginDto) {
    return this.authService.frontLogin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Post('admin/verify-user/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Audit({ action: 'ADMIN_VERIFY_USER', resource: 'User' })
  async verifyUser(@Param('id') id: string) {
    return this.authService.verifyUser(id);
  }

  @Post('admin/reject-user/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Audit({ action: 'ADMIN_REJECT_USER', resource: 'User' })
  async rejectUser(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.authService.rejectUser(id, reason);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Audit({ action: 'USER_LOGOUT', resource: 'User' })
  async logout(@Body() body: { refreshToken?: string }) {
    return this.authService.logout(body?.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 2 } })
  @Audit({ action: 'FORGOT_PASSWORD', resource: 'User' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @Audit({ action: 'RESET_PASSWORD', resource: 'User' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
