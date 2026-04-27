import path from 'path';

export interface SecurityPolicy {
  allowedTools: string[];
  blockedCommands: string[];
  restrictedPaths: string[];
  maxTokensPerRequest: number;
  rateLimitPerMinute: number;
}

export class SecurityLayer {
  private policies: Map<string, SecurityPolicy> = new Map();
  private workspaceRoot = process.cwd();
  
  private defaultPolicy: SecurityPolicy = {
    allowedTools: ['*'],
    blockedCommands: ['rm', 'sudo', 'chmod', 'chown', 'mv', 'cp', 'dd', 'mkfs', 'wget', 'curl', 'ssh', 'ftp'],
    restrictedPaths: ['/etc', '/var', '/root', '/boot', '/dev', '/proc', '/sys', '..'],
    maxTokensPerRequest: 4000,
    rateLimitPerMinute: 60
  };

  validateRequest(agentId: string, input: string): boolean {
    if (!input) return true;
    if (input.length > 10000) return false;
    
    // Check for obvious injection patterns
    const injectionPatterns = [/rm\s+-rf/, /sudo\s+/, />\s*\/etc\//, /;\s*rm/];
    if (injectionPatterns.some(p => p.test(input))) {
      this.logSecurityEvent(agentId, 'INPUT_BLOCK', `Suspicious pattern in input: ${input}`);
      return false;
    }
    
    return true;
  }

  validateToolExecution(agentId: string, toolName: string, args: any): boolean {
    const policy = this.policies.get(agentId) || this.defaultPolicy;
    
    // 1. Check if tool is allowed
    if (policy.allowedTools[0] !== '*' && !policy.allowedTools.includes(toolName)) {
      this.logSecurityEvent(agentId, 'TOOL_BLOCK', `Tool ${toolName} not allowed`);
      return false;
    }

    // 2. Deep inspection for shell/exec tools
    if (toolName === 'shell' || toolName === 'exec' || toolName === 'run_command' || toolName === 'execute_shell_command') {
      const command = args.command || args.cmd || '';
      
      // Blocked commands
      if (policy.blockedCommands.some(cmd => new RegExp(`\\b${cmd}\\b`).test(command))) {
        this.logSecurityEvent(agentId, 'COMMAND_BLOCK', `Blocked command: ${command}`);
        return false;
      }

      // Restricted paths check with resolution
      if (this.isPathRestricted(command, policy.restrictedPaths)) {
        this.logSecurityEvent(agentId, 'PATH_BLOCK', `Blocked access to restricted path in command: ${command}`);
        return false;
      }
    }

    // 3. File operation tools security
    if (toolName === 'read_local_file' || toolName === 'write_local_file') {
      const filePath = args.path || '';
      if (this.isPathRestricted(filePath, policy.restrictedPaths)) {
        this.logSecurityEvent(agentId, 'PATH_BLOCK', `Blocked file access: ${filePath}`);
        return false;
      }
    }

    return true;
  }

  private isPathRestricted(input: string, restricted: string[]): boolean {
    // Check for direct matches
    if (restricted.some(r => input.includes(r))) return true;

    // Try to resolve paths if possible
    try {
      const absolutePath = path.resolve(this.workspaceRoot, input);
      if (!absolutePath.startsWith(this.workspaceRoot)) {
        return true; // Path traversal attempt
      }
    } catch (e) {
      // If resolution fails, assume safe or handle error
    }

    return false;
  }

  private logSecurityEvent(agentId: string, type: string, detail: string) {
    const event = {
      timestamp: new Date().toISOString(),
      agentId,
      type,
      detail
    };
    console.warn(`[SecurityAudit] ${JSON.stringify(event)}`);
    // In a real system, this would go to a secure log file or database
  }

  setPolicy(agentId: string, policy: SecurityPolicy) {
    this.policies.set(agentId, policy);
  }
}

export const securityLayer = new SecurityLayer();
