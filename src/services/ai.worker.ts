import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold, FunctionDeclaration } from "@google/genai";

// Tools
const shellTool: FunctionDeclaration = {
  name: "execute_shell_command",
  description: "Execute a shell command on the server terminal. Use this to perform system tasks, check files, or run scripts.",
  parameters: {
    type: "object" as any,
    properties: {
      command: {
        type: "string" as any,
        description: "The shell command to execute (e.g., 'ls -la', 'node -v', 'cat package.json').",
      },
    },
    required: ["command"],
  },
};

const gitExportTool: FunctionDeclaration = {
  name: "git_export",
  description: "Initialize git, add all files, commit and push the current workspace to a remote Git repository.",
  parameters: {
    type: "object" as any,
    properties: {
      repoUrl: {
        type: "string" as any,
        description: "The target Git repository URL.",
      },
      commitMessage: {
        type: "string" as any,
        description: "The commit message for the export.",
      },
    },
    required: ["repoUrl", "commitMessage"],
  },
};

const gitPushTool: FunctionDeclaration = {
  name: "git_push",
  description: "Push the current workspace to a remote Git repository.",
  parameters: {
    type: "object" as any,
    properties: {
      repoUrl: {
        type: "string" as any,
        description: "The full URL of the remote repository (e.g., https://github.com/user/repo.git).",
      },
      branch: {
        type: "string" as any,
        description: "The branch to push to (e.g., 'main', 'master').",
      },
      commitMessage: {
        type: "string" as any,
        description: "The commit message for the push.",
      },
    },
    required: ["repoUrl", "branch"],
  },
};

const writeFileTool: FunctionDeclaration = {
  name: "write_local_file",
  description: "Write content to a local file in the workspace.",
  parameters: {
    type: "object" as any,
    properties: {
      path: {
        type: "string" as any,
        description: "The relative path of the file to write.",
      },
      content: {
        type: "string" as any,
        description: "The content to write.",
      },
    },
    required: ["path", "content"],
  },
};

const readFileTool: FunctionDeclaration = {
  name: "read_local_file",
  description: "Read the content of a local file from the workspace.",
  parameters: {
    type: "object" as any,
    properties: {
      path: {
        type: "string" as any,
        description: "The relative path of the file to read.",
      },
    },
    required: ["path"],
  },
};

const webClawTool: FunctionDeclaration = {
  name: "web_claw",
  description: "Claw (scrape) content from a URL and return it as clean markdown. Use this to read the content of any website.",
  parameters: {
    type: "object" as any,
    properties: {
      url: {
        type: "string" as any,
        description: "The URL of the website to claw.",
      },
    },
    required: ["url"],
  },
};

const executeRemoteCommandTool: FunctionDeclaration = {
  name: "execute_remote_command",
  description: "Execute a shell command on the user's local machine via the Remote Bridge. Use this for local system tasks.",
  parameters: {
    type: "object" as any,
    properties: {
      command: {
        type: "string" as any,
        description: "The shell command to execute on the local machine (e.g., 'ls', 'dir', 'open .').",
      },
    },
    required: ["command"],
  },
};

const mobileControlTool: FunctionDeclaration = {
  name: "mobile_control",
  description: "Control the user's mobile device (GPS, Camera, Speech, Notifications) via the Mobile Bridge.",
  parameters: {
    type: "object" as any,
    properties: {
      action: {
        type: "string" as any,
        enum: ["get_location", "take_photo", "speak", "notify", "vibrate"],
        description: "The action to perform on the mobile device.",
      },
      params: {
        type: "object" as any,
        description: "Parameters for the action (e.g., { text: 'Hello' } for 'speak').",
      },
    },
    required: ["action"],
  },
};

const githubBureauTool: FunctionDeclaration = {
  name: "github_bureau",
  description: "Manage GitHub repositories. Create, update, or delete repositories. ALWAYS ask for user confirmation before destructive actions.",
  parameters: {
    type: "object" as any,
    properties: {
      action: { 
        type: "string" as any, 
        enum: ["create", "update", "delete", "list", "get"], 
        description: "The action to perform on the repository." 
      },
      repoName: { type: "string" as any, description: "The name of the repository." },
      owner: { type: "string" as any, description: "The owner of the repository." },
      description: { type: "string" as any, description: "The description of the repository (for create/update)." },
      isPrivate: { type: "boolean" as any, description: "Whether the repository should be private (for create/update)." },
      updates: { type: "object" as any, description: "The updates to apply (for update action)." }
    },
    required: ["action"],
  },
};

let instances: Record<string, GoogleGenAI> = {};
let customKeys: Record<string, string> = {};

const mapTypeToString = (type: any): string => {
  if (!type) return 'string';
  
  // Handle array of types (take first)
  if (Array.isArray(type)) {
    return mapTypeToString(type[0]);
  }

  // Handle numeric enum from @google/genai (Type enum)
  if (typeof type === 'number') {
    const types: Record<number, string> = {
      1: 'string', // STRING
      2: 'number', // NUMBER
      3: 'integer', // INTEGER
      4: 'boolean', // BOOLEAN
      5: 'array',   // ARRAY
      6: 'object',  // OBJECT
      7: 'null'     // NULL
    };
    return types[type] || 'string';
  }

  // Handle string values
  const s = String(type).toLowerCase().trim();
  const validTypes = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'];
  if (validTypes.includes(s)) return s;
  
  // Fallback for common variations or accidental inclusions
  if (s.includes('string')) return 'string';
  if (s.includes('number')) return 'number';
  if (s.includes('integer') || s === 'int') return 'integer';
  if (s.includes('boolean') || s === 'bool') return 'boolean';
  if (s.includes('object')) return 'object';
  if (s.includes('array')) return 'array';
  if (s.includes('null')) return 'null';
  
  return 'string';
};

const formatSchema = (schema: any): any => {
  if (!schema || typeof schema !== 'object') {
    return { type: 'string' }; // Fallback for invalid schema
  }
  
  const result: any = {};
  
  // Ensure type is a valid string
  result.type = mapTypeToString(schema.type || 'object');
  
  if (schema.description !== undefined) {
    result.description = String(schema.description);
  }
  
  if (schema.properties !== undefined && typeof schema.properties === 'object') {
    result.properties = {};
    for (const key in schema.properties) {
      const prop = schema.properties[key];
      if (prop && typeof prop === 'object') {
        result.properties[key] = formatSchema(prop);
      } else {
        result.properties[key] = { type: 'string' };
      }
    }
  }
  
  if (Array.isArray(schema.required)) {
    result.required = schema.required;
  }
  
  if (schema.items !== undefined) {
    result.items = formatSchema(schema.items);
  }
  
  if (Array.isArray(schema.enum)) {
    result.enum = schema.enum;
  }
  
  return result;
};

const FALLBACK_MODELS = [
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'openrouter', model: 'openai/gpt-oss-120b:free' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free' },
  { provider: 'openrouter', model: 'google/gemma-2-9b-it:free' },
  { provider: 'openrouter', model: 'mistralai/mistral-7b-instruct:free' },
  { provider: 'openrouter', model: 'microsoft/phi-3-mini-128k-instruct:free' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
  { provider: 'huggingface', model: 'google/gemma-2-9b-it' }
];

async function callCustomApi(prompt: string, history: any[], systemInstruction: string, model: string, apiUrl: string, apiKey: string) {
  console.log(`[AI Worker] Calling Custom API: ${apiUrl} with model: ${model}`);
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: prompt }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Custom API Error: ${response.statusText} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as any;
  return { text: data.choices[0].message.content, functionCalls: [] };
}

async function callGroq(prompt: string, history: any[], systemInstruction: string, model: string, apiKey: string, tools?: any[]) {
  console.log(`[AI Worker] Calling Groq with model: ${model}`);
  
  const formattedTools = tools?.filter(t => t.functionDeclarations).flatMap(t => t.functionDeclarations.map((f: any) => ({
    type: 'function',
    function: {
      name: f.name,
      description: f.description,
      parameters: formatSchema(f.parameters)
    }
  })));

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: prompt }
      ],
      tools: formattedTools?.length ? formattedTools : undefined,
      tool_choice: formattedTools?.length ? 'auto' : undefined
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq Error: ${response.statusText} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as any;
  const message = data.choices[0].message;
  
  const functionCalls = message.tool_calls?.map((tc: any) => ({
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments)
  })) || [];

  return { text: message.content || "", functionCalls };
}

async function callOpenRouter(prompt: string, history: any[], systemInstruction: string, model: string, apiKey: string, tools?: any[]) {
  console.log(`[AI Worker] Calling OpenRouter with model: ${model}`);
  
  const formattedTools = tools?.filter(t => t.functionDeclarations).flatMap(t => t.functionDeclarations.map((f: any) => ({
    type: 'function',
    function: {
      name: f.name,
      description: f.description,
      parameters: formatSchema(f.parameters)
    }
  })));

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://flix-gosts.ai',
      'X-Title': 'Flix Gosts'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: prompt }
      ],
      tools: formattedTools?.length ? formattedTools : undefined,
      tool_choice: formattedTools?.length ? 'auto' : undefined
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter Error: ${response.statusText} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as any;
  const message = data.choices[0].message;

  const functionCalls = message.tool_calls?.map((tc: any) => ({
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments)
  })) || [];

  return { text: message.content || "", functionCalls };
}

async function callHuggingFace(prompt: string, history: any[], systemInstruction: string, model: string, apiKey: string) {
  console.log(`[AI Worker] Calling Hugging Face with model: ${model}`);
  // HF Inference API (Chat Completion compatible)
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemInstruction },
        ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: prompt }
      ],
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Hugging Face Error: ${response.statusText} ${JSON.stringify(err)}`);
  }

  const data = await response.json() as any;
  return { text: data.choices[0].message.content, functionCalls: [] };
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

self.onmessage = async (e) => {
  const { type, payload } = e.data;

  if (type === 'SET_KEYS') {
    customKeys = payload;
    instances = {};
    Object.entries(customKeys).forEach(([id, key]) => {
      if (key && key.trim()) {
        // ONLY initialize GoogleGenAI for gemini-compatible keys
        if (['gemini', 'ace3', 'group'].includes(id)) {
          console.log(`[AI Worker] Initializing ${id} instance with key: ${key.slice(0, 4)}...${key.slice(-4)} (length: ${key.length})`);
          try {
            instances[id] = new GoogleGenAI({ apiKey: key.trim() });
          } catch (e) {
            console.error(`Failed to initialize AI instance for ${id}:`, e);
          }
        }
      }
    });

    // Fallbacks
    if (customKeys.gemini && !instances.ace3) {
      console.log(`[AI Worker] Using Gemini key fallback for ace3`);
      instances.ace3 = new GoogleGenAI({ apiKey: customKeys.gemini });
    }
    if (customKeys.gemini && !instances.group) {
      console.log(`[AI Worker] Using Gemini key fallback for group`);
      instances.group = new GoogleGenAI({ apiKey: customKeys.gemini });
    }
  } else if (type === 'CHAT') {
    const { prompt, history, personaId, workspaceFiles, customPersonas, mcpTools, memoryContext } = payload;
    
    console.log(`[AI Worker] Chat request for persona: ${personaId}`, { prompt, historyLength: history.length });

    const persona = customPersonas.find((p: any) => p.id === personaId) || { name: 'Gemini', description: 'Assistant', systemInstruction: 'You are a helpful assistant.', capabilities: [] };
    const systemInstruction = `${persona.systemInstruction}

Capabilities: ${persona.capabilities.join(', ')}

${memoryContext ? `\nRelevant Long-Term Memories:\n${memoryContext}\n` : ''}

${persona.capabilities.includes('SQL') ? 'You are an expert in SQL and PostgreSQL. When asked about database operations, provide precise SQL queries and explain their impact.' : ''}
${persona.capabilities.includes('Coding') ? 'You are an expert coder. When asked about code, provide clean, efficient, and well-documented code.' : ''}
${persona.capabilities.includes('System Terminal') ? 'You have access to the system terminal via execute_shell_command. Use it to run commands, check files, or execute scripts.' : ''}
${persona.capabilities.includes('Git Export') ? 'You can export the workspace to Git using export_to_git. Use it when the user wants to push changes to a repository.' : ''}
${persona.capabilities.includes('Remote Control') ? 'You have access to the user\'s local machine via execute_remote_command. Use it for local system tasks, file operations on the user\'s device, or running local scripts.' : ''}
${persona.mcpEnabled ? 'You have access to Model Context Protocol (MCP) tools. Use them when necessary to retrieve context or perform actions.' : ''}

FastMCP Protocol:
You have access to a set of tools provided dynamically. Use them whenever they are relevant to the user's request.
`;

    const tools: any[] = [];
    
    // Native Google Search Grounding (Free in AI Studio)
    if (persona.capabilities.includes('Web Search') || persona.capabilities.includes('Web Crawling')) {
      tools.push({ googleSearch: {} });
    }

    // Collect all function declarations
    let allFunctionDeclarations: FunctionDeclaration[] = [
      webClawTool, 
      executeRemoteCommandTool, 
      mobileControlTool,
      shellTool,
      readFileTool,
      writeFileTool,
      githubBureauTool,
      gitPushTool,
      gitExportTool
    ];

    if (mcpTools && mcpTools.length > 0) {
      allFunctionDeclarations = [...allFunctionDeclarations, ...mcpTools];
    }

    // External MCP tools are already in mcpTools if registered in App.tsx
    // but we keep this as a fallback if they are not registered there
    if (persona.mcpEnabled && persona.mcpConfig?.tools) {
      persona.mcpConfig.tools.forEach((toolName: string) => {
        if (!allFunctionDeclarations.find(d => d.name === toolName)) {
          allFunctionDeclarations.push({
            name: toolName,
            description: `External MCP Tool: ${toolName}`,
            parameters: {
              type: "object" as any,
              properties: {
                query: { type: "string" as any, description: "The query or input for the tool" }
              }
            }
          });
        }
      });
    }

    // Filter out duplicates by name
    const uniqueFunctionDeclarations = allFunctionDeclarations.filter((tool, index, self) =>
      index === self.findIndex((t) => t.name === tool.name)
    );

    if (uniqueFunctionDeclarations.length > 0) {
      tools.push({ functionDeclarations: uniqueFunctionDeclarations });
    }

    const withRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> => {
      try {
        return await fn();
      } catch (err: any) {
        const msg = err.message?.toLowerCase() || "";
        const isTransient = 
          msg.includes('500') || 
          msg.includes('503') || 
          msg.includes('xhr') || 
          msg.includes('unknown') || 
          msg.includes('high demand') ||
          msg.includes('unavailable') ||
          msg.includes('deadline exceeded');

        if (retries > 0 && isTransient) {
          console.warn(`[AI Worker] Transient error detected (${msg}), retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return withRetry(fn, retries - 1, delay * 2);
        }
        throw err;
      }
    };

    try {
      const FREE_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-pro'];
      let targetModel = persona.model || 'gemini-2.0-flash';
      
      // If the model is from a specific provider (e.g. groq:...), extract the actual model
      const [initialProvider, ...initialModelParts] = targetModel.includes(':') ? targetModel.split(':') : [null, targetModel];
      
      let modelIndex = FREE_MODELS.indexOf(targetModel);
      if (modelIndex === -1) modelIndex = 0;

      const attemptChat = async (modelId: string): Promise<any> => {
        const [providerPrefix, ...modelParts] = modelId.includes(':') ? modelId.split(':') : [null, modelId];
        const actualModel = modelParts.join(':');

        // PRIORITY 1: Custom API
        if (modelId === 'custom' && persona.customApiUrl) {
          return await callCustomApi(prompt, history, systemInstruction, persona.customModelId || 'default', persona.customApiUrl, persona.apiKey || customKeys.gemini || '');
        }

        // PRIORITY 2: Explicit Provider Routing
        if (providerPrefix === 'groq' || modelId.startsWith('llama')) {
          const groqKey = customKeys.groq;
          if (groqKey) {
            const groqModel = modelId.startsWith('llama') && !modelId.includes(':') ? modelId : actualModel;
            console.log(`[AI Worker] Using Groq for model: ${groqModel}`);
            return await callGroq(prompt, history, systemInstruction, groqModel, groqKey, tools);
          }
        }

        if (providerPrefix === 'openrouter') {
          const orKey = customKeys.openrouter;
          if (orKey) {
            console.log(`[AI Worker] Using OpenRouter for model: ${actualModel}`);
            return await callOpenRouter(prompt, history, systemInstruction, actualModel, orKey, tools);
          }
        }

        // PRIORITY 3: Gemini (Default or explicit)
        const geminiAi = instances[personaId] || instances.gemini;
        if (geminiAi && (modelId.startsWith('gemini') || modelId === 'default' || !providerPrefix)) {
          const modelIdToUse = (modelId === 'default' || !providerPrefix) ? 'gemini-2.0-flash' : modelId.replace('models/', '');
          console.log(`[AI Worker] Sending request to Gemini model: ${modelIdToUse}`);
          
          let response;
          try {
            response = await withRetry(() => geminiAi.models.generateContent({
              model: modelIdToUse,
              contents: [
                ...history
                  .filter(m => m.role !== 'system' && m.content)
                  .map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: String(m.content || "") }]
                  })),
                { role: 'user', parts: [{ text: prompt }] }
              ],
              config: {
                systemInstruction: systemInstruction,
                tools: tools.length > 0 ? tools : undefined,
              }
            }));
          } catch (e: any) {
            // If 404, try with models/ prefix
            if (e.message?.includes('404') || e.message?.includes('NOT_FOUND')) {
              const prefixedModel = `models/${modelIdToUse}`;
              console.log(`[AI Worker] Model ${modelIdToUse} not found, retrying with prefix: ${prefixedModel}`);
              response = await withRetry(() => geminiAi.models.generateContent({
                model: prefixedModel,
                contents: [
                  ...history
                    .filter(m => m.role !== 'system' && m.content)
                    .map(m => ({
                      role: m.role === 'user' ? 'user' : 'model',
                      parts: [{ text: String(m.content || "") }]
                    })),
                  { role: 'user', parts: [{ text: prompt }] }
                ],
                config: {
                  systemInstruction: systemInstruction,
                  tools: tools.length > 0 ? tools : undefined,
                }
              }));
            } else {
              throw e;
            }
          }

          console.log(`[AI Worker] Gemini response received:`, response);
          return { text: response.text || "", functionCalls: response.functionCalls || [] };
        }

        // PRIORITY 4: Legacy/Fallback Routing
        if (modelId === 'groq') {
          const groqKey = customKeys.groq;
          if (groqKey) return await callGroq(prompt, history, systemInstruction, 'llama-3.3-70b-versatile', groqKey, tools);
        }

        if (modelId === 'openrouter' || modelId.includes('google/gemma')) {
          const orKey = customKeys.openrouter;
          if (orKey) return await callOpenRouter(prompt, history, systemInstruction, modelId === 'openrouter' ? 'google/gemma-2-9b-it:free' : modelId, orKey, tools);
        }

        if (modelId === 'huggingface') {
          const hfKey = customKeys.huggingface;
          if (hfKey) return await callHuggingFace(prompt, history, systemInstruction, 'google/gemma-2-9b-it', hfKey);
        }

        throw new Error(`No AI provider available for model ${modelId}. Please check your API keys.`);
      };

      try {
        const result = await attemptChat(targetModel);
        console.log(`[AI Worker] Chat response received for persona: ${personaId} using model: ${targetModel}`);
        self.postMessage({ type: 'CHAT_RESULT', payload: result });
      } catch (error: any) {
        const isQuotaError = error.message?.includes('429') || error.message?.includes('Quota exceeded') || error.message?.includes('RESOURCE_EXHAUSTED');
        
        if (isQuotaError) {
          console.warn(`[AI Worker] ${targetModel} Quota Exceeded. Attempting rotation...`);
          
          // 1. Try other Gemini free models in rotation
          for (let i = 1; i < FREE_MODELS.length; i++) {
            const nextModel = FREE_MODELS[(modelIndex + i) % FREE_MODELS.length];
            try {
              const result = await attemptChat(nextModel);
              console.log(`[AI Worker] Rotation successful using ${nextModel}`);
              result.text = `(Auto-Rotated to ${nextModel})\n\n${result.text}`;
              self.postMessage({ type: 'CHAT_RESULT', payload: result });
              return;
            } catch (rotError) {
              console.error(`[AI Worker] Rotation to ${nextModel} failed:`, rotError);
            }
          }

          // 2. If all Gemini free models fail, try Groq (often has high free quota)
          const groqKey = customKeys.groq;
          if (groqKey) {
            const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
            for (const gModel of groqModels) {
              try {
                const result = await callGroq(prompt, history, systemInstruction, gModel, groqKey, tools);
                console.log(`[AI Worker] Rotation successful using Groq (${gModel})`);
                result.text = `(Auto-Rotated to Groq: ${gModel})\n\n${result.text}`;
                self.postMessage({ type: 'CHAT_RESULT', payload: result });
                return;
              } catch (groqError) {
                console.error(`[AI Worker] Rotation to Groq (${gModel}) failed:`, groqError);
              }
            }
          }

          // 3. If everything else fails, try OpenRouter/HF fallbacks
          console.warn("[AI Worker] All primary models exhausted. Trying external fallbacks...");
          for (const fallback of FALLBACK_MODELS) {
            const apiKey = customKeys[fallback.provider];
            if (!apiKey) continue;

            try {
              let result;
              if (fallback.provider === 'openrouter') {
                result = await callOpenRouter(prompt, history, systemInstruction, fallback.model, apiKey, tools);
              } else if (fallback.provider === 'huggingface') {
                result = await callHuggingFace(prompt, history, systemInstruction, fallback.model, apiKey);
              } else if (fallback.provider === 'groq') {
                result = await callGroq(prompt, history, systemInstruction, fallback.model, apiKey, tools);
              }

              if (result) {
                console.log(`[AI Worker] Fallback successful using ${fallback.provider} (${fallback.model})`);
                result.text = `(External Fallback: ${fallback.provider})\n\n${result.text}`;
                self.postMessage({ type: 'CHAT_RESULT', payload: result });
                return;
              }
            } catch (fallbackError) {
              console.error(`[AI Worker] Fallback to ${fallback.provider} failed:`, fallbackError);
            }
          }
        }
        throw error;
      }
    } catch (error: any) {
      console.error(`[AI Worker] Chat error for persona: ${personaId}`, error);
      self.postMessage({ type: 'CHAT_ERROR', payload: error.message });
    }
  } else if (type === 'TTS') {
    try {
      const { text } = payload;
      const ai = instances.gemini;
      if (!ai) throw new Error("TTS requires GEMINI_API_KEY");
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      self.postMessage({ type: 'TTS_RESULT', payload: audioData });
    } catch (error: any) {
      self.postMessage({ type: 'TTS_ERROR', payload: error.message });
    }
  }
};
