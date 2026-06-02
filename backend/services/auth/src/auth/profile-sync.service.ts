import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class ProfileSyncError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

@Injectable()
export class ProfileSyncService {
  private readonly userServiceUrl: string;

  constructor(config: ConfigService) {
    this.userServiceUrl = (
      config.get<string>('USER_SERVICE_URL') ?? 'http://localhost:3002'
    ).replace(/\/+$/, '');
  }

  async createProfile(profile: { id: string; username: string }): Promise<void> {
    await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  }

  async updateUsername(id: string, username: string): Promise<void> {
    await this.request(`/users/${encodeURIComponent(id)}/username`, {
      method: 'PATCH',
      headers: {
        'x-user-id': id,
      },
      body: JSON.stringify({ username }),
    });
  }

  toHttpException(error: unknown, fallbackMessage: string) {
    if (error instanceof ProfileSyncError && error.status === 409) {
      return new ConflictException(fallbackMessage);
    }

    return new ServiceUnavailableException(fallbackMessage);
  }

  private async request(path: string, init: RequestInit): Promise<void> {
    const url = `${this.userServiceUrl}${path}`;
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          headers,
        });

        if (response.ok) {
          return;
        }

        const responseBody = await response.text().catch(() => '');
        const message = responseBody || `User service returned ${response.status}`;
        const error = new ProfileSyncError(message, response.status);

        if (response.status < 500) {
          throw error;
        }

        lastError = error;
      } catch (error) {
        if (error instanceof ProfileSyncError && error.status && error.status < 500) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError instanceof ProfileSyncError
      ? lastError
      : new ProfileSyncError('User service is unavailable');
  }
}
