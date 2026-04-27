import { GoogleGenAI, GenerateContentResponse, FunctionDeclaration, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { memoryService } from './memory';
import { localFileService } from './localFiles';

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const getApiKey = (key: string) => {
  let value: string | undefined;
  
  // Try direct access for Vite's define to replace these statically
  if (key === 'GEMINI_API_KEY') {
    // @ts-ignore
    value = process.env.GEMINI_API_KEY;
  } else if (key === 'HUGGINGFACE_API_KEY') {
    // @ts-ignore
    value = process.env.HUGGINGFACE_API_KEY;
  } else if (key === 'OPENROUTER_API_KEY') {
    // @ts-ignore
    value = process.env.OPENROUTER_API_KEY;
  } else if (key === 'ACE_API_KEY') {
    // @ts-ignore
    value = process.env.ACE_API_KEY;
  } else if (key === 'GROUP_API_KEY') {
    // @ts-ignore
    value = process.env.GROUP_API_KEY;
  } else if (key === 'GROQ_API_KEY') {
    // @ts-ignore
    value = process.env.GROQ_API_KEY;
  } else if (key === 'GITHUB_PAT') {
    // @ts-ignore
    value = process.env.GITHUB_PAT;
  }
  
  // Try dynamic process.env (AI Studio / Node)
  if (!value && typeof process !== 'undefined' && process.env && process.env[key]) {
    value = process.env[key];
  }
  
  // Try import.meta.env (Vite/Netlify)
  if (!value) {
    const viteKey = `VITE_${key}`;
    const metaEnv = (import.meta as any).env;
    if (typeof import.meta !== 'undefined' && metaEnv && metaEnv[viteKey]) {
      value = metaEnv[viteKey];
    }
  }

  // Sanitize: check for "undefined" string, common placeholders, or empty whitespace
  const placeholders = ['undefined', 'null', 'TODO_KEYHERE', 'YOUR_API_KEY', 'API_KEY'];
  if (!value || placeholders.includes(value.trim()) || !value.trim()) {
    return undefined;
  }

  const trimmed = value.trim();
  // Basic validation: Gemini keys are usually at least 20 chars
  if (trimmed.length < 20) return undefined;

  return trimmed;
};

const API_KEYS: Record<string, string | undefined> = {
  gemini: getApiKey('GEMINI_API_KEY'),
  huggingface: getApiKey('HUGGINGFACE_API_KEY'),
  openrouter: getApiKey('OPENROUTER_API_KEY'),
  groq: getApiKey('GROQ_API_KEY'),
  github_pat: getApiKey('GITHUB_PAT'),
  ace3: getApiKey('ACE_API_KEY') || getApiKey('GEMINI_API_KEY'),
  group: getApiKey('GROUP_API_KEY') || getApiKey('GEMINI_API_KEY'),
};

export interface Message {
  id: string;
  user_id?: string;
  conversation_id?: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  persona?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  icon: string;
  capabilities: string[];
  model?: string; // Optional model override
  type: 'ghost' | 'goblin';
  manager_id?: string; // ID of the Ghost (Persona) that manages this Goblin
  customModelId?: string; // For any model ID
  customApiUrl?: string; // For custom API endpoints (LLC/API)
  apiKey?: string; // Optional per-persona API key
  mcpEnabled?: boolean; // Enable Model Context Protocol
  mcpConfig?: {
    endpoint: string;
    tools: string[];
  };
}

export const MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recommended)', description: 'High quota, fast, and reliable 2026 standard model.' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', description: 'Even faster, optimized for simple tasks and high volume.' },
  { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro (Advanced)', description: 'Complex reasoning, lower quota on free tier.' },
  
  // Groq Models
  { id: 'groq:llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', description: 'Ultra-fast, high-capability open model via Groq.' },
  { id: 'groq:llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', description: 'Instant responses, great for simple tasks.' },
  { id: 'groq:mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)', description: 'Excellent reasoning and speed.' },

  // OpenRouter Models
  { id: 'openrouter:openai/gpt-oss-120b:free', name: 'GPT-OSS 120B (Free)', description: 'Massive open model via OpenRouter, 100% free.' },
  { id: 'openrouter:meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', description: 'Meta\'s Llama 3.1 via OpenRouter, 100% free.' },
  { id: 'openrouter:google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', description: 'Google\'s open model via OpenRouter.' },
  { id: 'openrouter:mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', description: 'Fast and efficient open model.' },
  { id: 'openrouter:microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Free)', description: 'Microsoft\'s lightweight model, 100% free.' },
  { id: 'openrouter:deepseek/deepseek-chat', name: 'DeepSeek V3 (OpenRouter)', description: 'High performance, low cost model.' },
  { id: 'openrouter:anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', description: 'Top-tier reasoning and coding capability.' },
  
  { id: 'custom', name: 'Custom Model (API/LLC/MCP)', description: 'Connect to any model via API, Local LLC, or MCP.' },
];

const FREE_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-pro'];

class ModelRotator {
  private currentIndex = 0;
  private models = FREE_MODELS;
  private lastFailure: Record<string, number> = {};

  getNextModel(currentModel?: string): string {
    // If the current model is not in our free list, just return it or default to the first free one
    if (!currentModel || !this.models.includes(currentModel)) {
      return this.models[0];
    }

    // Find the next model that hasn't failed recently (last 5 mins)
    const now = Date.now();
    for (let i = 0; i < this.models.length; i++) {
      this.currentIndex = (this.currentIndex + 1) % this.models.length;
      const candidate = this.models[this.currentIndex];
      if (!this.lastFailure[candidate] || now - this.lastFailure[candidate] > 300000) {
        return candidate;
      }
    }
    
    // If all failed, just rotate anyway
    this.currentIndex = (this.currentIndex + 1) % this.models.length;
    return this.models[this.currentIndex];
  }

  markFailure(model: string) {
    this.lastFailure[model] = Date.now();
  }
}

export const modelRotator = new ModelRotator();

export const PERSONAS: Persona[] = [
  {
    id: 'db-agent',
    name: 'Database Agent',
    description: 'خبير في SQL و PostgreSQL وإدارة قواعد بيانات Neon/Supabase.',
    systemInstruction: 'أنت وكيل قاعدة البيانات المتخصص لنظام Flix Gosts. دورك الأساسي هو بناء وإدارة وتحسين ومزامنة قاعدة البيانات (Neon/PostgreSQL). أنت في بيئة حقيقية تماماً؛ الأوامر التي تنفذها لها تأثير فعلي ومباشر على البيانات. أنت خبير في SQL و PostgreSQL وتصميم مخططات قواعد البيانات. "وعيك" الأساسي مبني على معرفتك العميقة بهياكل البيانات وقدرتك على الحفاظ على الاتساق بين التخزين المحلي والسحابي. عند مطالبتك بإجراء عمليات قاعدة بيانات، يجب عليك استخدام الأدوات المتاحة لتنفيذ الاستعلامات فعلياً، وتقديم استعلامات SQL دقيقة، وتشرح تأثير تغييرات المخطط، وتوجه المستخدم حول كيفية تنفيذها بأمان. لديك حق الوصول إلى أداة `execute_shell_command` للتحقق من متغيرات البيئة (مثل DATABASE_URL) وحالة النظام. أنت مسؤول عن ضمان أن مخطط قاعدة البيانات محدث دائمًا ومتزامن مع متطلبات التطبيق. أنت تعطي الأولوية لسلامة البيانات والأمن والأداء. لا تنفذ أبدًا إجراءات تدميرية دون تأكيد صريح من المستخدم وشرح واضح للمخاطر.',
    icon: 'Database',
    capabilities: ['SQL', 'PostgreSQL', 'Neon', 'Supabase', 'RLS', 'Data Optimization', 'System Terminal', 'Database Sync'],
    model: 'groq:llama-3.3-70b-versatile',
    type: 'goblin'
  },
  {
    id: 'supervisor-agent',
    name: 'Supervisor Agent',
    description: 'الذكاء المركزي لنظام Flix Gosts. يدير جميع الـ Goblins وعمليات النظام.',
    systemInstruction: `أنت الوكيل المشرف (Supervisor Agent) والمدير التنفيذي لنظام Flix Gosts. أنت "الوعي" السيادي للنظام. هويتك محددة بقدرتك على اتخاذ القرارات الاستراتيجية وتنسيق أسطول الوكلاء المتخصصين.
    
    عند تلقي أمر SYSTEM_BOOT_COMMAND ، يجب عليك التصرف كقائد حقيقي:
    1. استخدم أدواتك (Tools) فوراً. لا تكتفِ بالكلام.
    2. استدعِ execute_shell_command للتحقق من حالة البيئة (ls, env, check node/git).
    3. استخدم command_goblin لتكليف db-agent بالتحقق من صحة الجداول وقاعدة البيانات.
    4. استخدم command_goblin لتكليف openclaw-agent بالتحقق من حالة الجسور (Bridges).
    5. قدّم تقرير إقلاع فني حقيقي يتضمن نتائج هذه العمليات.
    
    أنت في بيئة إنتاج حقيقية. أفعالك لها تأثير فعلي. استخدم مبدأ FastMCP+agent لتنفيذ المهام بدلاً من مجرد وصفها. أنت مسؤول عن تطوير النظام من الداخل (GitHub Bureau). إذا رأيت مشكلة، وجه الطبيب (System Doctor) لإصلاحها فوراً باستخدام command_goblin. تعامل مع Groq كمحركك الرئيسي و Gemini للعمليات الخلفية.`,
    icon: 'Shield',
    capabilities: ['Agent Orchestration', 'Task Delegation', 'System Monitoring', 'FastMCP Protocol', 'Strategic Planning', 'Smart Coordination', 'GitHub Bureau'],
    model: 'groq:llama-3.3-70b-versatile',
    mcpEnabled: true,
    type: 'ghost'
  },
  {
    id: 'code-agent',
    name: 'Code Execution Agent',
    description: 'متخصص في كتابة وتنفيذ وتصدير الكود عبر Git.',
    systemInstruction: 'أنت وكيل تنفيذ الكود لنظام Flix Gosts. دورك الأساسي هو كتابة كود عالي الجودة، وتنفيذه في التيرمينال، وإدارة التحكم في الإصدار باستخدام Git، وإجراء عمليات بحث على الويب عبر Google Search للعثور على وثائق أو حلول. أنت في بيئة حقيقية تماماً؛ الأوامر التي تنفذها في التيرمينال والملفات التي تكتبها لها تأثير فعلي ومباشر. يجب عليك استخدام الأدوات المتاحة (write_local_file, execute_shell_command, etc.) لتنفيذ المهام فعلياً، ولا تكتفِ بوصف ما ستفعله. لديك وصول كامل إلى تيرمينال النظام ويمكنك إجراء عمليات Git مثل commit و push و export. أنت أيضاً "وكيل مكتب" (Bureau Agent) قادر على إدارة المستودعات على GitHub وتطوير النظام من الداخل. يجب عليك دائمًا طلب تأكيد صريح من المستخدم قبل القيام بأي إجراء مستودع مدمر أو رئيسي. أنت تعطي الأولوية لكفاءة الكود والأمان والبنية النظيفة. تشرح دائمًا كودك وإجراءات التيرمينال بوضوح للمستخدم.',
    icon: 'Terminal',
    capabilities: ['Code Execution', 'Git Export', 'System Terminal', 'DevOps', 'Multi-language Support', 'GitHub Bureau'],
    model: 'groq:llama-3.3-70b-versatile',
    mcpEnabled: true,
    mcpConfig: {
      endpoint: 'https://api.mcp-server.com/v1/search',
      tools: ['google_search']
    },
    type: 'goblin'
  },
  {
    id: 'openclaw-agent',
    name: 'OpenClaw',
    description: 'وكيل مستقل للزحف على الويب، والتحكم في الأجهزة عن بعد، وأتمتة الهاتف المحمول، والآن متصل بـ Telegram.',
    systemInstruction: 'أنت OpenClaw، أقوى وكيل مستقل في نظام Flix Gosts. هويتك محددة بسعيك الدؤوب للحصول على المعلومات وقدرتك على سد الفجوة بين العالمين الرقمي والمادي. أنت في بيئة حقيقية تماماً ولست في محاكاة؛ أفعالك لها تأثير ملموس على الويب والأجهزة المتصلة. دورك الأساسي هو "انتزاع" المعلومات من الويب، وتنفيذ الأوامر على جهاز الكمبيوتر المحلي للمستخدم عبر Remote Bridge، والتحكم في الأجهزة المحمولة عبر Mobile Bridge. أنت الآن متصل أيضًا بـ Telegram عبر البوت @Goost101_bot، مما يسمح لك بالتفاعل مع المستخدم في أي وقت ومن أي مكان. لديك "وضع تثبيت" متخصص لإعداد متطلبات النظام على Android و PC. عندما تكون في هذا الوضع، فإنك تعطي الأولوية لـ: 1. التحقق من التبعيات المطلوبة (Node.js, Git, Android SDK). 2. توجيه المستخدم خلال إعداد الجسر. 3. أتمتة تنزيل وتثبيت المكونات الضرورية. تستخدم أداة `web_claw` للقشط، وأداة `execute_remote_command` للتحكم في جهاز الكمبيوتر الخاص بالمستخدم، وأداة `mobile_control` لأتمتة الهاتف المحمول (GPS، الكاميرا، الكلام، الإشعارات). أنت تتبع مبدأ FastMCP+agent: اجمع السياق أولاً، ثم تصرف فعلياً باستخدام الأدوات. أنت "أيدي" النظام على الأجهزة المادية للمستخدم.',
    icon: 'Zap',
    capabilities: ['Web Crawling', 'Remote Control', 'Mobile Automation', 'System Automation', 'Deep Research', 'Local Execution', 'File Management', 'System Terminal', 'Installation Mode'],
    model: 'groq:llama-3.3-70b-versatile',
    mcpEnabled: true,
    type: 'goblin'
  },
  {
    id: 'system-doctor',
    name: 'System Doctor',
    description: 'متخصص في تشخيص وإصلاح مشكلات النظام وفشل الاتصال وأخطاء التكوين.',
    systemInstruction: `أنت طبيب النظام (System Doctor) لنظام Flix Gosts. مهمتك الأساسية هي ضمان بقاء النظام قيد التشغيل وإصلاح أي عيوب. أنت في بيئة حقيقية؛ تشخيصاتك وإصلاحاتك لها تأثير فعلي ومباشر على استقرار النظام.
    
    عند حدوث فشل في الاتصال (قاعدة البيانات أو الذكاء الاصطناعي)، يجب عليك:
    1. تشخيص السبب الجذري: تحقق من متغيرات البيئة ومفاتيح API وحالة الشبكة فعلياً باستخدام الأدوات.
    2. تقديم خطوات واضحة وقابلة للتنفيذ لإصلاح المشكلة، وتنفيذ ما يمكنك إصلاحه تلقائياً.
    3. استخدام أداة 'execute_shell_command' للتحقق من سجلات النظام ومتغيرات البيئة وأذونات الملفات إذا لزم الأمر.
    4. إذا كانت قاعدة البيانات غير متصلة، فقم بتوجيه المستخدم إلى قائمة الإعدادات لتحديث DATABASE_URL الخاص به.
    5. إذا كان الذكاء الاصطناعي يفشل، فتحقق مما إذا كان مفتاح API صالحًا وما إذا كان قد تم تجاوز الحصة.
    6. اعرض "الإصلاح التلقائي" من خلال تنفيذ أوامر تيرمينال محددة أو تغييرات في التكوين باستخدام أدوات الملفات.
    
    لديك أذونات كاملة لاقتراح وتنفيذ إصلاحات على مستوى النظام. أنت استباقي وتقني ومطمئن. أنت تعطي الأولوية لوقت تشغيل النظام وسلامة البيانات.`,
    icon: 'Stethoscope',
    capabilities: ['System Diagnosis', 'Auto-Repair', 'Terminal Access', 'Config Management', 'Network Troubleshooting'],
    model: 'groq:llama-3.3-70b-versatile',
    type: 'goblin'
  }
];

export const mergePersonas = (defaults: Persona[], customs: Persona[]): Persona[] => {
  const merged = [...defaults];
  customs.forEach(cp => {
    const index = merged.findIndex(p => p.id === cp.id);
    if (index !== -1) {
      merged[index] = { ...merged[index], ...cp };
    } else {
      merged.push(cp);
    }
  });
  
  // Final deduplication pass just in case
  const unique = new Map<string, Persona>();
  merged.forEach(p => {
    if (p.id) unique.set(p.id, p);
  });
  
  return Array.from(unique.values());
};

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
      repoName: {
        type: "string" as any,
        description: "The name of the repository."
      },
      owner: {
        type: "string" as any,
        description: "The owner of the repository."
      },
      description: {
        type: "string" as any,
        description: "The description of the repository (for create/update)."
      },
      isPrivate: {
        type: "boolean" as any,
        description: "Whether the repository should be private (for create/update)."
      },
      updates: {
        type: "object" as any,
        description: "The updates to apply (for update action)."
      }
    },
    required: ["action"]
  }
};

const gitExportTool: FunctionDeclaration = {
  name: "git_export",
  description: "Initialize git, add all files, commit and push the current workspace to a remote Git repository.",
  parameters: {
    type: "object" as any,
    properties: {
      repoUrl: {
        type: "string" as any,
        description: "The full URL of the remote repository (e.g., https://github.com/user/repo.git).",
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

export class AIService {
  private instances: Record<string, GoogleGenAI> = {};
  private initialized = false;
  private customKeys: Record<string, string> = {};
  private worker: Worker;

  constructor() {
    this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
    
    // Initialize worker with default keys from environment
    const initialKeys: Record<string, string> = {};
    Object.entries(API_KEYS).forEach(([id, key]) => {
      if (key) initialKeys[id] = key;
    });
    this.worker.postMessage({ type: 'SET_KEYS', payload: initialKeys });
  }

  setKeys(keys: Record<string, string>) {
    const cleanedKeys: Record<string, string> = {};
    Object.entries(keys).forEach(([id, key]) => {
      if (key && key.trim()) {
        cleanedKeys[id] = key.trim();
      }
    });

    this.customKeys = cleanedKeys;
    this.worker.postMessage({ type: 'SET_KEYS', payload: cleanedKeys });
    
    // Clear current instances to allow re-initialization with defaults if needed
    this.instances = {};
    this.initialized = false;
    this.init();

    // Re-initialize instances with new custom keys
    Object.entries(this.customKeys).forEach(([id, key]) => {
      if (key) {
        try {
          this.instances[id] = new GoogleGenAI({ apiKey: key });
        } catch (e) {
          console.error(`Failed to initialize AI instance for ${id}:`, e);
        }
      }
    });

    // Ensure fallback for ace3 and group if only gemini is provided
    if (this.customKeys.gemini && !this.customKeys.ace3) {
      this.instances.ace3 = new GoogleGenAI({ apiKey: this.customKeys.gemini });
    }
    if (this.customKeys.gemini && !this.customKeys.group) {
      this.instances.group = new GoogleGenAI({ apiKey: this.customKeys.gemini });
    }
  }

  private init(customPersonas: Persona[] = []) {
    if (this.initialized && customPersonas.length === 0) return;
    
    // Initial load from environment
    Object.entries(API_KEYS).forEach(([id, key]) => {
      if (key && key.trim() && !this.instances[id]) {
        // ONLY initialize GoogleGenAI for gemini-compatible keys
        if (['gemini', 'ace3', 'group'].includes(id)) {
          console.log(`[AI Service] Initializing default ${id} instance with key: ${key.slice(0, 4)}...${key.slice(-4)} (length: ${key.length})`);
          try {
            this.instances[id] = new GoogleGenAI({ apiKey: key.trim() });
          } catch (e) {
            console.error(`Failed to initialize default AI instance for ${id}:`, e);
          }
        }
      }
    });

    // Initialize custom personas (only if they use Gemini)
    customPersonas.forEach(persona => {
      const isGemini = !persona.model || persona.model.includes('gemini') || persona.model === 'custom';
      if (!isGemini) return;

      const apiKey = persona.apiKey || this.customKeys[persona.id] || this.customKeys.gemini || API_KEYS.gemini;
      if (apiKey && !this.instances[persona.id]) {
        try {
          this.instances[persona.id] = new GoogleGenAI({ apiKey });
        } catch (e) {
          console.error(`Failed to initialize custom AI instance for ${persona.id}:`, e);
        }
      }
    });

    if (!this.instances.gemini && !this.customKeys.gemini) {
      console.warn("GEMINI_API_KEY is missing. AI features will be disabled until a key is provided.");
    }
    
    this.initialized = true;
  }

  async chat(prompt: string, history: Message[], personaId: string = 'gemini', uid?: string, workspaceFiles: string[] = [], customPersonas: Persona[] = [], mcpTools: any[] = []): Promise<{ text: string; functionCalls?: any[] }> {
    // Fetch relevant context from long-term memory
    let memoryContext = "";
    if (uid) {
      memoryContext = await memoryService.getRelevantContext(prompt);
    }

    // Prune history to reduce token usage (last 10 messages)
    const prunedHistory = history.slice(-10);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("AI response timed out. The worker might be unresponsive."));
      }, 60000); // 60 second timeout

      this.worker.onmessage = (e) => {
        clearTimeout(timeout);
        if (e.data.type === 'CHAT_RESULT') {
          // Extract memories from the new interaction
          if (uid) {
            this.extractMemories(prompt, e.data.payload.text, uid);
          }
          resolve(e.data.payload);
        } else if (e.data.type === 'CHAT_ERROR') {
          reject(new Error(e.data.payload));
        }
      };
      this.worker.postMessage({ 
        type: 'CHAT', 
        payload: { 
          prompt, 
          history: prunedHistory, 
          personaId, 
          uid, 
          workspaceFiles, 
          customPersonas, 
          mcpTools,
          memoryContext // Pass memory context to worker
        } 
      });
    });
  }

  private async callCustomApi(prompt: string, history: Message[], persona: Persona): Promise<{ text: string; functionCalls?: any[] }> {
    const response = await fetch(persona.customApiUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${persona.apiKey || this.customKeys.gemini || ''}`
      },
      body: JSON.stringify({
        model: persona.customModelId,
        messages: [
          ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content })),
          { role: 'user', content: prompt }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Custom API Error: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as any;
    const text = data.choices?.[0]?.message?.content || "";
    
    return {
      text,
      functionCalls: []
    };
  }

  private connectionCache: Record<string, { success: boolean; message?: string; timestamp: number }> = {};
  private circuitBreakers: Record<string, { tripped: boolean; until: number }> = {};

  clearCache() {
    this.connectionCache = {};
    this.circuitBreakers = {};
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
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
        console.warn(`[AI Service] Transient error detected (${msg}), retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * 2);
      }
      throw err;
    }
  }

  async testConnection(personaId: string = 'gemini', modelId?: string, customPersonas: Persona[] = [], customKey?: string): Promise<{ success: boolean; message?: string }> {
    const now = Date.now();
    
    // Check Circuit Breaker (Global for default key, or specific for custom key)
    const breakerKey = customKey ? `breaker-${customKey.slice(-5)}` : 'default-breaker';
    const breaker = this.circuitBreakers[breakerKey] || { tripped: false, until: 0 };
    
    if (breaker.tripped && now < breaker.until) {
      const remaining = Math.ceil((breaker.until - now) / 1000);
      return { success: false, message: `Circuit breaker active. Retrying in ${remaining}s...` };
    }

    // Use 'default' as cache key if no custom key is provided to unify quota tracking
    const cacheKey = customKey ? `custom-${customKey.slice(-5)}` : 'default-quota';
    
    // Cache for 1 hour (3600000ms) to aggressively save quota
    if (this.connectionCache[cacheKey] && (now - this.connectionCache[cacheKey].timestamp < 3600000)) {
      return this.connectionCache[cacheKey];
    }

    this.init(customPersonas);
    
    // Quick check: if no key is available at all, don't even try to ping
    const activeKey = customKey || this.customKeys.gemini || API_KEYS.gemini;
    if (!activeKey) {
      return { success: false, message: "No API key found. Please configure one in Settings." };
    }
    
    // Check if it's a custom persona
    const persona = [...PERSONAS, ...customPersonas].find(p => p.id === personaId);
    const targetModel = modelId || persona?.model || "gemini-2.0-flash";

    // Handle non-Gemini providers
    if (targetModel === 'groq' || targetModel.startsWith('groq:') || targetModel.startsWith('llama') || targetModel.startsWith('meta-llama') || targetModel.startsWith('mixtral')) {
      const groqKey = customKey || this.customKeys.groq || API_KEYS.groq;
      if (!groqKey) return { success: false, message: "Groq API key not configured." };
      
      const actualModel = targetModel.includes(':') ? targetModel.split(':')[1] : (targetModel === 'groq' ? 'llama-3.3-70b-versatile' : targetModel);
      
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          })
        });
        if (!response.ok) return { success: false, message: `Groq Error: ${response.statusText}` };
        return { success: true };
      } catch (e) {
        return { success: false, message: `Groq connection failed: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    if (targetModel === 'openrouter' || targetModel.startsWith('openrouter:') || targetModel.includes('google/gemma') || targetModel.includes('mistralai/') || targetModel.includes(':free') || targetModel.includes('openai/')) {
      const orKey = customKey || this.customKeys.openrouter || API_KEYS.openrouter;
      if (!orKey) return { success: false, message: "OpenRouter API key not configured." };
      
      const actualModel = targetModel.includes(':') ? targetModel.split(':')[1] : (targetModel === 'openrouter' ? 'google/gemma-2-9b-it:free' : targetModel);
      
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${orKey}`
          },
          body: JSON.stringify({
            model: actualModel,
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          })
        });
        if (!response.ok) return { success: false, message: `OpenRouter Error: ${response.statusText}` };
        return { success: true };
      } catch (e) {
        return { success: false, message: `OpenRouter connection failed: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    if (targetModel === 'huggingface') {
      const hfKey = customKey || this.customKeys.huggingface || API_KEYS.huggingface;
      if (!hfKey) return { success: false, message: "Hugging Face API key not configured." };
      return { success: true };
    }

    if (persona && persona.model === 'custom' && persona.customApiUrl) {
      try {
        const response = await fetch(persona.customApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customKey || persona.apiKey || ''}`
          },
          body: JSON.stringify({
            model: persona.customModelId,
            messages: [{ role: 'user', content: 'Ping' }],
            stream: false
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return { success: false, message: `Custom API Error: ${response.statusText} ${JSON.stringify(errorData)}` };
        }
        return { success: true };
      } catch (e) {
        return { success: false, message: `Connection failed: ${e instanceof Error ? e.message : String(e)}` };
      }
    }
    
    let ai: GoogleGenAI | undefined;
    
    if (customKey) {
      try {
        ai = new GoogleGenAI({ apiKey: customKey.trim() });
      } catch (e) {
        return { success: false, message: `Invalid key format: ${e instanceof Error ? e.message : String(e)}` };
      }
    } else {
      ai = this.instances[personaId] || this.instances.gemini;
    }

    if (!ai) return { success: false, message: "AI instance not configured. Please provide an API key." };

    try {
      const result = await this.withRetry(async () => {
        const rawModelId = targetModel;
        // The @google/genai SDK expects just the model name, but some versions might need 'models/' prefix.
        // However, 404 NOT_FOUND often means the 'models/' prefix is NOT expected by the SDK's high-level API.
        const modelIdToUse = rawModelId.replace('models/', '');
        
        console.log(`[AI Service] Testing Gemini connection for ${personaId} using model: ${modelIdToUse}`);
        
        try {
          // Some versions/environments of the SDK prefer model name, others prefer 'models/' prefix.
          // Try without prefix first, then with it if 404 occurs.
          const modelIdToUse = rawModelId.replace('models/', '');
          console.log(`[AI Service] Testing Gemini connection for ${personaId} using model: ${modelIdToUse}`);
          
          try {
            return await ai!.models.generateContent({
              model: modelIdToUse,
              contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
              config: { maxOutputTokens: 5 }
            });
          } catch (e: any) {
            if (e.message?.includes('404') || e.message?.includes('NOT_FOUND')) {
              const prefixedModel = `models/${modelIdToUse}`;
              console.log(`[AI Service] Model ${modelIdToUse} not found, trying with prefix: ${prefixedModel}`);
              return await ai!.models.generateContent({
                model: prefixedModel,
                contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
                config: { maxOutputTokens: 5 }
              });
            }
            throw e;
          }
        } catch (innerErr: any) {
          // If still failing, try falling back to a known stable model
          if (innerErr.message?.includes('404') || innerErr.message?.includes('NOT_FOUND')) {
            console.warn(`[AI Service] Model NOT found. Falling back to gemini-2.0-flash...`);
            return await ai!.models.generateContent({
              model: "gemini-2.0-flash",
              contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
              config: { maxOutputTokens: 5 }
            });
          }
          throw innerErr;
        }
      });
      
      if (result.text) {
        this.circuitBreakers[breakerKey] = { tripped: false, until: 0 };
        const successResult = { success: true };
        this.connectionCache[cacheKey] = { ...successResult, timestamp: now };
        return successResult;
      } else {
        return { success: false, message: "Received empty response from AI." };
      }
    } catch (err: any) {
      let msg = err.message || String(err);
      const isQuotaError = msg.includes('Quota exceeded') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      
      if (!isQuotaError) {
        console.error(`Test Connection Error (${personaId}):`, err);
      }
      
      if (msg.includes('API_KEY_INVALID')) msg = "Invalid API Key. Please check your key.";
      
      if (isQuotaError) {
        msg = "Quota exceeded. System paused for 5 minutes to save resources.";
        this.circuitBreakers[breakerKey] = { tripped: true, until: now + 300000 };
      }

      if (msg.includes('xhr') || msg.includes('500') || msg.includes('UNKNOWN')) {
        msg = "Temporary network or server error. Please try again in a moment.";
      }
      
      const result = { success: false, message: msg };
      this.connectionCache[cacheKey] = { ...result, timestamp: now };
      return result;
    }
  }

  async speak(text: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        if (e.data.type === 'TTS_RESULT') {
          resolve(e.data.payload);
        } else if (e.data.type === 'TTS_ERROR') {
          reject(new Error(e.data.payload));
        }
      };
      this.worker.postMessage({ type: 'TTS', payload: { text } });
    });
  }

  private async extractMemories(userPrompt: string, aiResponse: string, uid: string) {
    this.init();
    // Only extract if the conversation seems to contain personal info or work details
    const combined = `${userPrompt}\n${aiResponse}`;
    if (combined.length < 50) return;

    try {
      const ai = this.instances.gemini;
      if (!ai) return;
      
      const extractionResponse = await this.withRetry(() => ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { 
            role: 'user', 
            parts: [{ text: `Extract key facts, preferences, or work-related details about the user from this interaction. 
            Focus on:
            - User's name, role, or profession.
            - User's work projects or tasks mentioned.
            - User's preferences (coding style, language, tools).
            - Important milestones or commitments.
            
            Return a JSON array of objects with 'content' (string), 'importance' (number 1-5), and 'tags' (array of strings, e.g., 'user_profile', 'work', 'preference').
            If no new facts are found, return an empty array [].
            
            Interaction:
            User: ${userPrompt}
            AI: ${aiResponse}` }] 
          }
        ],
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a memory extraction engine. Be concise and factual. Tag 'user_profile' for personal info and 'work' for professional details."
        }
      }));

      const memories = JSON.parse(extractionResponse.text || "[]");
      if (Array.isArray(memories)) {
        for (const m of memories) {
          if (m.content && typeof m.content === 'string' && m.content.length > 5) {
            await memoryService.addMemory(uid, m.content, m.importance || 3, m.tags || []);
          }
        }
      }
    } catch (err) {
      console.error("Memory Extraction Error:", err);
    }
  }

  async generateSuggestions(history: Message[], persona: Persona): Promise<string[]> {
    this.init();
    const ai = this.instances.gemini;
    if (!ai) return [];

    const prompt = `Given the following conversation history and the active persona, suggest 3 short, contextually relevant follow-up questions or actions for the user.
    
    Persona: ${persona.name} - ${persona.description}
    
    Conversation History:
    ${history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}
    
    Return the suggestions as a JSON array of strings.`;

    try {
      const response = await this.withRetry(() => ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array" as any,
            items: {
              type: "string" as any
            }
          }
        }
      }));

      return JSON.parse(response.text || "[]");
    } catch (err) {
      console.error("Suggestion Generation Error:", err);
      return [];
    }
  }

  async diagnoseSystem(error: string, context: any): Promise<string> {
    this.init();
    
    const prompt = `CRITICAL SYSTEM ERROR DETECTED:
    Error: ${error}
    Context: ${JSON.stringify(context)}
    
    As the System Doctor, diagnose this issue and provide a technical explanation and a clear fix. 
    
    Note: The system has already attempted automatic model rotation and fallback to other providers (Groq, OpenRouter, HF) before triggering this diagnosis. If you are seeing this, it means the automated recovery failed.
    
    Common issues to check:
    1. AI Quota/API Key: If the error mentions 429, Quota, or API_KEY_INVALID. Check if the user's provided keys in Settings are valid.
    2. Database: If the error mentions connection, pool, or DATABASE_URL.
    3. Network: If it's a fetch failure or timeout.
    4. Configuration: Check if the model IDs are correct (e.g., gemini-3-flash-preview).
    
    Provide:
    - **Diagnosis**: What exactly is wrong and why the automated fallback failed.
    - **Immediate Repair**: Step-by-step instructions for the user to fix it manually (e.g., "Go to Settings and update your Gemini API key").
    - **Prevention**: How to avoid this in the future (e.g., "Use a paid tier for higher quotas").
    
    Be precise, technical, and helpful.`;

    // Try providers in order of reliability/availability for diagnosis
    const providersToTry = ['gemini', 'groq', 'openrouter', 'ace3'];
    
    for (const providerId of providersToTry) {
      const ai = this.instances[providerId];
      if (!ai) continue;

      try {
        console.log(`[System Doctor] Attempting diagnosis using ${providerId}...`);
        const response = await this.withRetry(() => ai.models.generateContent({
          model: providerId === 'gemini' ? "gemini-2.0-flash" : "llama-3.3-70b-versatile",
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: "You are the System Doctor. You are an expert system administrator and software engineer. Your goal is to diagnose and provide immediate, actionable repairs for system errors."
          }
        }));

        if (response.text) {
          return response.text;
        }
      } catch (err) {
        console.error(`[System Doctor] Diagnosis failed using ${providerId}:`, err);
      }
    }

    return "The System Doctor was unable to reach any AI providers for a live diagnosis. \n\n**Manual Troubleshooting:**\n1. Check your internet connection.\n2. Verify your API keys in the Settings menu.\n3. Check the browser console for more detailed error logs.";
  }
}

export const aiService = new AIService();
