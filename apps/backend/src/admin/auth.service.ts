import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppConfigService } from '../config/app-config.service';

export const SESSION_COOKIE = 'sp_session';
const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60; // 7 days

interface SessionPayload {
  u: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly config: AppConfigService) {}

  /** Constant-time credential check against env-configured admin creds. */
  verifyCredentials(username: string, password: string): boolean {
    return (
      this.safeEqual(username, this.config.adminUsername) &&
      this.safeEqual(password, this.config.adminPassword)
    );
  }

  /** Sign a session JWT for the given username (7d expiry). */
  sign(username: string): string {
    return jwt.sign({ u: username } satisfies SessionPayload, this.config.sessionSecret, {
      expiresIn: SESSION_MAX_AGE_SEC,
    });
  }

  /** Validate a session token, returning the username or null. */
  verify(token: string | undefined): string | null {
    if (!token) return null;
    try {
      const decoded = jwt.verify(token, this.config.sessionSecret) as SessionPayload;
      return typeof decoded?.u === 'string' ? decoded.u : null;
    } catch {
      return null;
    }
  }

  get cookieMaxAgeMs(): number {
    return SESSION_MAX_AGE_SEC * 1000;
  }

  private safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) {
      // Still run a comparison to reduce timing signal on length.
      timingSafeEqual(ba, ba);
      return false;
    }
    return timingSafeEqual(ba, bb);
  }
}
