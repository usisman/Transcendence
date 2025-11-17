import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'url';
import { createDatabaseConnection } from './database.js';
import type { AppDatabase } from './database.js';
import { env } from './env.js';
import { createRateLimiter } from './rate-limit.js';
import client, { type Registry } from 'prom-client';

const ACCESS_COOKIE_NAME = 'session';
const REFRESH_COOKIE_NAME = 'refresh_session';
const OAUTH_SENTINEL = 'GOOGLE_OAUTH_ACCOUNT';
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 saat
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 gün
const GOOGLE_STATE_COOKIE = 'google_oauth_state';
const GOOGLE_STATE_TTL_SECONDS = 5 * 60;
const FRONTEND_AUTH_PATH = '/#/auth';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GOOGLE_SCOPES = ['openid', 'email', 'profile'];

const metricsRegistry: Registry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request süreleri',
  labelNames: ['method', 'route', 'statusCode'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});

const tournamentCreatedCounter = new client.Counter({
  name: 'tournament_created_total',
  help: 'Oluşturulan turnuva sayısı',
  labelNames: ['ownerProvider']
});

const tournamentJoinedCounter = new client.Counter({
  name: 'tournament_join_total',
  help: 'Turnuvaya katılım sayısı',
  labelNames: ['provider']
});

const tournamentStartedCounter = new client.Counter({
  name: 'tournament_started_total',
  help: 'Başlatılan turnuva sayısı'
});

metricsRegistry.registerMetric(httpRequestDuration);
metricsRegistry.registerMetric(tournamentCreatedCounter);
metricsRegistry.registerMetric(tournamentJoinedCounter);
metricsRegistry.registerMetric(tournamentStartedCounter);

function responseErrorSchema() {
  return {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' }
    },
    required: ['error', 'message']
  };
}

function responseUserSchema() {
  return {
    type: 'object',
    properties: {
      id: { type: 'number' },
      email: { type: 'string' },
      nickname: { type: 'string' },
      provider: { type: 'string' }
    },
    required: ['id', 'email', 'nickname', 'provider']
  };
}

type ManualRegisterBody = {
  email: string;
  nickname: string;
  password: string;
};

type ManualRegisterSuccess = {
  id: number;
  email: string;
  nickname: string;
};

type ApiErrorResponse = {
  error: string;
  message: string;
};

type ManualRegisterReply = ManualRegisterSuccess | ApiErrorResponse;

type GoogleRegisterBody = {
  email: string;
  nickname: string;
  googleId: string;
};

type GoogleRegisterSuccess = {
  id: number;
  email: string;
  nickname: string;
  provider: 'google';
};

type GoogleRegisterReply = GoogleRegisterSuccess | ApiErrorResponse;

type ManualLoginBody = {
  email: string;
  password: string;
};

type GoogleLoginBody = {
  googleId: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  refresh_token?: string;
  scope?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  picture?: string;
  locale?: string;
  hd?: string;
};

type JwtBasePayload = {
  sub: number;
  email: string;
  nickname: string;
  provider: 'local' | 'google';
};

type JwtPayload = JwtBasePayload & {
  tokenType: 'access' | 'refresh';
};

type LoginSuccess = {
  id: number;
  email: string;
  nickname: string;
  provider: 'local' | 'google';
};

type ManualLoginReply = LoginSuccess | ApiErrorResponse;
type GoogleLoginReply = LoginSuccess | ApiErrorResponse;
type MeResponse = LoginSuccess;
type ProfileResponse = {
  id: number;
  email: string;
  nickname: string;
  provider: 'local' | 'google';
  createdAt: string;
};

type UpdateProfileBody = {
  nickname: string;
};

type CreateTournamentBody = {
  name: string;
  maxPlayers: number;
};

type TournamentDTO = {
  id: number;
  name: string;
  ownerId: number | null;
  ownerNickname: string | null;
  status: 'pending' | 'active';
  maxPlayers: number;
  currentPlayers: number;
  createdAt: string;
  startedAt?: string;
  bracket?: Record<string, unknown> | null;
};

type TournamentRow = {
  id: number;
  name: string;
  owner_id: number | null;
  owner_nickname: string | null;
  max_players: number;
  status: string;
  player_count: number;
  bracket_json: string | null;
  created_at: string;
  started_at: string | null;
};

type TournamentPlayerRow = {
  alias: string;
  is_ai: number;
};

const manualRegisterSchema = {
  body: {
    type: 'object',
    required: ['email', 'nickname', 'password'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 256 },
      nickname: { type: 'string', minLength: 3, maxLength: 48 },
      password: { type: 'string', minLength: 8, maxLength: 128 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        email: { type: 'string' },
        nickname: { type: 'string' }
      },
      required: ['id', 'email', 'nickname']
    },
    409: responseErrorSchema(),
    500: responseErrorSchema()
  }
} as const;

const googleRegisterSchema = {
  body: {
    type: 'object',
    required: ['email', 'nickname', 'googleId'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 256 },
      nickname: { type: 'string', minLength: 3, maxLength: 48 },
      googleId: { type: 'string', minLength: 1, maxLength: 256 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        email: { type: 'string' },
        nickname: { type: 'string' },
        provider: { type: 'string', const: 'google' }
      },
      required: ['id', 'email', 'nickname', 'provider']
    },
    409: responseErrorSchema(),
    500: responseErrorSchema()
  }
} as const;

const manualLoginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    additionalProperties: false,
    properties: {
      email: { type: 'string', format: 'email', maxLength: 256 },
      password: { type: 'string', minLength: 8, maxLength: 128 }
    }
  },
  response: {
    200: responseUserSchema(),
    401: responseErrorSchema(),
    500: responseErrorSchema()
  }
} as const;

const googleLoginSchema = {
  body: {
    type: 'object',
    required: ['googleId'],
    additionalProperties: false,
    properties: {
      googleId: { type: 'string', minLength: 1, maxLength: 256 }
    }
  },
  response: {
    200: responseUserSchema(),
    404: responseErrorSchema(),
    500: responseErrorSchema()
  }
} as const;

const whoAmISchema = {
  response: {
    200: responseUserSchema()
  }
} as const;

const refreshSchema = {
  response: {
    200: responseUserSchema(),
    401: responseErrorSchema()
  }
} as const;

const createAccessToken = (payload: JwtBasePayload) =>
  jwt.sign({ ...payload, tokenType: 'access' }, env.jwtSecret, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS
  });

const createRefreshToken = (payload: JwtBasePayload) =>
  jwt.sign({ ...payload, tokenType: 'refresh' }, env.jwtSecret, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS
  });

const serializeCookie = (name: string, value: string, maxAge: number) =>
  cookie.serialize(name, value, {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax',
    secure: env.cookieSecure
  });

const appendCookies = (reply: FastifyReply, cookiesToAdd: string[]) => {
  const existing = reply.getHeader('Set-Cookie');
  if (!existing) {
    reply.header('Set-Cookie', cookiesToAdd);
    return;
  }

  if (Array.isArray(existing)) {
    reply.header('Set-Cookie', [...existing, ...cookiesToAdd]);
    return;
  }

  reply.header('Set-Cookie', [existing as string, ...cookiesToAdd]);
};

const issueTokens = (reply: FastifyReply, payload: JwtBasePayload) => {
  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  appendCookies(reply, [
    serializeCookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_TOKEN_TTL_SECONDS),
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_TOKEN_TTL_SECONDS)
  ]);
};

const clearSessionCookies = (reply: FastifyReply) => {
  appendCookies(reply, [
    serializeCookie(ACCESS_COOKIE_NAME, '', 0),
    serializeCookie(REFRESH_COOKIE_NAME, '', 0)
  ]);
};

const clearOauthStateCookie = (reply: FastifyReply) => {
  appendCookies(reply, [serializeCookie(GOOGLE_STATE_COOKIE, '', 0)]);
};

const decodeToken = (token: string, expectedType: JwtPayload['tokenType']): JwtBasePayload => {
  const payload = jwt.verify(token, env.jwtSecret);

  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid token payload');
  }

  const record = payload as Record<string, unknown>;
  const tokenType = record.tokenType;
  const subRaw = record.sub;
  const email = record.email;
  const nickname = record.nickname;
  const provider = record.provider;

  if (tokenType !== expectedType) {
    throw new Error('Invalid token type');
  }

  const sub =
    typeof subRaw === 'number'
      ? subRaw
      : typeof subRaw === 'string'
        ? Number(subRaw)
        : NaN;

  if (
    Number.isNaN(sub) ||
    typeof email !== 'string' ||
    typeof nickname !== 'string' ||
    (provider !== 'local' && provider !== 'google')
  ) {
    throw new Error('Invalid token claims');
  }

  return {
    sub,
    email,
    nickname,
    provider
  };
};

const normalizeNickname = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 32);

const ensureUniqueNickname = async (db: AppDatabase, desired: string) => {
  const base = normalizeNickname(desired) || 'player';
  let candidate = base;
  let counter = 1;

  // Nickname kolonunda benzersizliği sağlayana kadar deneyerek ilerliyoruz.
  // Her denemede suffix ekleyip 48 karakter sınırını koruyoruz.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.get(`SELECT 1 FROM users WHERE nickname = ?`, candidate);
    if (!existing) {
      return candidate;
    }

    const suffix = `-${counter++}`;
    const maxBaseLength = Math.max(1, 48 - suffix.length);
    candidate = `${base.slice(0, maxBaseLength)}${suffix}`;
  }
};

const buildGoogleAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'online',
    prompt: 'select_account',
    state
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

const buildFrontendRedirect = (status?: string) =>
  status ? `${FRONTEND_AUTH_PATH}?oauth=${status}` : FRONTEND_AUTH_PATH;

const isPowerOfTwo = (value: number) => value > 0 && (value & (value - 1)) === 0;

const shuffle = <T>(items: T[]) => {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
};

const chunkPairs = <T>(items: T[]) => {
  const pairs: Array<[T, T]> = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push([items[i], items[i + 1]]);
  }
  return pairs;
};

const createUniqueAlias = async (
  db: AppDatabase,
  tournamentId: number,
  desiredAlias: string
) => {
  const base = desiredAlias.trim().slice(0, 32) || 'Player';
  let alias = base;
  let counter = 1;

  // Alias benzersiz olana kadar turnuva tablosunda kontrol ediyoruz.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db.get(
      `
        SELECT 1
        FROM tournament_players
        WHERE tournament_id = ?
          AND LOWER(alias) = LOWER(?)
      `,
      tournamentId,
      alias
    );
    if (!existing) {
      return alias;
    }
    const suffix = `-${counter++}`;
    alias = `${base.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
  }
};

const mapTournamentRow = (row: TournamentRow): TournamentDTO => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  ownerNickname: row.owner_nickname,
  status: row.status === 'active' ? 'active' : 'pending',
  maxPlayers: row.max_players,
  currentPlayers: row.player_count,
  createdAt: row.created_at,
  startedAt: row.started_at ?? undefined,
  bracket: row.bracket_json ? (JSON.parse(row.bracket_json) as Record<string, unknown>) : null
});

function registerSecurityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    return payload;
  });
}

function registerAuthenticationHelpers(app: FastifyInstance) {
  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const unauthorizedResponse = () => {
        request.session = undefined;
        clearSessionCookies(reply);
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Bu işlemi gerçekleştirmek için giriş yapmalısın.'
        });
      };

      const cookies = cookie.parse(request.headers.cookie ?? '');
      const token = cookies[ACCESS_COOKIE_NAME];

      if (!token) {
        return unauthorizedResponse();
      }

      try {
        request.session = decodeToken(token, 'access');
      } catch {
        return unauthorizedResponse();
      }
    }
  );
}

export const buildServer = () => {
  const app = Fastify({ logger: true });
  const METRICS_START = Symbol('metrics-start');

  app.addHook('onRequest', (request, _reply, done) => {
    (request as FastifyRequest & { [METRICS_START]?: bigint })[METRICS_START] = process.hrtime.bigint();
    done();
  });

  app.addHook('onResponse', (request, reply, done) => {
    const start = (request as FastifyRequest & { [METRICS_START]?: bigint })[METRICS_START];
    if (start) {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      const route =
        (request.routerPath as string | undefined) ??
        request.routeOptions?.url ??
        request.url ??
        'unknown';
      httpRequestDuration.labels(request.method, route, String(reply.statusCode)).observe(duration);
    }
    done();
  });
  const registerRateLimiter = createRateLimiter({
    limit: 8,
    windowMs: 10 * 60 * 1000,
    errorMessage: 'Çok fazla kayıt denemesi yaptın. Lütfen bir süre sonra tekrar dene.'
  });
  const loginRateLimiter = createRateLimiter({
    limit: 5,
    windowMs: 60 * 1000,
    errorMessage: 'Çok fazla giriş denemesi yaptın. Lütfen 1 dakika sonra tekrar dene.'
  });
  const refreshRateLimiter = createRateLimiter({
    limit: 10,
    windowMs: 60 * 1000,
    errorMessage: 'Çok fazla yenileme isteği gönderildi. Lütfen birkaç saniye sonra tekrar dene.'
  });

  registerSecurityHeaders(app);
  registerAuthenticationHelpers(app);

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', metricsRegistry.contentType);
    return metricsRegistry.metrics();
  });
  app.get('/api/users/oauth/google/start', async (_, reply) => {
    const state = randomBytes(24).toString('hex');

    appendCookies(reply, [serializeCookie(GOOGLE_STATE_COOKIE, state, GOOGLE_STATE_TTL_SECONDS)]);

    const googleUrl = buildGoogleAuthUrl(state);
    reply.redirect(googleUrl);
  });

  type GoogleCallbackQuery = {
    code?: string;
    state?: string;
    error?: string;
  };

  app.get<{ Querystring: GoogleCallbackQuery }>(
    '/api/users/oauth/google/callback',
    async (request, reply) => {
      const redirectWithStatus = (status: string) =>
        reply.redirect(303, buildFrontendRedirect(status));

      const { code, state, error } = request.query;

      if (error) {
        clearOauthStateCookie(reply);
        request.log.warn({ error }, 'Google OAuth reddedildi');
        return redirectWithStatus('denied');
      }

      if (!code || !state) {
        clearOauthStateCookie(reply);
        return redirectWithStatus('missing_params');
      }

      const cookies = cookie.parse(request.headers.cookie ?? '');
      const storedState = cookies[GOOGLE_STATE_COOKIE];

      if (!storedState || storedState !== state) {
        clearOauthStateCookie(reply);
        request.log.warn({ storedState, state }, 'Google OAuth state eşleşmedi');
        return redirectWithStatus('state_mismatch');
      }

      clearOauthStateCookie(reply);

      let tokenData: GoogleTokenResponse;
      try {
        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.googleClientId,
            client_secret: env.googleClientSecret,
            redirect_uri: env.googleRedirectUri,
            grant_type: 'authorization_code'
          }).toString()
        });

        if (!tokenResponse.ok) {
          request.log.error({ status: tokenResponse.status }, 'Google token isteği başarısız');
          return redirectWithStatus('token_error');
        }

        tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
      } catch (fetchError) {
        request.log.error({ err: fetchError }, 'Google token isteği sırasında hata');
        return redirectWithStatus('token_error');
      }

      if (!tokenData.access_token) {
        request.log.error({ tokenData }, 'Google access token alınamadı');
        return redirectWithStatus('token_error');
      }

      let profile: GoogleUserInfo;
      try {
        const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });

        if (!profileResponse.ok) {
          request.log.error({ status: profileResponse.status }, 'Google profil isteği başarısız');
          return redirectWithStatus('profile_error');
        }

        profile = (await profileResponse.json()) as GoogleUserInfo;
      } catch (profileError) {
        request.log.error({ err: profileError }, 'Google profil isteği sırasında hata');
        return redirectWithStatus('profile_error');
      }

      if (!profile.sub || !profile.email) {
        request.log.error({ profile }, 'Google profilinde sub veya e-posta eksik');
        return redirectWithStatus('profile_error');
      }

      if (profile.email_verified === false) {
        request.log.warn({ email: profile.email }, 'Google e-postası doğrulanmamış');
        return redirectWithStatus('email_unverified');
      }

      const googleId = profile.sub;
      const email = profile.email.toLowerCase();

      let user = await request.server.db.get<{
        id: number;
        email: string;
        nickname: string;
        provider: string;
      }>(
        `SELECT id, email, nickname, provider FROM users WHERE provider = 'google' AND provider_id = ?`,
        googleId
      );

      if (!user) {
        const existingEmailOwner = await request.server.db.get<{
          id: number;
          provider: string;
          nickname: string;
          provider_id: string | null;
        }>(`SELECT id, provider, nickname, provider_id FROM users WHERE email = ?`, email);

        if (existingEmailOwner && existingEmailOwner.provider === 'google') {
          const needsUpdate = existingEmailOwner.provider_id !== googleId;
          if (needsUpdate) {
            try {
              await request.server.db.run(
                `
                  UPDATE users
                  SET provider_id = ?, password_hash = ?
                  WHERE id = ?
                `,
                googleId,
                OAUTH_SENTINEL,
                existingEmailOwner.id
              );
            } catch (syncError) {
              request.log.error({ err: syncError }, 'Google kullanıcısı provider_id güncellenemedi');
              return redirectWithStatus('internal_error');
            }
          }

          user = {
            id: existingEmailOwner.id,
            email,
            nickname: existingEmailOwner.nickname,
            provider: 'google'
          };
        } else if (existingEmailOwner && existingEmailOwner.provider !== 'google') {
          try {
            await request.server.db.run(
              `
                UPDATE users
                SET provider = 'google',
                    provider_id = ?,
                    password_hash = ?
                WHERE id = ?
              `,
              googleId,
              OAUTH_SENTINEL,
              existingEmailOwner.id
            );

            user = {
              id: existingEmailOwner.id,
              email,
              nickname: existingEmailOwner.nickname,
              provider: 'google'
            };
          } catch (updateError) {
            request.log.error({ err: updateError }, 'Local kullanıcıyı Google ile eşleştirme başarısız');
            return redirectWithStatus('internal_error');
          }
        } else if (!existingEmailOwner) {
          const nicknameSource =
            profile.given_name ?? profile.name ?? email.split('@')[0] ?? 'google-user';
          const nickname = await ensureUniqueNickname(request.server.db, nicknameSource);

          try {
            const result = await request.server.db.run(
              `
                INSERT INTO users (email, password_hash, nickname, provider, provider_id)
                VALUES (?, ?, ?, 'google', ?)
              `,
              email,
              OAUTH_SENTINEL,
              nickname,
              googleId
            );

            user = {
              id: result.lastID ?? 0,
              email,
              nickname,
              provider: 'google'
            };
          } catch (insertError) {
            request.log.error({ err: insertError }, 'Google kullanıcısı oluşturulamadı');
            return redirectWithStatus('internal_error');
          }
        }
      }

      if (!user) {
        request.log.error(
          { email, googleId },
          'Google OAuth akışında kullanıcı oluşturma/güncelleme tamamlanamadı'
        );
        return redirectWithStatus('internal_error');
      }

      const payload: JwtBasePayload = {
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: 'google'
      };

      issueTokens(reply, payload);
      return redirectWithStatus('success');
    }
  );

  app.post<{ Body: ManualRegisterBody; Reply: ManualRegisterReply }>(
    '/api/users/register',
    { schema: manualRegisterSchema, preHandler: [registerRateLimiter] },
    async (request, reply) => {
      const { email, nickname, password } = request.body;
      const passwordHash = await bcrypt.hash(password, 10);

      try {
        const result = await request.server.db.run(
          `
            INSERT INTO users (email, password_hash, nickname, provider)
            VALUES (?, ?, ?, 'local')
          `,
          email,
          passwordHash,
          nickname
        );

        return reply.status(201).send({
          id: result.lastID ?? 0,
          email,
          nickname
        });
      } catch (error) {
        const sqliteError = error as { code?: string };
        if (sqliteError?.code === 'SQLITE_CONSTRAINT') {
          return reply.status(409).send({
            error: 'UserAlreadyExists',
            message: 'Bu e-posta veya kullanıcı adı ile kayıt mevcut.'
          });
        }

        request.log.error({ err: error }, 'Kullanıcı kaydı başarısız oldu');

        return reply.status(500).send({
          error: 'InternalServerError',
          message: 'Kullanıcı oluşturulurken bilinmeyen bir hata oluştu.'
        });
      }
    }
  );

  app.post<{ Body: GoogleRegisterBody; Reply: GoogleRegisterReply }>(
    '/api/users/register/google',
    { schema: googleRegisterSchema, preHandler: [registerRateLimiter] },
    async (request, reply) => {
      const { email, nickname, googleId } = request.body;

      try {
        const result = await request.server.db.run(
          `
            INSERT INTO users (email, password_hash, nickname, provider, provider_id)
            VALUES (?, ?, ?, 'google', ?)
          `,
          email,
          OAUTH_SENTINEL,
          nickname,
          googleId
        );

        return reply.status(201).send({
          id: result.lastID ?? 0,
          email,
          nickname,
          provider: 'google'
        });
      } catch (error) {
        const sqliteError = error as { code?: string };
        if (sqliteError?.code === 'SQLITE_CONSTRAINT') {
          return reply.status(409).send({
            error: 'UserAlreadyExists',
            message: 'Bu Google hesabı veya e-posta ile kayıt mevcut.'
          });
        }

        request.log.error({ err: error }, 'Google kayıt işlemi başarısız oldu');

        return reply.status(500).send({
          error: 'InternalServerError',
          message: 'Google kaydı sırasında bilinmeyen bir hata oluştu.'
        });
      }
    }
  );

  app.post<{ Body: ManualLoginBody; Reply: ManualLoginReply }>(
    '/api/users/login',
    { schema: manualLoginSchema, preHandler: [loginRateLimiter] },
    async (request, reply) => {
      const { email, password } = request.body;

      const user = await request.server.db.get<{
        id: number;
        email: string;
        password_hash: string;
        nickname: string;
        provider: string;
      }>(`SELECT * FROM users WHERE email = ? AND provider = 'local'`, email);

      if (!user) {
        return reply.status(401).send({
          error: 'InvalidCredentials',
          message: 'E-posta veya şifre hatalı.'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return reply.status(401).send({
          error: 'InvalidCredentials',
          message: 'E-posta veya şifre hatalı.'
        });
      }

      const payload: JwtBasePayload = {
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: 'local'
      };

      issueTokens(reply, payload);

      return reply.status(200).send({
        id: payload.sub,
        email: payload.email,
        nickname: payload.nickname,
        provider: payload.provider
      });
    }
  );

  app.post<{ Body: GoogleLoginBody; Reply: GoogleLoginReply }>(
    '/api/users/login/google',
    { schema: googleLoginSchema, preHandler: [loginRateLimiter] },
    async (request, reply) => {
      const { googleId } = request.body;

      const user = await request.server.db.get<{
        id: number;
        email: string;
        nickname: string;
        provider: string;
      }>(
        `SELECT id, email, nickname, provider FROM users WHERE provider = 'google' AND provider_id = ?`,
        googleId
      );

      if (!user) {
        return reply.status(404).send({
          error: 'UserNotFound',
          message: 'Google hesabı ile eşleşen kullanıcı kaydı bulunamadı.'
        });
      }

      const payload: JwtBasePayload = {
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: 'google'
      };

      issueTokens(reply, payload);

      return reply.status(200).send({
        id: payload.sub,
        email: payload.email,
        nickname: payload.nickname,
        provider: payload.provider
      });
    }
  );

  app.post<{ Reply: LoginSuccess | ApiErrorResponse }>(
    '/api/users/refresh',
    { schema: refreshSchema, preHandler: [refreshRateLimiter] },
    async (request, reply) => {
      const unauthorized = () => {
        clearSessionCookies(reply);
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Oturum süresi doldu. Lütfen yeniden giriş yap.'
        });
      };

      const cookies = cookie.parse(request.headers.cookie ?? '');
      const token = cookies[REFRESH_COOKIE_NAME];

      if (!token) {
        return unauthorized();
      }

      let session: JwtBasePayload;
      try {
        session = decodeToken(token, 'refresh');
      } catch {
        return unauthorized();
      }

      const user = await request.server.db.get<{
        id: number;
        email: string;
        nickname: string;
        provider: string;
      }>(
        `SELECT id, email, nickname, provider FROM users WHERE id = ?`,
        session.sub
      );

      if (!user) {
        return unauthorized();
      }

      const payload: JwtBasePayload = {
        sub: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider === 'google' ? 'google' : 'local'
      };

      issueTokens(reply, payload);

      return reply.status(200).send({
        id: payload.sub,
        email: payload.email,
        nickname: payload.nickname,
        provider: payload.provider
      });
    }
  );

  app.post(
    '/api/users/logout',
    { preHandler: [app.authenticate] },
    async (_, reply) => {
      clearSessionCookies(reply);
      reply.status(204).send();
    }
  );

  app.get<{ Reply: MeResponse }>(
    '/api/users/me',
    { preHandler: [app.authenticate], schema: whoAmISchema },
    async (request) => {
      const session = request.session;
      if (!session) {
        throw new Error('Oturum doğrulaması başarısız.');
      }

      const user = await request.server.db.get<{
        id: number;
        email: string;
        nickname: string;
        provider: string;
      }>(
        `SELECT id, email, nickname, provider FROM users WHERE id = ?`,
        session.sub
      );

      if (!user) {
        throw new Error('Authenticated kullanıcı veritabanında bulunamadı.');
      }

      return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        provider: user.provider === 'google' ? 'google' : 'local'
      };
    }
  );

  type ProfileErrorResponse = ApiErrorResponse;

  app.get<{ Reply: ProfileResponse | ProfileErrorResponse }>(
    '/api/users/profile',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const session = request.session;
      if (!session) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Bu işlemi gerçekleştirmek için giriş yapmalısın.'
        });
      }

      const record = await request.server.db.get<{
        id: number;
        email: string;
        nickname: string;
        provider: string;
        created_at: string;
      }>(
        `
          SELECT id, email, nickname, provider, created_at
          FROM users
          WHERE id = ?
        `,
        session.sub
      );

      if (!record) {
        return reply.status(404).send({
          error: 'UserNotFound',
          message: 'Kullanıcı profili bulunamadı.'
        });
      }

      return {
        id: record.id,
        email: record.email,
        nickname: record.nickname,
        provider: record.provider === 'google' ? 'google' : 'local',
        createdAt: record.created_at
      };
    }
  );

  app.patch<{
    Body: UpdateProfileBody;
    Reply: ProfileResponse | ApiErrorResponse;
  }>(
    '/api/users/profile',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const session = request.session;
      if (!session) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Bu işlemi gerçekleştirmek için giriş yapmalısın.'
        });
      }

      const nickname = (request.body.nickname ?? '').trim();
      if (nickname.length < 3 || nickname.length > 48) {
        return reply.status(400).send({
          error: 'InvalidNickname',
          message: 'Takma ad 3 ile 48 karakter arasında olmalı.'
        });
      }

      const duplicate = await request.server.db.get(
        `SELECT 1 FROM users WHERE LOWER(nickname) = LOWER(?) AND id != ?`,
        nickname,
        session.sub
      );
      if (duplicate) {
        return reply.status(409).send({
          error: 'NicknameTaken',
          message: 'Bu takma ad başka bir kullanıcı tarafından kullanılıyor.'
        });
      }

      await request.server.db.run(
        `UPDATE users SET nickname = ? WHERE id = ?`,
        nickname,
        session.sub
      );

      const updated = await request.server.db.get<{
        id: number;
        email: string;
        nickname: string;
        provider: string;
        created_at: string;
      }>(
        `
          SELECT id, email, nickname, provider, created_at
          FROM users
          WHERE id = ?
        `,
        session.sub
      );

      if (!updated) {
        return reply.status(404).send({
          error: 'UserNotFound',
          message: 'Kullanıcı profili bulunamadı.'
        });
      }

      return {
        id: updated.id,
        email: updated.email,
        nickname: updated.nickname,
        provider: updated.provider === 'google' ? 'google' : 'local',
        createdAt: updated.created_at
      };
    }
  );

  const fetchTournamentDTO = async (db: AppDatabase, tournamentId: number) => {
    const row = await db.get<TournamentRow>(
      `
        SELECT
          t.id,
          t.name,
          t.owner_id,
          t.max_players,
          t.status,
          t.bracket_json,
          t.created_at,
          t.started_at,
          u.nickname AS owner_nickname,
          (SELECT COUNT(*) FROM tournament_players tp WHERE tp.tournament_id = t.id) AS player_count
        FROM tournaments t
        LEFT JOIN users u ON u.id = t.owner_id
        WHERE t.id = ?
      `,
      tournamentId
    );

    return row ? mapTournamentRow(row) : null;
  };

  app.post<{
    Body: CreateTournamentBody;
    Reply: TournamentDTO | ApiErrorResponse;
  }>(
    '/api/tournaments',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const session = request.session;
      if (!session) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Bu işlemi gerçekleştirmek için giriş yapmalısın.'
        });
      }

      const name = (request.body.name ?? '').trim();
      const maxPlayers = Number(request.body.maxPlayers);

      if (name.length < 3 || name.length > 64) {
        return reply.status(400).send({
          error: 'InvalidName',
          message: 'Turnuva adı 3 ile 64 karakter arasında olmalı.'
        });
      }

      if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 32 || !isPowerOfTwo(maxPlayers)) {
        return reply.status(400).send({
          error: 'InvalidMaxPlayers',
          message: 'Oyuncu sayısı 2 ile 32 arasında ve 2\'nin kuvveti olmalı.'
        });
      }

      const result = await request.server.db.run(
        `
          INSERT INTO tournaments (name, owner_id, max_players)
          VALUES (?, ?, ?)
        `,
        name,
        session.sub,
        maxPlayers
      );
      tournamentCreatedCounter.inc({ ownerProvider: session.provider });

      const dto = await fetchTournamentDTO(request.server.db, result.lastID ?? 0);
      return reply.status(201).send(dto as TournamentDTO);
    }
  );

  app.get<{ Reply: TournamentDTO[] }>(
    '/api/tournaments',
    { preHandler: [app.authenticate] },
    async (request) => {
      const rows = (await request.server.db.all<TournamentRow>(`
        SELECT
          t.id,
          t.name,
          t.owner_id,
          t.max_players,
          t.status,
          t.bracket_json,
          t.created_at,
          t.started_at,
          u.nickname AS owner_nickname,
          (SELECT COUNT(*) FROM tournament_players tp WHERE tp.tournament_id = t.id) AS player_count
        FROM tournaments t
        LEFT JOIN users u ON u.id = t.owner_id
        ORDER BY t.created_at DESC
      `)) as unknown as TournamentRow[];

      return rows.map(mapTournamentRow);
    }
  );

  app.post<{
    Params: { id: string };
    Reply: TournamentDTO | ApiErrorResponse;
  }>(
    '/api/tournaments/:id/join',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const session = request.session;
      if (!session) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Bu işlemi gerçekleştirmek için giriş yapmalısın.'
        });
      }

      const tournamentId = Number(request.params.id);
      if (!Number.isInteger(tournamentId)) {
        return reply.status(400).send({
          error: 'InvalidTournament',
          message: 'Turnuva kimliği geçersiz.'
        });
      }

      const tournament = await fetchTournamentDTO(request.server.db, tournamentId);
      if (!tournament) {
        return reply.status(404).send({
          error: 'TournamentNotFound',
          message: 'Turnuva bulunamadı.'
        });
      }

      if (tournament.status !== 'pending') {
        return reply.status(400).send({
          error: 'TournamentStarted',
          message: 'Turnuva başlatıldığı için katılım kapalı.'
        });
      }

      if (tournament.currentPlayers >= tournament.maxPlayers) {
        return reply.status(400).send({
          error: 'TournamentFull',
          message: 'Turnuva oyuncu kapasitesi dolu.'
        });
      }

      try {
        const alias = await createUniqueAlias(request.server.db, tournamentId, session.nickname);
        await request.server.db.run(
          `
            INSERT INTO tournament_players (tournament_id, user_id, alias, is_ai)
            VALUES (?, ?, ?, 0)
          `,
          tournamentId,
          session.sub,
          alias
        );
        tournamentJoinedCounter.inc({ provider: session.provider });
      } catch (error) {
        const sqliteError = error as { code?: string };
        if (sqliteError?.code === 'SQLITE_CONSTRAINT') {
          return reply.status(409).send({
            error: 'AlreadyJoined',
            message: 'Bu turnuvaya zaten katıldın.'
          });
        }
        request.log.error({ err: error }, 'Turnuva katılımı başarısız oldu');
        return reply.status(500).send({
          error: 'InternalServerError',
          message: 'Turnuvaya katılım sırasında hata oluştu.'
        });
      }

      const dto = await fetchTournamentDTO(request.server.db, tournamentId);
      return reply.status(200).send(dto as TournamentDTO);
    }
  );

  app.post<{
    Params: { id: string };
    Reply: TournamentDTO | ApiErrorResponse;
  }>(
    '/api/tournaments/:id/start',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const session = request.session;
      if (!session) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Bu işlemi gerçekleştirmek için giriş yapmalısın.'
        });
      }

      const tournamentId = Number(request.params.id);
      if (!Number.isInteger(tournamentId)) {
        return reply.status(400).send({
          error: 'InvalidTournament',
          message: 'Turnuva kimliği geçersiz.'
        });
      }

      const tournament = await fetchTournamentDTO(request.server.db, tournamentId);
      if (!tournament) {
        return reply.status(404).send({
          error: 'TournamentNotFound',
          message: 'Turnuva bulunamadı.'
        });
      }

      if (tournament.ownerId !== session.sub) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Sadece turnuvayı oluşturan kişi başlatabilir.'
        });
      }

      if (tournament.status !== 'pending') {
        return reply.status(400).send({
          error: 'TournamentStarted',
          message: 'Turnuva zaten başlatılmış.'
        });
      }

      const players = (await request.server.db.all<TournamentPlayerRow>(
        `SELECT alias, is_ai FROM tournament_players WHERE tournament_id = ? ORDER BY created_at ASC`,
        tournamentId
      )) as unknown as TournamentPlayerRow[];

      if (players.length < 2) {
        return reply.status(400).send({
          error: 'NotEnoughPlayers',
          message: 'Turnuvayı başlatmak için en az iki oyuncu gerekiyor.'
        });
      }

      const aliasSet = new Set(players.map((p) => p.alias.toLowerCase()));
      const aiNeeded = tournament.maxPlayers - players.length;
      const aiAliases: string[] = [];

      for (let i = 1; i <= aiNeeded; i += 1) {
        let alias = `AI-${i}`;
        let suffix = 1;
        while (aliasSet.has(alias.toLowerCase())) {
          alias = `AI-${i + suffix}`;
          suffix += 1;
        }
        aiAliases.push(alias);
        aliasSet.add(alias.toLowerCase());
      }

      for (const alias of aiAliases) {
        await request.server.db.run(
          `
            INSERT INTO tournament_players (tournament_id, user_id, alias, is_ai)
            VALUES (?, NULL, ?, 1)
          `,
          tournamentId,
          alias
        );
        players.push({ alias, is_ai: 1 });
      }

      const shuffledPlayers = shuffle(players);
      const pairs = chunkPairs(shuffledPlayers);
      const bracket = {
        rounds: [
          {
            matches: pairs.map((pair, index) => ({
              match: index + 1,
              playerA: { alias: pair[0].alias, isAi: Boolean(pair[0].is_ai) },
              playerB: { alias: pair[1].alias, isAi: Boolean(pair[1].is_ai) }
            }))
          }
        ]
      };

      await request.server.db.run(
        `
          UPDATE tournaments
          SET status = 'active',
              bracket_json = ?,
              started_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        JSON.stringify(bracket),
        tournamentId
      );
      tournamentStartedCounter.inc();

      const dto = await fetchTournamentDTO(request.server.db, tournamentId);
      return reply.status(200).send(dto as TournamentDTO);
    }
  );

  return app;
};
const start = async () => {
  const server = buildServer();
  const db = await createDatabaseConnection();

  server.decorate('db', db);
  server.addHook('onClose', async () => {
    await db.close();
  });

  try {
    await server.listen({ port: env.port, host: env.host });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  void start();
}

export type AppServer = ReturnType<typeof buildServer>;
