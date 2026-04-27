import { Persona } from '../types';

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  role: Role;
  content: string;
  name?: string;
}

export interface AIResponse {
  text: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

export interface AIProvider {
  id: string;
  name: string;
  chat(messages: Message[], options?: ChatOptions): Promise<AIResponse>;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  systemInstruction?: string;
}

export interface AgentContext {
  agent: Persona;
  history: Message[];
  memory?: string;
  files?: string[];
}
