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
        const handoffToken = this.authService.createOAuthHandoffToken(login.access_token);
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
}
