import { Message } from './services/ai';

export interface TerminalLine {
  text: string;
  type: 'input' | 'system' | 'error' | 'success';
  timestamp: number;
}

export interface AgentActivity {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: string;
  capabilities: string[];
  model?: string;
  type: 'ghost' | 'goblin';
  manager_id?: string; // ID of the Ghost (Persona) that manages this Goblin
  customModelId?: string;
  customApiUrl?: string;
  apiKey?: string;
  mcpEnabled?: boolean;
  mcpConfig?: {
    endpoint: string;
    tools: string[];
  };
}

export type Permission = 
  | 'manage_agents' 
  | 'manage_goblins'
  | 'manage_api_keys' 
  | 'view_system_stats' 
  | 'manage_users' 
  | 'access_terminal_admin';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'user';
  assigned_persona_id?: string;
  managed_persona_ids?: string[]; // Personas this user (if manager) can control
  pin_code?: string;
  telegram_chat_id?: string;
  telegram_token?: string;
  created_at: string;
}

export interface UserPersona {
  user_id: string;
  persona_id: string;
  assigned_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  persona_id?: string;
  title: string;
  last_message?: string;
  timestamp?: number;
  created_at: string;
  updated_at: string;
}

export interface SubTask {
  id: string;
  title: string;
  status: 'pending' | 'ongoing' | 'completed';
  assigned_agent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  agent_id: string; // Primary agent
  collaborator_ids?: string[]; // Additional agents (Ghosts/Goblins)
  user_id: string;
  title: string;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  sub_tasks?: SubTask[];
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  content: string;
  importance: number;
  tags: string[];
  category?: string;
  timestamp: number;
}

export interface AppState {
  messages: Message[];
  currentPersona: string;
  terminalHistory: TerminalLine[];
  isOffline: boolean;
  workspace: {
    rootPath: string | null;
    files: string[];
  };
  settings: {
    theme: 'dark' | 'light' | 'system';
    userName: string;
    customPersonas: Persona[];
  };
}
