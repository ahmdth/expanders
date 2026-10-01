import { ConfigService } from '@nestjs/config';
import type { JwtSignerOptions } from '@nestjs/authentication';

/** One source of truth for the access-token options: used by AuthenticationModule and by AuthService's signer. */
export function buildJwtOptions(config: ConfigService): JwtSignerOptions {
  return {
    key: config.getOrThrow<string>('JWT_SECRET'), // HS256 secret, at least 32 bytes
    issuer: 'expanders360-api',
    audience: 'expanders360-clients',
    ttl: (config.get<string>('JWT_EXPIRES_IN') ?? '1h') as JwtSignerOptions['ttl'],
  };
}
