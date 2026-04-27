import { Type, FunctionDeclaration } from "@google/genai";

export interface MCPTool extends FunctionDeclaration {
  handler: (args: any) => Promise<any>;
}

export class MCPRegistry {
  private tools: Map<string, MCPTool> = new Map();

  register(tool: MCPTool) {
    this.tools.set(tool.name, tool);
    console.log(`[FastMCP] Tool registered: ${tool.name}`);
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getAllDeclarations(): FunctionDeclaration[] {
    return Array.from(this.tools.values()).map(({ handler, ...decl }) => decl);
  }

  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found in MCP Registry`);
    
    console.log(`[FastMCP] Executing ${name}...`, args);
    try {
      return await tool.handler(args);
    } catch (error) {
      console.error(`[FastMCP] Error executing ${name}:`, error);
      throw error;
    }
  }
}

export const mcpRegistry = new MCPRegistry();
