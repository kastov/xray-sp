import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';
import type {
  AdminConfig,
  PublicConfig,
  SessionInfo,
} from '@status/shared';
import { DEFAULT_CONFIG } from '@status/shared';
import { AuthGuard } from './auth.guard';
import { AuthService, SESSION_COOKIE } from './auth.service';
import { LoginDto } from './login.dto';
import { mergeAdminConfig } from './config-validation';
import { StorageService } from '../storage/storage.service';
import {
  BRAND_CONTENT_TYPES,
  BrandService,
  MAX_LOGO_BYTES,
} from '../brand/brand.service';

interface UploadedLogo {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]);

@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly auth: AuthService,
    private readonly storage: StorageService,
    private readonly brand: BrandService,
  ) {}

  private currentConfig(): PublicConfig {
    return this.storage.getConfig() ?? DEFAULT_CONFIG;
  }

  private setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: this.auth.cookieMaxAgeMs,
    });
  }

  @Post('login')
  login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response): {
    authenticated: true;
    username: string;
  } {
    if (!this.auth.verifyCredentials(body.username, body.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.auth.sign(body.username);
    this.setSessionCookie(res, token);
    return { authenticated: true, username: body.username };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { authenticated: false } {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
    return { authenticated: false };
  }

  @Get('session')
  session(@Req() req: Request & { cookies?: Record<string, string> }): SessionInfo {
    const username = this.auth.verify(req.cookies?.[SESSION_COOKIE]);
    return username ? { authenticated: true, username } : { authenticated: false };
  }

  @UseGuards(AuthGuard)
  @Get('config')
  getConfig(): AdminConfig {
    return this.currentConfig();
  }

  @UseGuards(AuthGuard)
  @Put('config')
  async putConfig(@Body() body: unknown): Promise<AdminConfig> {
    const next = mergeAdminConfig(this.currentConfig(), body);
    await this.storage.setConfig(next);
    return next;
  }

  @UseGuards(AuthGuard)
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_BYTES },
    }),
  )
  async uploadLogo(@UploadedFile() file?: UploadedLogo): Promise<AdminConfig> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('File exceeds 2MB limit');
    }

    const ext = this.resolveExt(file);
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    this.brand.saveBrandImage(ext, file.buffer);

    const current = this.currentConfig();
    const next: AdminConfig = {
      branding: {
        ...current.branding,
        hasLogo: true,
        logoVersion: Date.now(),
      },
      theme: current.theme,
    };
    await this.storage.setConfig(next);
    return next;
  }

  @UseGuards(AuthGuard)
  @Delete('logo')
  async deleteLogo(): Promise<AdminConfig> {
    this.brand.removeBrandImage();
    const current = this.currentConfig();
    const next: AdminConfig = {
      branding: { ...current.branding, hasLogo: false },
      theme: current.theme,
    };
    await this.storage.setConfig(next);
    return next;
  }

  /** Resolve a safe extension from filename + mimetype, or null if unsupported. */
  private resolveExt(file: UploadedLogo): string | null {
    const name = (file.originalname || '').toLowerCase();
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot) : '';

    if (ext in BRAND_CONTENT_TYPES) return ext;

    // Fall back to mimetype when extension is missing/unknown.
    if (!ALLOWED_MIME.has(file.mimetype)) return null;
    switch (file.mimetype) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      case 'image/x-icon':
      case 'image/vnd.microsoft.icon':
        return '.ico';
      default:
        return null;
    }
  }
}
