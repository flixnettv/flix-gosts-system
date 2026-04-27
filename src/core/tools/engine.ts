export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
}

export class ToolEngine {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    
    console.log(`[ToolEngine] Executing ${name}`, args);
    try {
      return await tool.execute(args);
    } catch (err: any) {
      console.error(`[ToolEngine] Error executing ${name}:`, err);
      throw err;
    }
  }

  getDefinitions() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }
}

export const defaultToolEngine = new ToolEngine();
