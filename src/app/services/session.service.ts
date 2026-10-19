import { Injectable } from '@angular/core';
import merge from 'lodash/merge';
import type { UserPreferences } from '../models/api.models';

const SESSION_KEYS = {
  token: 'workshop_token',
  user: 'workshop_user',
  preferences: 'workshop_preferences'
} as const;

@Injectable({ providedIn: 'root' })
export class SessionService {
  private token: string | null = null;
  private legacyTokenRemoved = false;

  constructor() {
    try {
      this.removeLegacyToken();
    } catch {
      this.legacyTokenRemoved = false;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): unknown {
    const user: unknown = JSON.parse(localStorage.getItem(SESSION_KEYS.user) || '{}');
    return user;
  }

  loadPreferences(): UserPreferences {
    const defaults: UserPreferences = { theme: 'light', showTips: true, compact: false };
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(SESSION_KEYS.preferences) || '{}');
      return merge(defaults, saved);
    } catch {
      return defaults;
    }
  }

  saveSession(token: string, user: unknown, preferences: UserPreferences): void {
    if (!this.legacyTokenRemoved) {
      this.removeLegacyToken();
    }
    localStorage.setItem(SESSION_KEYS.user, String(JSON.stringify(user)));
    localStorage.setItem(SESSION_KEYS.preferences, String(JSON.stringify(preferences)));
    this.token = token;
  }

  clearSession(): void {
    this.token = null;
    this.removeLegacyToken();
    localStorage.removeItem(SESSION_KEYS.user);
  }

  private removeLegacyToken(): void {
    this.legacyTokenRemoved = false;
    localStorage.removeItem(SESSION_KEYS.token);
    this.legacyTokenRemoved = true;
  }
}