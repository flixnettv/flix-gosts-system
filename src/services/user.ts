import { storageService } from './storage';
import { User, Permission } from '../types';

const ROLE_PERMISSIONS: Record<User['role'], Permission[]> = {
  admin: [
    'manage_agents',
    'manage_goblins',
    'manage_api_keys',
    'view_system_stats',
    'manage_users',
    'access_terminal_admin'
  ],
  manager: [
    'manage_goblins',
    'view_system_stats'
  ],
  user: [
    'view_system_stats'
  ]
};

export class UserService {
  private currentUser: User | null = null;

  async init(email: string): Promise<User | null> {
    const { data, error } = await storageService.query<User>('users', {
      eq: ['email', email]
    });

    if (error || !data || data.length === 0) {
      // Create user if not exists
      const newUser = {
        email,
        role: email === 'flixnettv@gmail.com' ? 'admin' : 'user',
        created_at: new Date().toISOString()
      };
      const { data: createdData } = await storageService.insert('users', [newUser]);
      if (createdData && createdData.length > 0) {
        this.currentUser = createdData[0];
      }
    } else {
      this.currentUser = data[0];
    }

    return this.currentUser;
  }

  async updateProfile(updates: Partial<User>): Promise<User | null> {
    if (!this.currentUser) return null;

    const fullUpdate = {
      id: this.currentUser.id,
      email: this.currentUser.email, // Ensure email is present for upsert
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { error } = await storageService.upsert('users', fullUpdate, { on: 'id' });

    if (!error) {
      this.currentUser = { ...this.currentUser, ...fullUpdate };
    }

    return this.currentUser;
  }

  async refreshUser(): Promise<User | null> {
    if (!this.currentUser) return null;
    const { data } = await storageService.query<User>('users', {
      eq: ['id', this.currentUser.id]
    });
    if (data && data.length > 0) {
      this.currentUser = data[0];
    }
    return this.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isManager(): boolean {
    return this.currentUser?.role === 'manager' || this.isAdmin();
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) return [];
    const { data } = await storageService.query<User>('users', {});
    return data || [];
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    if (!this.isAdmin()) return;
    
    // Get existing user to ensure we have required fields like email
    const { data } = await storageService.query<User>('users', { eq: ['id', userId] });
    const existingUser = data?.[0];
    
    const fullUpdate = {
      id: userId,
      ...(existingUser ? { email: existingUser.email } : {}),
      ...updates
    };
    
    await storageService.upsert('users', fullUpdate, { on: 'id' });
  }

  async getTelegramToken(): Promise<string | null> {
    if (!this.currentUser) return null;
    
    // If token already exists, return it
    if (this.currentUser.telegram_token) return this.currentUser.telegram_token;

    // Generate new token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await this.updateProfile({ telegram_token: token });
    return token;
  }

  async generatePin(userId: string): Promise<string> {
    if (!this.isAdmin()) return '';
    const pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
    await this.updateUser(userId, { pin_code: pin });
    return pin;
  }

  async assignAssistant(userId: string, personaId: string): Promise<void> {
    if (!this.isAdmin()) return;
    await this.updateUser(userId, { assigned_persona_id: personaId });
  }

  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;
    return ROLE_PERMISSIONS[this.currentUser.role].includes(permission);
  }
}

export const userService = new UserService();
