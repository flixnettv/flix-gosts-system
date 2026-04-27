import { AIProvider, Message, ChatOptions, AIResponse } from '../types';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  name = 'Google Gemini';
  private client: any;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<AIResponse> {
    const modelId = options?.model || 'gemini-3-flash-preview';
    
    const response = await this.client.models.generateContent({
      model: modelId,
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: options?.systemInstruction,
        tools: options?.tools ? [{ functionDeclarations: options.tools }] : undefined
      }
    });

    return {
      text: response.text || '',
      toolCalls: response.functionCalls?.map((fc: any) => ({
        id: Math.random().toString(36).substring(7),
        name: fc.name,
        arguments: fc.args
      })),
      usage: {
        promptTokens: 0, // SDK doesn't expose this easily in this version
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }
}

export class GroqProvider implements AIProvider {
  id = 'groq';
  name = 'Groq';
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey, dangerouslyAllowBrowser: true });
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<AIResponse> {
    const completion = await this.client.chat.completions.create({
      messages: [
        ...(options?.systemInstruction ? [{ role: 'system' as const, content: options.systemInstruction }] : []),
        ...messages.map(m => ({ role: m.role as any, content: m.content }))
      ],
      model: options?.model || 'llama-3.3-70b-versatile',
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      tools: options?.tools?.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      })),
      tool_choice: options?.tools ? 'auto' : undefined
    });

    const message = completion.choices[0]?.message;
    const toolCalls = message?.tool_calls;

    return {
      text: message?.content || '',
      toolCalls: toolCalls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      })),
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      }
    };
  }
}
