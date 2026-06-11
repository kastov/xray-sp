import { Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { AppConfigService } from '../config/app-config.service';

/** Accepted upload extensions mapped to their content types. */
export const BRAND_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

@Injectable()
export class BrandService {
  constructor(private readonly config: AppConfigService) {}

  private ensureDir(): void {
    mkdirSync(this.config.brandDir, { recursive: true });
  }

  /** Absolute path of the stored brand image, or null if none. */
  findBrandImage(): string | null {
    const dir = this.config.brandDir;
    if (!existsSync(dir)) return null;
    let names: string[];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return null;
    }
    for (const fn of names) {
      const low = fn.toLowerCase();
      if (!low.startsWith('logo.')) continue;
      const ext = low.slice(low.lastIndexOf('.'));
      if (ext in BRAND_CONTENT_TYPES) return join(dir, fn);
    }
    return null;
  }

  contentTypeFor(path: string): string {
    const low = path.toLowerCase();
    const ext = low.slice(low.lastIndexOf('.'));
    return BRAND_CONTENT_TYPES[ext] ?? 'application/octet-stream';
  }

  /** Remove any prior brand file. */
  removeBrandImage(): void {
    const existing = this.findBrandImage();
    if (existing) rmSync(existing, { force: true });
  }

  /** Persist a new logo for the given extension (e.g. ".png"); returns saved path. */
  saveBrandImage(ext: string, data: Buffer): string {
    this.ensureDir();
    this.removeBrandImage();
    const path = join(this.config.brandDir, `logo${ext}`);
    writeFileSync(path, data);
    return path;
  }
}
