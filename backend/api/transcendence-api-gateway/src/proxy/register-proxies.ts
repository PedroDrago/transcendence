import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import {
  createProxyMiddleware,
  fixRequestBody,
} from 'http-proxy-middleware';
import { JwtService } from '@nestjs/jwt';
import { getAuthenticatedUserFromToken } from '../auth/access-token';

type GatewayServer = {
  on(event: 'upgrade', listener: UpgradeListener): void;
};

type UpgradeListener = (
  request: IncomingMessage,
  socket: Socket,
  head: Buffer,
) => void;

type ProxyTargets = {
  authServiceUrl: string;
  userServiceUrl: string;
  chatServiceUrl: string;
  postsServiceUrl: string;
};

type JwtClaims = {
  sub?: string;
  [key: string]: unknown;
};

function createUnauthorizedResponse(response: Response, message: string) {
  return response.status(401).json({
    message,
    error: 'Unauthorized',
    statusCode: 401,
  });
}

function createForbiddenResponse(response: Response, message: string) {
  return response.status(403).json({
    message,
    error: 'Forbidden',
    statusCode: 403,
  });
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function validateAccessToken(jwtService: JwtService, token: string) {
  const payload = jwtService.verify<JwtClaims>(token);
  return getAuthenticatedUserFromToken(
    payload as Parameters<typeof getAuthenticatedUserFromToken>[0],
  );
}

function forwardAuthenticatedUser(request: Request, userId: string) {
  request.headers['x-user-id'] = userId;
}

function requireJwt(
  jwtService: JwtService,
  mutator?: (request: Request, userId: string) => void,
): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const token = readBearerToken(request);
    if (!token) {
      createUnauthorizedResponse(response, 'Missing bearer token');
      return;
    }

    try {
      const user = validateAccessToken(jwtService, token);
      mutator?.(request, user.id);
      next();
    } catch {
      createUnauthorizedResponse(response, 'Invalid access token');
    }
  };
}

function requireJwtWhen(
  pathMatcher: (pathname: string) => boolean,
  jwtService: JwtService,
  mutator?: (request: Request, userId: string) => void,
): RequestHandler {
  const middleware = requireJwt(jwtService, mutator);

  return (request: Request, response: Response, next: NextFunction) => {
    if (!pathMatcher(request.path)) {
      next();
      return;
    }

    middleware(request, response, next);
  };
}

function baseProxyOptions(target: string) {
  return {
    target,
    changeOrigin: true,
    xfwd: true,
    on: {
      proxyReq: fixRequestBody,
    },
  };
}

function createHttpProxy(
  target: string,
  pathFilter: string | string[] | ((pathname: string) => boolean),
  pathRewrite?: Record<string, string>,
) {
  return createProxyMiddleware({
    ...baseProxyOptions(target),
    pathFilter,
    pathRewrite,
  });
}

function createSocketProxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    ws: true,
  });
}

function upgradeUnauthorized(socket: Socket) {
  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
  socket.destroy();
}

function readSocketToken(request: IncomingMessage): string | null {
  const url = new URL(request.url ?? '', 'http://gateway.local');
  return url.searchParams.get('token');
}

function isPostsPath(pathname: string): boolean {
  return (
    pathname === '/presign-url' ||
    pathname.startsWith('/posts') ||
    pathname.startsWith('/stories') ||
    pathname.startsWith('/comments') ||
    pathname.startsWith('/likes') ||
    /^\/users\/[^/]+\/posts(?:\/|$)/.test(pathname) ||
    /^\/users\/[^/]+\/stories(?:\/|$)/.test(pathname)
  );
}

function isUserPath(pathname: string): boolean {
  return pathname.startsWith('/users') && !pathname.startsWith('/users/avatars');
}

function blockUserManagementWriteEndpoints(): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    if (
      (request.method === 'POST' && request.path === '/users') ||
      (request.method === 'PATCH' && /^\/users\/[^/]+\/username$/.test(request.path)) ||
      (request.method === 'DELETE' && /^\/users\/[^/]+$/.test(request.path) && request.path !== '/users/me')
    ) {
      createForbiddenResponse(
        response,
        'User management write endpoint is not exposed through the gateway',
      );
      return;
    }

    next();
  };
}

export function registerGatewayProxies(
  app: Express,
  server: GatewayServer,
  jwtService: JwtService,
  targets: ProxyTargets,
) {
  const authProxy = createHttpProxy(targets.authServiceUrl, '/auth/**');
  const userProxy = createHttpProxy(targets.userServiceUrl, '/users/**');
  const postsProxy = createHttpProxy(targets.postsServiceUrl, isPostsPath);
  const chatProxy = createHttpProxy(targets.chatServiceUrl, '/chat/**', {
    '^/chat': '/api',
  });
  const socketProxy = createSocketProxy(targets.chatServiceUrl);

  app.use(
    ['/auth/password', '/auth/username'],
    requireJwt(jwtService, forwardAuthenticatedUser),
  );
  app.use(authProxy);

  app.use(requireJwtWhen(isPostsPath, jwtService, forwardAuthenticatedUser));
  app.use(postsProxy);

  app.use(requireJwtWhen(isUserPath, jwtService, forwardAuthenticatedUser));
  app.use(blockUserManagementWriteEndpoints());
  app.use(userProxy);

  app.use('/chat', requireJwt(jwtService, forwardAuthenticatedUser));
  app.use(chatProxy);

  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/socket')) {
      return;
    }

    const token = readSocketToken(request);
    if (!token) {
      upgradeUnauthorized(socket);
      return;
    }

    try {
      const user = validateAccessToken(jwtService, token);
      request.headers['x-user-id'] = user.id;
    } catch {
      upgradeUnauthorized(socket);
      return;
    }

    socketProxy.upgrade(request, socket, head);
  });
}
