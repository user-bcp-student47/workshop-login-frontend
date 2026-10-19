import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import type { LoginRequest, LoginResponse, UserPreferences } from '../models/api.models';
import { SessionService } from './session.service';

const LOGIN_PATH = '/auth/login';
const LOGIN_CLIENT = 'angular-workshop';
const LOGIN_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private session: SessionService) {}

  loadPreferences(): UserPreferences {
    return this.session.loadPreferences();
  }

  async login(username: string, password: string, preferences: UserPreferences): Promise<boolean> {
    const request: LoginRequest = { username, password, client: LOGIN_CLIENT };
    const response = await axios.post<LoginResponse | null>(environment.authApiUrl + LOGIN_PATH, request, {
      timeout: LOGIN_TIMEOUT_MS
    });
    if (!response?.data?.token) {
      return false;
    }
    this.session.saveSession(response.data.token, response.data.user, preferences);
    return true;
  }
}