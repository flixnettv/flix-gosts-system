import { AIProvider, AgentContext, Message, AIResponse } from '../types';
import { ToolEngine, defaultToolEngine } from '../tools/engine';
import { securityLayer } from '../security/layer';
import { MemoryEngine } from '../memory/engine';

export class Agent {
  private maxIterations = 5;

  constructor(
    public provider: AIProvider,
    public context: AgentContext,
    private memoryEngine?: MemoryEngine,
    private toolEngine: ToolEngine = defaultToolEngine
  ) {}

  async process(userInput: string): Promise<AIResponse> {
    // 1. Security check on input
    if (!securityLayer.validateRequest(this.context.agent.id, userInput)) {
      throw new Error("Security violation: Suspicious input detected.");
    }

    // 2. Retrieve relevant memories (Semantic Search)
    let contextMemories = "";
    if (this.memoryEngine) {
      try {
        const memories = await this.memoryEngine.searchMemories(this.context.agent.id || 'system', userInput);
        if (memories.length > 0) {
          contextMemories = "\n\n[Long-term Memory Context]:\n" + memories.map(m => `- ${m.content}`).join('\n');
        }
      } catch (err) {
        console.error("[Agent] Memory retrieval failed:", err);
      }
    }

    const messages: Message[] = [
      ...this.context.history,
      { role: 'user', content: userInput }
    ];

    const systemInstruction = (this.context.agent.systemInstruction || "") + contextMemories;
    let iterations = 0;
    let finalResponse: AIResponse | null = null;

    while (iterations < this.maxIterations) {
      iterations++;
      console.log(`[Agent] Iteration ${iterations} for agent ${this.context.agent.id}`);

      const response = await this.provider.chat(messages, {
        systemInstruction,
        tools: this.toolEngine.getDefinitions()
      });

      // If no tool calls, we are done
      if (!response.toolCalls || response.toolCalls.length === 0) {
        finalResponse = response;
        break;
      }

      // Handle tool calls
      const toolResults: Message[] = [];
      for (const call of response.toolCalls) {
        console.log(`[Agent] Tool Call: ${call.name}`, call.arguments);
        
        if (securityLayer.validateToolExecution(this.context.agent.id, call.name, call.arguments)) {
          try {
            const result = await this.toolEngine.execute(call.name, call.arguments);
            toolResults.push({
              role: 'assistant',
              content: `Tool Result (${call.name}): ${JSON.stringify(result)}`
            });
          } catch (err: any) {
            console.error(`[Agent] Tool execution failed: ${call.name}`, err);
            toolResults.push({
              role: 'assistant',
              content: `Error executing tool ${call.name}: ${err.message}`
            });
          }
        } else {
          console.warn(`[Agent] Security blocked tool execution: ${call.name}`);
          toolResults.push({
            role: 'assistant',
            content: `Security Error: Execution of tool ${call.name} was blocked.`
          });
        }
      }

      // Add tool results to message history for the next iteration
      messages.push({ role: 'assistant', content: response.text });
      messages.push(...toolResults);
    }

    if (!finalResponse) {
      throw new Error("Agent reached maximum iterations without a final response.");
    }

    // 4. Store new memory if significant
    if (this.memoryEngine && userInput.length > 20) {
      await this.memoryEngine.addMemory(this.context.agent.id || 'system', userInput, 'conversation').catch(err => {
        console.error("[Agent] Failed to store memory:", err);
      });
    }

    return finalResponse;
  }
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  registerAgent(id: string, agent: Agent) {
    this.agents.set(id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }
}

export const agentManager = new AgentManager();
