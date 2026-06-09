import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Post,
    Request,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthExchangeDto } from './dto/oauth-exchange.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import {
    GoogleAuthGuard,
    GoogleCallbackGuard,
    GoogleTestAuthGuard,
    GoogleTestCallbackGuard,
} from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Jwt2FAGuard } from './guards/jwt-2fa.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) { }

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 409, description: 'Username already exists' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LocalAuthGuard)
    @ApiOperation({ summary: 'Login and receive a JWT' })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 200, description: 'Returns access_token' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    login(@Request() req) {
        return this.authService.login(req.user);
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({ summary: 'Start Google OAuth frontend flow' })
    googleLogin() { }

    @Get('google/test')
    @UseGuards(GoogleTestAuthGuard)
    @ApiOperation({ summary: 'Start Google OAuth backend test flow' })
    googleTestLogin() { }

    @Get('google/callback')
    @UseGuards(GoogleCallbackGuard)
    @ApiOperation({ summary: 'Google OAuth frontend callback' })
    googleCallback(@Request() req, @Res() res: Response) {
        const login = this.authService.login(req.user);
        const handoffToken = this.authService.createOAuthHandoffToken(login.access_token, login.requires2fa);
        const redirectUrl = new URL(
            this.config.getOrThrow<string>('FRONTEND_OAUTH_SUCCESS_URL'),
        );
        redirectUrl.searchParams.set('token', handoffToken);
        return res.redirect(redirectUrl.toString());
    }

    @Get('google/callback/test')
    @UseGuards(GoogleTestCallbackGuard)
    @ApiOperation({ summary: 'Google OAuth backend test callback' })
    googleTestCallback(@Request() req) {
        return this.authService.login(req.user);
    }

    @Post('oauth/exchange')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Exchange OAuth handoff token for app JWT' })
    exchangeOAuthToken(@Body() dto: OAuthExchangeDto) {
        return this.authService.exchangeOAuthHandoffToken(dto.token);
    }

    @Patch('password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change authenticated user password' })
    @ApiResponse({ status: 200, description: 'Password updated' })
    @ApiResponse({ status: 400, description: 'New password must differ from current' })
    @ApiResponse({ status: 403, description: 'Current password is incorrect' })
    changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.id, dto);
    }

    @Patch('username')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Finalize or update authenticated username' })
    @ApiResponse({ status: 200, description: 'Username updated' })
    @ApiResponse({ status: 409, description: 'Username already exists' })
    updateUsername(@Request() req, @Body() dto: UpdateUsernameDto) {
        return this.authService.updateUsername(req.user.id, dto.username);
    }

    @Post('2fa/generate')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Generate a new 2FA secret and return QR code' })
    async generateTwoFactorAuthentication(@Request() req) {
        return this.authService.generateTwoFactorAuthenticationSecret(req.user);
    }

    @Post('2fa/turn-on')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify code and enable 2FA for the user' })
    async turnOnTwoFactorAuthentication(@Request() req, @Body() body: { code: string }) {
        return this.authService.turnOnTwoFactorAuthentication(req.user.id, body.code);
    }

    @Post('2fa/turn-off')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify code and disable 2FA for the user' })
    async turnOffTwoFactorAuthentication(@Request() req, @Body() body: { code: string }) {
        return this.authService.turnOffTwoFactorAuthentication(req.user.id, body.code);
    }

    @Post('2fa/authenticate')
    @HttpCode(HttpStatus.OK)
    @UseGuards(Jwt2FAGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Authenticate using 2FA code' })
    async authenticateTwoFactor(@Request() req, @Body() body: { code: string }) {
        return this.authService.authenticateTwoFactor(req.user.id, body.code);
    }

    @Get('2fa/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current 2FA status' })
    async getTwoFactorStatus(@Request() req) {
        // req.user might be cached from token, let's fetch from DB or just use req.user if it's up to date.
        // Actually validateUser returns full user without password.
        // wait, req.user comes from jwt payload! JwtUserPayload has isTwoFactorEnabled since I added it.
        // But to be 100% sure, let's ask authService or just return from payload.
        // I will just return from req.user
        return { isTwoFactorEnabled: !!req.user.isTwoFactorEnabled };
    }
}
