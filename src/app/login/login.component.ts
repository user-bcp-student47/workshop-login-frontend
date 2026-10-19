import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { UserPreferences } from '../models/api.models';
import { AuthService } from '../services/auth.service';
import { getApiErrorMessage } from '../utils/api-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string | null | undefined = '';
  password: string | null | undefined = '';
  busy = false;
  message = '';
  preferences: UserPreferences;

  constructor(private router: Router, private auth: AuthService) {
    this.preferences = this.auth.loadPreferences();
  }

  async login(): Promise<void> {
    this.message = '';
    if (this.username === null || this.username === undefined || String(this.username).trim() === '') {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (this.password === null || this.password === undefined || String(this.password).trim() === '') {
      this.message = 'Ingrese una contraseña.';
      return;
    }
    this.busy = true;
    try {
      const authenticated = await this.auth.login(this.username, this.password, this.preferences);
      if (!authenticated) {
        this.message = 'El backend respondió sin token.';
        return;
      }
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      this.message = getApiErrorMessage(error, 'login');
    } finally {
      this.busy = false;
    }
  }
}
