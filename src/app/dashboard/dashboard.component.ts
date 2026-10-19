import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import type { SessionUser, Task } from '../models/api.models';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { getApiErrorMessage } from '../utils/api-error';
import { formatTaskLabel } from '../utils/legacy-format';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: Task[] = [];
  user: SessionUser | null = {};
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private tasksService: TasksService,
    private session: SessionService
  ) {}

  statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status;
  }

  async ngOnInit(): Promise<void> {
    const context = this.tasksService.getSession();
    this.user = this.toUserView(context.user);
    if (!context.token) {
      await this.router.navigate(['/login']);
      return;
    }
    try {
      const tasks = await this.tasksService.getTasks({ owner: String(this.user.username || '') }, context.token);
      const visibleTasks: Task[] = [];
      for (const task of tasks) {
        if (task.status === 'ARCHIVED') {
          continue;
        }
        task.label = formatTaskLabel(task);
        visibleTasks.push(task);
      }
      visibleTasks.sort((first, second) => first.priority > second.priority ? -1 : 1);
      // axios resuelve a veces fuera de la zona de Angular (más aún llegando
      // por navegación desde el login): forzamos volver a entrar a la zona
      // y disparamos detectChanges a mano para no depender de que Angular
      // lo detecte solo.
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
        this.loading = false;
        this.cdr.detectChanges();
      });
    } catch (error: unknown) {
      this.zone.run(() => {
        this.error = getApiErrorMessage(error, 'tasks');
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clearSession();
    await this.router.navigate(['/login']);
  }

  private toUserView(user: unknown): SessionUser | null {
    if (user === null) {
      return null;
    }
    if (typeof user !== 'object') {
      return {};
    }
    return {
      username: 'username' in user ? user.username : undefined,
      displayName: 'displayName' in user ? user.displayName : undefined
    };
  }
}
