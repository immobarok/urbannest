import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import {
  AuthTokensEntity,
  MessageResponseEntity,
  ProfileEntity,
  RegisterResponseEntity,
} from './entities';
import type { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseEntity> {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(
    @Request() req: { user: Omit<User, 'passwordHash'> },
  ): AuthTokensEntity {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<MessageResponseEntity> {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<MessageResponseEntity> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<MessageResponseEntity> {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensEntity> {
    return this.authService.refreshToken(dto);
  }

  @Get('me')
  getProfile(@CurrentUser() user: ProfileEntity): ProfileEntity {
    return user;
  }
}
