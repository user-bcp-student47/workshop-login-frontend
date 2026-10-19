import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../../environments/environment';
import type { SessionContext, TasksRequest, TasksResponse } from '../models/api.models';
import { SessionService } from './session.service';

const TASKS_PATH = '/api/tasks';

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private session: SessionService) {}

  getSession(): SessionContext {
    const token = this.session.getToken();
    const user = this.session.getUser();
    return { token, user };
  }

  async getTasks(request: TasksRequest, token: string): Promise<TasksResponse> {
    const response = await axios.get<TasksResponse>(environment.tasksApiUrl + TASKS_PATH + '?owner=' + request.owner, {
      headers: { Authorization: 'Bearer ' + token }
    });
    return response.data;
  }
}