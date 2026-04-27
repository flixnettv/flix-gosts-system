import { storageService } from './storage';
import { userService } from './user';
import { Task, SubTask } from '../types';

export class TaskService {
  private tasks: Task[] = [];
  private listeners: ((tasks: Task[]) => void)[] = [];

  async init(onUpdate?: (tasks: Task[]) => void) {
    if (onUpdate) this.listeners.push(onUpdate);

    await this.loadTasks();

    // Subscribe to local storage changes
    storageService.subscribe('tasks', (data) => {
      this.tasks = data;
      this.notify();
    });
  }

  async loadTasks() {
    const user = userService.getCurrentUser();
    if (!user) return;

    let options: any = {};
    if (!userService.isAdmin()) {
      options.eq = ['user_id', user.id];
    }

    const { data, error } = await storageService.query<Task>('tasks', options);
    if (!error && data) {
      this.tasks = data;
      this.notify();
    }
  }

  private notify() {
    this.listeners.forEach(l => l(this.tasks));
  }

  async addTask(task: Partial<Task>) {
    const user = userService.getCurrentUser();
    if (!user) return null;

    const newTask = {
      ...task,
      title: task.title || 'Untitled Directive',
      user_id: user.id,
      collaborator_ids: task.collaborator_ids || [],
      sub_tasks: (task.sub_tasks || []).map(st => ({
        id: st.id || crypto.randomUUID(),
        created_at: st.created_at || new Date().toISOString(),
        updated_at: st.updated_at || new Date().toISOString(),
        ...st
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await storageService.insert('tasks', [newTask]);
    if (error) return null;
    return data ? data[0] : null;
  }

  async addSubTask(taskId: string, subTask: Omit<SubTask, 'id' | 'created_at' | 'updated_at'>) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;

    const newSubTask: SubTask = {
      ...subTask,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedSubTasks = [...(task.sub_tasks || []), newSubTask];
    return this.updateTask(taskId, { sub_tasks: updatedSubTasks });
  }

  async updateSubTask(taskId: string, subTaskId: string, updates: Partial<SubTask>) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const updatedSubTasks = (task.sub_tasks || []).map(st => 
      st.id === subTaskId ? { ...st, ...updates, updated_at: new Date().toISOString() } : st
    );

    return this.updateTask(taskId, { sub_tasks: updatedSubTasks });
  }

  async addCollaborator(taskId: string, personaId: string) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const collaborators = task.collaborator_ids || [];
    if (collaborators.includes(personaId)) return true;

    return this.updateTask(taskId, { 
      collaborator_ids: [...collaborators, personaId] 
    });
  }

  async updateTask(id: string, updates: Partial<Task>) {
    const task = this.tasks.find(t => t.id === id);
    const { error } = await storageService.upsert('tasks', {
      id,
      title: updates.title || task?.title || 'Untitled Directive',
      ...updates,
      updated_at: new Date().toISOString()
    }, { on: 'id' });
    return !error;
  }

  async deleteTask(id: string) {
    const { error } = await storageService.delete('tasks', {
      eq: ['id', id]
    });
    return !error;
  }

  getStats() {
    const stats = {
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      total: this.tasks.length
    };

    this.tasks.forEach(t => {
      if (t.status === 'upcoming') stats.upcoming++;
      else if (t.status === 'ongoing') stats.ongoing++;
      else if (t.status === 'completed') stats.completed++;
    });

    return stats;
  }
}

export const taskService = new TaskService();
