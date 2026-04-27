import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Bot, 
  Database, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Sparkles,
  AlertTriangle,
  RefreshCw,
  X,
  Stethoscope,
  Activity,
  Key,
  GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService, PERSONAS, Message, Persona, mergePersonas } from './services/ai';
import { Type } from "@google/genai";
import { memoryService, Memory } from './services/memory';
import { storageService } from './services/storage';
import { userService } from './services/user';
import { taskService } from './services/task';
import { skillService } from './services/skill';
import { mcpRegistry } from './services/mcp';
import { localFileService } from './services/localFiles';
import { get, set } from 'idb-keyval';
import { TerminalLine, Conversation, Task, User } from './types';
import { Dashboard } from './components/Dashboard';
import { ChatInterface } from './components/ChatInterface';
import { MemoryView } from './components/MemoryView';
import { TemplatesView } from './components/TemplatesView';
import { AgentsView } from './components/AgentsView';
import { SettingsView } from './components/SettingsView';
import { ProfileSetup } from './components/ProfileSetup';
import { UsersView } from './components/UsersView';
import { CollaborationView } from './components/CollaborationView';
import { LocalFileExplorer } from './components/LocalFileExplorer';
import { githubService } from './services/github';
import { TerminalInterface } from './components/TerminalInterface';
import { LockScreen } from './components/LockScreen';

const TRANSLATIONS = {
  en: {
    nexus: 'Flix Gosts',
    welcome: 'Welcome to Flix Gosts',
    welcomeDesc: 'Your advanced, stealth-mode personal AI assistant. Switch intelligence cores, use the phantom terminal, or just chat. Everything is encrypted and saved locally.',
    terminal: 'Terminal',
    settings: 'Settings',
    agents: 'Agents',
    memoryTitle: 'Long-term Memory',
    memoryDesc: 'What Flix Gosts knows about you and your work.',
    placeholder: 'Message {name}...',
    terminalWelcome: 'Welcome to Flix Gosts Core Terminal. Type \'help\' for commands.',
    clearConfirm: 'Clear all data?',
    suggestions: ['Analyze current workspace structure', 'Help me plan the next development phase', 'Check system health and connection status', 'Explain the Supervisor Agent architecture'],
    online: 'Online',
    offline: 'Offline',
    general: 'General',
    apiKeys: 'API Keys',
    storage: 'Storage',
    storageMode: 'Storage Mode',
    localOnly: 'Local Only',
    clear: 'Clear All',
    saveKeys: 'Save Keys',
    addAgent: 'Add Agent',
    editPersona: 'Edit Agent',
    agentName: 'Agent Name',
    agentDesc: 'Description',
    agentModel: 'Intelligence Core',
    agentCapabilities: 'Capabilities',
    agentInstruction: 'System Instruction',
    saveAgent: 'Save Agent',
    cancel: 'Cancel',
    noAgents: 'No custom agents found.',
    clearMemory: 'Clear Memory',
    memoryEmpty: 'No memories yet.',
    sqlSchema: 'SQL Schema',
    copySchema: 'Copy Schema',
    schemaDesc: 'Run this SQL in your Neon SQL Editor.',
  },
  ar: {
    nexus: 'فليكس جوستس',
    welcome: 'مرحباً بك في فليكس جوستس',
    welcomeDesc: 'مساعدك الشخصي المتطور بنمط التخفي. بدّل أنوية الذكاء، استخدم الطرفية الشبحية، أو ابدأ الدردشة. كل شيء مشفر ومحفوظ محلياً.',
    terminal: 'الطرفية',
    settings: 'الإعدادات',
    agents: 'الوكلاء',
    memoryTitle: 'الذاكرة طويلة المدى',
    memoryDesc: 'ما يعرفه فليكس جوستس عنك وعن عملك.',
    placeholder: 'أرسل رسالة إلى {name}...',
    terminalWelcome: 'مرحباً بك في طرفية فليكس جوستس. اكتب \'help\' لعرض الأوامر.',
    clearConfirm: 'هل تريد مسح جميع البيانات؟',
    suggestions: ['حلل هيكل مساحة العمل الحالية', 'ساعدني في التخطيط لمرحلة التطوير القادمة', 'افحص حالة النظام واتصال قاعدة البيانات', 'اشرح بنية وكيل المشرف (Supervisor Agent)'],
    online: 'متصل',
    offline: 'غير متصل',
    general: 'عام',
    apiKeys: 'مفاتيح الـ API',
    storage: 'التخزين',
    storageMode: 'وضع التخزين',
    localOnly: 'محلي فقط',
    clear: 'مسح الكل',
    saveKeys: 'حفظ المفاتيح',
    addAgent: 'إضافة وكيل',
    editPersona: 'تعديل الوكيل',
    agentName: 'اسم الوكيل',
    agentDesc: 'الوصف',
    agentModel: 'نواة الذكاء',
    agentCapabilities: 'القدرات',
    agentInstruction: 'تعليمات النظام',
    saveAgent: 'حفظ الوكيل',
    cancel: 'إلغاء',
    noAgents: 'لم يتم العثور على وكلاء مخصصين.',
    clearMemory: 'مسح الذاكرة',
    memoryEmpty: 'لا توجد ذكريات بعد.',
    sqlSchema: 'مخطط SQL',
    copySchema: 'نسخ المخطط',
    schemaDesc: 'قم بتشغيل SQL هذا في محرر Neon SQL.',
  }
};

// Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <Shield className="text-red-500 mx-auto" size={48} />
            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">System Failure</h1>
            <p className="text-white/60 text-sm">{this.state.error?.message || "Unknown Error"}</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-white text-black font-black uppercase rounded-xl">Reboot System</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [view, setView] = useState<'dashboard' | 'chat' | 'terminal' | 'settings' | 'memories' | 'templates' | 'agents' | 'users' | 'collaboration' | 'files'>('dashboard');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('isUnlocked') === 'true';
  });
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'dark' | 'light') || 'dark';
  });
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    const saved = localStorage.getItem('isCompact');
    return saved ? JSON.parse(saved) : false;
  });

  const [githubConfirmation, setGithubConfirmation] = useState<{
    action: string;
    args: any;
    resolve: (val: any) => void;
    reject: (err: any) => void;
  } | null>(null);
  const [isDbReady, setIsDbReady] = useState<boolean | null>(null);
  const [isAiReady, setIsAiReady] = useState<boolean | null>(null);
  const [systemError, setSystemError] = useState<{ message: string; type: 'db' | 'ai' | 'network' | 'unknown' } | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [showDoctor, setShowDoctor] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [activePersonaId, setActivePersonaId] = useState(PERSONAS[0].id);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ gemini: '', huggingface: '', openrouter: '', groq: '', github_pat: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ memories: 0, conversations: 0, agents: 0, messages: 0 });
  const [taskStats, setTaskStats] = useState({ upcoming: 0, ongoing: 0, completed: 0, total: 0 });
  const [isMobileBridgeActive, setIsMobileBridgeActive] = useState(false);
  const [isPcBridgeActive, setIsPcBridgeActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = TRANSLATIONS[lang];
  const allPersonas = React.useMemo(() => mergePersonas(PERSONAS, customPersonas), [customPersonas]);
  const activePersona = allPersonas.find(p => p.id === activePersonaId) || allPersonas[0];

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initialization (Mount only)
  useEffect(() => {
    // Register FastMCP Tools
    mcpRegistry.register({
      name: "execute_shell_command",
      description: "Execute a shell command on the server terminal.",
      parameters: {
        type: "object" as any,
        properties: {
          command: { type: "string" as any, description: "The shell command to execute." },
        },
        required: ["command"],
      },
      handler: async ({ command }) => {
        try {
          const res = await fetch('/api/shell', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ command })
          });
          
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            return { error: `Server returned non-JSON response: ${text.slice(0, 100)}...` };
          }
        } catch (err) {
          return { error: `Network error: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    mcpRegistry.register({
      name: "git_export",
      description: "Initialize git, add all files, commit and push the current workspace to a remote Git repository.",
      parameters: {
        type: "object" as any,
        properties: {
          repoUrl: { type: "string" as any, description: "The target Git repository URL (e.g., https://github.com/user/repo.git)." },
          commitMessage: { type: "string" as any, description: "The commit message for this export." },
        },
        required: ["repoUrl", "commitMessage"],
      },
      handler: async ({ repoUrl, commitMessage }) => {
        try {
          const res = await fetch('/api/git/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch: 'main', commitMessage })
          });
          const data = await res.json() as { stdout?: string; stderr?: string; error?: string };
          if (!res.ok || data.error) {
            return { success: false, error: data.error || "Git export failed", details: data.stderr };
          }
          return { success: true, stdout: data.stdout };
        } catch (err) {
          return { success: false, error: "Network error occurred during git export." };
        }
      }
    });

    mcpRegistry.register({
      name: "command_goblin",
      description: "Delegate a task to a worker goblin agent.",
      parameters: {
        type: "object" as any,
        properties: {
          goblin_id: { type: "string" as any, description: "The ID of the goblin agent." },
          command: { type: "string" as any, description: "The instruction for the goblin." },
        },
        required: ["goblin_id", "command"],
      },
      handler: async ({ goblin_id, command }) => {
        const normalizedId = goblin_id.replace(/_/g, '-').toLowerCase();
        const goblin = allPersonas.find(p => 
          p.id.toLowerCase() === normalizedId || 
          p.id.replace(/-/g, '_').toLowerCase() === goblin_id.toLowerCase()
        );
        if (!goblin) throw new Error(`Goblin ${goblin_id} not found. Available: ${allPersonas.map(p => p.id).join(', ')}`);
        
        // Handle sub-task logic
        const activeTask = tasks.find(t => t.status === 'ongoing');
        let subTaskId: string | undefined;
        if (activeTask) {
          await taskService.addSubTask(activeTask.id, {
            title: command,
            status: 'ongoing',
            assigned_agent_id: goblin_id
          });
          await taskService.addCollaborator(activeTask.id, goblin_id);
          const updatedTask = (await storageService.query<Task>('tasks', { eq: ['id', activeTask.id] })).data?.[0];
          subTaskId = updatedTask?.sub_tasks?.find(st => st.title === command && st.assigned_agent_id === goblin_id)?.id;
        }

        const response = await aiService.chat(command, [], goblin.id, user?.id || 'default-user', [], customPersonas, mcpRegistry.getAllDeclarations());
        
        if (activeTask && subTaskId) {
          await taskService.updateSubTask(activeTask.id, subTaskId, { status: 'completed' });
        }
        
        return response;
      }
    });

    mcpRegistry.register({
      name: "web_claw",
      description: "Claw (scrape) content from a URL and return it as clean markdown.",
      parameters: {
        type: "object" as any,
        properties: {
          url: { type: "string" as any, description: "The URL of the website to claw." },
        },
        required: ["url"],
      },
      handler: async ({ url }) => {
        try {
          const res = await fetch(`/api/proxy/claw?url=${encodeURIComponent(url)}`);
          if (!res.ok) throw new Error(`Claw failed: ${res.statusText}`);
          const text = await res.text();
          return { content: text };
        } catch (err) {
          return { error: `Claw execution failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    // Remove duplicate git_export, read_local_file, write_local_file registrations
    // They are already registered above or below.
    // I will keep the ones with better descriptions/implementations.

    mcpRegistry.register({
      name: "git_push",
      description: "Push the current workspace to a remote Git repository.",
      parameters: {
        type: "object" as any,
        properties: {
          repoUrl: { type: "string" as any, description: "The target Git repository URL." },
          branch: { type: "string" as any, description: "The branch to push to." },
          commitMessage: { type: "string" as any, description: "The commit message." },
        },
        required: ["repoUrl", "branch"],
      },
      handler: async ({ repoUrl, branch, commitMessage }) => {
        try {
          const res = await fetch('/api/git/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, branch, commitMessage })
          });
          const result = await res.json() as { error?: string };
          if (!res.ok) throw new Error(result.error || "Git push failed");
          return result;
        } catch (err) {
          return { error: `Git push failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    mcpRegistry.register({
      name: "execute_remote_command",
      description: "Execute a shell command on the user's local machine via the Remote Bridge.",
      parameters: {
        type: "object" as any,
        properties: {
          command: { type: "string" as any, description: "The shell command to execute on the local machine." },
        },
        required: ["command"],
      },
      handler: async ({ command }) => {
        try {
          // Push command
          const pushRes = await fetch('/api/bridge/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
          });
          const { id } = (await pushRes.json()) as { id: string };
          
          // Poll for result
          let attempts = 0;
          const maxAttempts = 30; // 30 seconds timeout
          while (attempts < maxAttempts) {
            const res = await fetch(`/api/bridge/result/${id}`);
            if (res.ok) {
              setIsPcBridgeActive(true);
              return await res.json();
            }
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
          }
          return { error: "Remote command timed out. Ensure your local bridge client is running." };
        } catch (err) {
          return { error: `Remote execution failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    mcpRegistry.register({
      name: "read_local_file",
      description: "Read the content of a local file from the workspace.",
      parameters: {
        type: "object" as any,
        properties: {
          path: { type: "string" as any, description: "The relative path of the file to read." },
        },
        required: ["path"],
      },
      handler: async ({ path }) => {
        try {
          const content = await localFileService.readFile(path);
          return { content };
        } catch (err) {
          return { error: `File read failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    mcpRegistry.register({
      name: "write_local_file",
      description: "Write content to a local file in the workspace.",
      parameters: {
        type: "object" as any,
        properties: {
          path: { type: "string" as any, description: "The relative path of the file to write." },
          content: { type: "string" as any, description: "The content to write." },
        },
        required: ["path", "content"],
      },
      handler: async ({ path, content }) => {
        try {
          await localFileService.writeFile(path, content);
          return { success: true };
        } catch (err) {
          return { error: `File write failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    mcpRegistry.register({
      name: "mobile_control",
      description: "Control the user's mobile device via the Mobile Bridge.",
      parameters: {
        type: "object" as any,
        properties: {
          action: { type: "string" as any, enum: ["get_location", "take_photo", "speak", "notify", "vibrate"], description: "Action to perform." },
          params: { type: "object" as any, description: "Parameters for the action." },
        },
        required: ["action"],
      },
      handler: async ({ action, params }) => {
        try {
          // Push command to bridge (same as remote command)
          const pushRes = await fetch('/api/bridge/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `MOBILE:${action}:${JSON.stringify(params || {})}` })
          });
          const { id } = (await pushRes.json()) as { id: string };
          
          // Poll for result
          let attempts = 0;
          const maxAttempts = 30;
          while (attempts < maxAttempts) {
            const res = await fetch(`/api/bridge/result/${id}`);
            if (res.ok) {
              return await res.json();
            }
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
          }
          return { error: "Mobile command timed out. Ensure the app is open on your phone." };
        } catch (err) {
          return { error: `Mobile control failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    });

    mcpRegistry.register({
      name: "github_bureau",
      description: "Manage GitHub repositories. Create, update, or delete repositories. ALWAYS ask for user confirmation before destructive actions.",
      parameters: {
        type: "object" as any,
        properties: {
          action: { type: "string" as any, enum: ["create", "update", "delete", "list", "get"], description: "The action to perform on the repository." },
          repoName: { type: "string" as any, description: "The name of the repository." },
          owner: { type: "string" as any, description: "The owner of the repository." },
          description: { type: "string" as any, description: "The description of the repository (for create/update)." },
          isPrivate: { type: "boolean" as any, description: "Whether the repository should be private (for create/update)." },
          updates: { type: "object" as any, description: "The updates to apply (for update action)." }
        },
        required: ["action"],
      },
      handler: async (args) => {
        const { action, repoName, owner, description, isPrivate, updates } = args;
        
        if (['create', 'update', 'delete'].includes(action)) {
          return new Promise((resolve, reject) => {
            setGithubConfirmation({ action, args, resolve, reject });
          });
        }

        // List and Get don't need confirmation
        githubService.setToken(apiKeys.github_pat || '');
        try {
          if (action === 'list') return await githubService.listRepos();
          if (action === 'get') return await githubService.getRepo(owner, repoName);
        } catch (err) {
          return { error: String(err) };
        }
      }
    });

    const init = async () => {
      // Initialize User
      const currentUser = await userService.init('flixnettv@gmail.com');
      setUser(currentUser);

      if (currentUser && (!currentUser.name || !currentUser.avatar_url)) {
        setShowProfileSetup(true);
      }

      const savedLang = await get('lang');
      if (savedLang) setLang(savedLang);

      const localOnly = await storageService.isLocalOnly();
      setIsLocalOnly(localOnly);

      const savedKeys = await get('apiKeys');
      if (savedKeys) {
        setApiKeys(savedKeys);
        aiService.setKeys(savedKeys);
      }

      const savedPersona = await get('activePersonaId');
      if (currentUser?.assigned_persona_id) {
        setActivePersonaId(currentUser.assigned_persona_id);
      } else if (savedPersona) {
        setActivePersonaId(savedPersona);
      }

      // Initialize Skill Service
      await skillService.init();

      // Initialize Task Service
      await taskService.init(async (tasks) => {
        setTaskStats(taskService.getStats());
        
        // Ensure default agents exist in storage
        const { data: existingAgents, error: agentError } = await storageService.query<any>('agents', {});
        if (!agentError && (!existingAgents || existingAgents.length === 0)) {
          for (const p of PERSONAS) {
            await storageService.upsert('agents', {
              id: p.id,
              name: p.name,
              description: p.description,
              system_instruction: p.systemInstruction,
              icon: p.icon,
              capabilities: p.capabilities,
              model: p.model,
              type: p.id.includes('supervisor') ? 'ghost' : 'goblin',
              role: ''
            }, { on: 'id' });
          }
        }

        // Add initial system task if empty
        if (tasks.length === 0) {
          await taskService.addTask({ 
            title: 'System Initialization', 
            status: 'completed' as const,
            description: 'Core systems and agent personas initialized.'
          });
        }
      });

      loadData();
      pruneMessages();

      // Listen for storage mode changes (e.g. automatic fallback)
      const unsubscribe = storageService.subscribe('storage_mode', (data) => {
        if (data.localOnly !== undefined) {
          setIsLocalOnly(data.localOnly);
        }
      });

      return () => unsubscribe();
    };
    init();
  }, []);

  // Persona & External MCP Tools Update
  useEffect(() => {
    // Register External MCP Tools from active persona
    if (activePersona.mcpEnabled && activePersona.mcpConfig) {
      activePersona.mcpConfig.tools.forEach(toolName => {
        mcpRegistry.register({
          name: toolName,
          description: `External MCP Tool: ${toolName}`,
          parameters: {
            type: "object" as any,
            properties: {
              query: { type: "string" as any, description: "The query or input for the tool" }
            }
          },
          handler: async ({ query }) => {
            const res = await fetch(activePersona.mcpConfig!.endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool: toolName, query })
            });
            return await res.json();
          }
        });
      });
    }

    checkHealth();
  }, [activePersonaId, customPersonas]);

  const [lastHealthCheck, setLastHealthCheck] = useState(0);

  const checkHealth = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastHealthCheck < 300000) return isDbReady && isAiReady; // 5 min throttle
    
    setLastHealthCheck(now);
    if (force) aiService.clearCache();
    
    try {
      const res = await fetch('/api/health');
      const data = await res.json() as { dbStatus: string; error?: string };
      setIsDbReady(data.dbStatus === 'ok');
      
      if (data.dbStatus === 'error') {
        setSystemError({ message: data.error || 'Database connection failed', type: 'db' });
        
        // Only show terminal error if not already in local mode and not already shown
        if (!isLocalOnly && data.error?.includes('authentication failed')) {
          const lastMsg = terminalLines[terminalLines.length - 1];
          const isAlreadyShown = lastMsg && (lastMsg.text.includes('Database Authentication Failed') || lastMsg.text.includes('DATABASE_URL'));
          if (!isAlreadyShown) {
            setTerminalLines(prev => [...prev, { 
              text: `CRITICAL: ${data.error} You can use the "Connection Helper" in Settings > Storage to generate a correctly encoded URL.`, 
              type: 'error', 
              timestamp: Date.now() 
            }]);
          }
        }
      }
      
      const aiTest = await aiService.testConnection(activePersonaId, undefined, customPersonas);
      setIsAiReady(aiTest.success);
      
      if (!aiTest.success) {
        setSystemError({ message: aiTest.message || 'AI Service is offline', type: 'ai' });
        if (aiTest.message?.includes('Quota exceeded')) {
          const lastMsg = terminalLines[terminalLines.length - 1];
          if (!lastMsg || !lastMsg.text.includes('Quota Exceeded')) {
            setTerminalLines(prev => [...prev, { 
              text: "AI Quota Exceeded: System entering power-save mode. Please check your API key or wait for reset.", 
              type: 'error', 
              timestamp: Date.now() 
            }]);
          }
        }
      }
      return data.dbStatus === 'ok';
    } catch (err) {
      setIsDbReady(false);
      setIsAiReady(false);
      setSystemError({ message: 'Network error: Could not reach backend server.', type: 'network' });
      // If network fails, we might want to offer local mode
      if (!isLocalOnly) {
        setTerminalLines(prev => [...prev, { 
          text: "NETWORK ERROR: Backend unreachable. System entering offline mode. Some features may be limited.", 
          type: 'error', 
          timestamp: Date.now() 
        }]);
      }
      return false;
    }
  };

  const handleDiagnose = async () => {
    if (!systemError) return;
    setIsDiagnosing(true);
    setShowDoctor(true);
    
    try {
      const result = await aiService.diagnoseSystem(systemError.message, { 
        type: systemError.type,
        isDbReady,
        isAiReady,
        userRole: user?.role,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      setDiagnosis(result);
    } catch (err: any) {
      console.error("Diagnosis failed:", err);
      // Fallback for when even diagnosis fails
      if (systemError.message.includes('429') || systemError.message.includes('Quota exceeded')) {
        setDiagnosis(`**Diagnosis: AI Quota Exhausted (Error 429)**
        
The system has detected that your Gemini API quota has been reached. This usually happens on free tier accounts when too many requests are sent in a short period.

**Recommended Repairs:**
1. **Wait:** Free tier quotas usually reset every minute or daily.
2. **Switch Provider:** If you have Groq or OpenRouter keys, try switching to a persona that uses them.
3. **Check Keys:** Ensure you are using your own API key in Settings.

[Monitor your usage here](https://aistudio.google.com/app/plan)`);
      } else if (systemError.message.includes('API_KEY_INVALID')) {
        setDiagnosis(`**Diagnosis: Invalid API Key**
        
The API key provided is not valid or has been revoked.

**Recommended Repairs:**
1. **Verify Key:** Go to Settings and re-enter your Gemini API key.
2. **Generate New Key:** Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to generate a fresh key.`);
      } else {
        setDiagnosis("Diagnosis failed. The System Doctor is currently unable to reach any diagnostic engines. Please check your network connection and API keys manually in the Settings menu.");
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  const loadData = async () => {
    const updatedUser = await userService.refreshUser();
    if (updatedUser) {
      setUser(updatedUser);
      if (updatedUser.assigned_persona_id && updatedUser.role === 'user' && updatedUser.assigned_persona_id !== activePersonaId) {
        setActivePersonaId(updatedUser.assigned_persona_id);
      }
    }
    
    const { data: personasData } = await storageService.query<Persona>('agents', {});
    if (personasData) setCustomPersonas(personasData);

    const { data: messagesData } = await storageService.query<Message>('messages', { 
      eq: activeConversationId ? ['conversation_id', activeConversationId] : undefined,
      order: ['timestamp', { ascending: true }],
      limit: 100 
    });
    if (messagesData) setMessages(messagesData);

    const memoriesData = await memoryService.getMemories(user?.id || 'default-user');
    setMemories(memoriesData);

    const { data: tasksData } = await storageService.query<Task>('tasks', {});
    if (tasksData) setTasks(tasksData);

    const { data: convsData } = await storageService.query<Conversation>('conversations', {
      order: ['updated_at', { ascending: false }]
    });
    if (convsData) setConversations(convsData);
    
    const { data: allMessages } = await storageService.query('messages', {});
    
    setStats({
      memories: memoriesData.length,
      conversations: convsData?.length || 0,
      agents: allPersonas.length,
      messages: allMessages?.length || 0
    });

    setTaskStats(taskService.getStats());
  };

  useEffect(() => {
    loadData();
  }, [activeConversationId]);

  const handleNewConversation = async () => {
    const newConv: Conversation = {
      id: crypto.randomUUID(),
      user_id: user?.id || 'default-user',
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      persona_id: activePersonaId
    };
    await storageService.insert('conversations', [newConv]);
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    await storageService.delete('conversations', { eq: ['id', id] });
    await storageService.delete('messages', { eq: ['conversation_id', id] });
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const processAiResponse = async (response: any) => {
    let aiContent = response.text;

    // Handle FastMCP Tool Calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        try {
          const result = await mcpRegistry.execute(call.name, call.args);
          
          if (call.name === 'execute_shell_command') {
            const outputText = result.stdout || result.stderr || result.error || "No output";
            aiContent += `\n\n**Terminal Output:**\n\`\`\`\n${typeof outputText === 'string' ? outputText : JSON.stringify(outputText, null, 2)}\n\`\`\``;
          } else if (call.name === 'git_export') {
            if (!result.success) {
              aiContent += `\n\n**Git Export Failed:**\n\`\`\`\n${result.error}\n${result.details || ''}\n\`\`\``;
              setTerminalLines(prev => [...prev, { text: `Git export failed: ${result.error}`, type: 'error', timestamp: Date.now() }]);
            } else {
              aiContent += `\n\n**Git Export Successful!**\n\`\`\`\n${result.stdout}\n\`\`\``;
              setTerminalLines(prev => [...prev, { text: `Git export successful.`, type: 'success', timestamp: Date.now() }]);
            }
          } else if (call.name === 'command_goblin') {
            const goblinText = result.text || JSON.stringify(result, null, 2);
            aiContent += `\n\n**Goblin Response:**\n${goblinText}`;
          } else if (call.name === 'github_bureau') {
            if (result.error) {
              aiContent += `\n\n**GitHub Bureau Error:**\n\`\`\`\n${result.error}\n\`\`\``;
            } else {
              aiContent += `\n\n**GitHub Bureau Success:**\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`;
            }
          } else {
            // Generic MCP result display
            aiContent += `\n\n**MCP [${call.name}] Result:**\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`;
          }
        } catch (err) {
          aiContent += `\n\n**Error executing ${call.name}:** ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    }
    return aiContent;
  };

  const handleSendMessage = async (content: string) => {
    let currentConvId = activeConversationId;
    
    if (!currentConvId) {
      const newConv: Conversation = {
        id: crypto.randomUUID(),
        user_id: user?.id || 'default-user',
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        persona_id: activePersonaId
      };
      
      // Ensure conversation is inserted BEFORE messages to avoid foreign key violations
      await storageService.insert('conversations', [newConv]);
      
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      currentConvId = newConv.id;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
      persona: activePersonaId,
      conversation_id: currentConvId
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      await storageService.insert('messages', [userMsg]);
      
      // Update conversation title if it's the first message
      if (messages.length === 0 && currentConvId) {
        await storageService.upsert('conversations', { 
          id: currentConvId, 
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          updated_at: new Date().toISOString()
        }, { on: 'id' });
      }

      const response = await aiService.chat(content, messages, activePersonaId, user?.id || 'default-user', [], customPersonas, mcpRegistry.getAllDeclarations());
      
      const aiContent = await processAiResponse(response);

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        content: aiContent,
        timestamp: Date.now(),
        persona: activePersonaId,
        conversation_id: currentConvId
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      await storageService.insert('messages', [aiMsg]);

      // Generate suggestions
      const newSuggestions = await aiService.generateSuggestions(finalMessages, activePersona);
      setSuggestions(newSuggestions);
      
      // Refresh data
      loadData();
    } catch (err: any) {
      console.error("Chat Error:", err);
      const msg = err.message || String(err);
      if (
        msg.includes('API_KEY_INVALID') || 
        msg.includes('Quota exceeded') || 
        msg.includes('429') ||
        msg.includes('not configured') ||
        msg.includes('missing')
      ) {
        setSystemError({ message: msg, type: 'ai' });
        setShowDoctor(true);
        handleDiagnose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    if (!activeConversationId) return;
    
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;
    
    const messagesToDelete = messages.slice(msgIndex + 1);
    for (const m of messagesToDelete) {
      if (m.id) await storageService.delete('messages', { eq: ['id', m.id] });
    }
    
    const updatedMsg = { ...messages[msgIndex], content: newContent, timestamp: Date.now() };
    await storageService.upsert('messages', updatedMsg, { on: 'id' });
    
    const newMessages = [...messages.slice(0, msgIndex), updatedMsg];
    setMessages(newMessages);
    
    setIsLoading(true);
    try {
      const response = await aiService.chat(newContent, newMessages.slice(0, -1), activePersonaId, user?.id || 'default-user', [], customPersonas, mcpRegistry.getAllDeclarations());
      const aiContent = await processAiResponse(response);
      const modelMsg: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        content: aiContent,
        timestamp: Date.now(),
        conversation_id: activeConversationId
      };
      await storageService.insert('messages', [modelMsg]);
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error("Chat Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (id: string) => {
    if (!activeConversationId) return;
    
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;
    
    const lastUserMsgIndex = messages.slice(0, msgIndex).findLastIndex(m => m.role === 'user');
    if (lastUserMsgIndex === -1) return;
    
    const context = messages.slice(0, lastUserMsgIndex);
    const lastUserMsg = messages[lastUserMsgIndex];
    
    const messagesToDelete = messages.slice(lastUserMsgIndex + 1);
    for (const m of messagesToDelete) {
      if (m.id) await storageService.delete('messages', { eq: ['id', m.id] });
    }
    
    setMessages([...context, lastUserMsg]);
    
    setIsLoading(true);
    try {
      const response = await aiService.chat(lastUserMsg.content, context, activePersonaId, user?.id || 'default-user', [], customPersonas, mcpRegistry.getAllDeclarations());
      const aiContent = await processAiResponse(response);
      const modelMsg: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        content: aiContent,
        timestamp: Date.now(),
        conversation_id: activeConversationId
      };
      await storageService.insert('messages', [modelMsg]);
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      console.error("Chat Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!activeConversationId) return;
    try {
      await storageService.delete('messages', { eq: ['id', id] });
      setMessages(prev => prev.filter(m => m.id !== id));
      
      // Update stats
      setStats(prev => ({ ...prev, messages: prev.messages - 1 }));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const pruneMessages = async () => {
    try {
      const { data: allMessages } = await storageService.query<Message>('messages', {
        order: ['timestamp', { ascending: false }]
      });
      
      if (allMessages && allMessages.length > 500) {
        const toDelete = allMessages.slice(500);
        console.log(`[System] Pruning ${toDelete.length} old messages...`);
        for (const msg of toDelete) {
          if (msg.id) await storageService.delete('messages', { eq: ['id', msg.id] });
        }
        setTerminalLines(prev => [...prev, { 
          text: `System Maintenance: Pruned ${toDelete.length} old messages to optimize performance.`, 
          type: 'system', 
          timestamp: Date.now() 
        }]);
        loadData();
      }
    } catch (err) {
      console.error("Pruning failed:", err);
    }
  };

  const handleCommand = async (cmd: string) => {
    const inputLine: TerminalLine = { text: cmd, type: 'input', timestamp: Date.now() };
    setTerminalLines(prev => [...prev, inputLine]);

    const args = cmd.split(' ');
    const command = args[0].toLowerCase();

    let output: TerminalLine;

    switch (command) {
      case 'help':
        output = { text: "Available: help, clear, status, persona, info, ls, stats, whoami", type: 'system', timestamp: Date.now() };
        break;
      case 'clear':
        setTerminalLines([]);
        return;
      case 'status':
        output = { text: `System: Online\nDatabase: ${isDbReady ? 'Connected' : 'Local'}\nAI: ${isAiReady ? 'Ready' : 'Error'}`, type: 'system', timestamp: Date.now() };
        break;
      case 'info':
        output = { text: "Flix Gosts v1.0.0\nArchitecture: PWA + Neon\nSecurity: Encrypted", type: 'system', timestamp: Date.now() };
        break;
      case 'ls':
        if (!userService.hasPermission('access_terminal_admin')) {
          output = { text: "Access Denied: Admin privileges required.", type: 'error', timestamp: Date.now() };
        } else {
          output = { text: "Tables: conversations, messages, memories, agents, settings, templates, users", type: 'system', timestamp: Date.now() };
        }
        break;
      case 'stats':
        if (!userService.hasPermission('view_system_stats')) {
          output = { text: "Access Denied: Insufficient permissions.", type: 'error', timestamp: Date.now() };
        } else {
          output = { text: `Memories: ${stats.memories}\nConversations: ${stats.conversations}\nAgents: ${stats.agents}\nMessages: ${stats.messages}`, type: 'system', timestamp: Date.now() };
        }
        break;
      case 'whoami':
        output = { 
          text: `User: ${user?.email || 'Anonymous'}\nRole: ${user?.role || 'Guest'}\nPermissions: ${user?.role === 'admin' ? 'All' : 'Limited'}`, 
          type: 'system', 
          timestamp: Date.now() 
        };
        break;
      case 'system_boot_command':
        if (!userService.isAdmin()) {
          output = { text: "Access Denied: Admin privileges required for system boot.", type: 'error', timestamp: Date.now() };
        } else {
          output = { text: "Initiating System Boot Sequence...", type: 'system', timestamp: Date.now() };
          // Trigger Supervisor Agent
          setActivePersonaId('supervisor-agent');
          setView('chat');
          handleSendMessage(`SYSTEM_BOOT_COMMAND\n\n[SYSTEM_CONTEXT]\nUser: ${user?.email || 'Unknown'}\nRole: ${user?.role || 'Guest'}\nDB_Status: ${isDbReady ? 'ONLINE' : 'OFFLINE'}\nAI_Status: ${isAiReady ? 'READY' : 'NOT_READY'}\nPlatform: ${navigator.userAgent}\nLocalOnly: ${isLocalOnly}\nTime: ${new Date().toISOString()}`);
          return;
        }
        break;
      case 'openclaw':
        if (args[1] === 'skills') {
          if (args[2] === 'install') {
            const slug = args[3];
            if (!slug) {
              output = { text: "Usage: openclaw skills install <skill-slug>", type: 'error', timestamp: Date.now() };
            } else {
              const res = await skillService.installSkill(slug);
              output = { text: res.message, type: res.success ? 'success' : 'error', timestamp: Date.now() };
            }
          } else if (args[2] === 'update' && args[3] === '--all') {
            const res = await skillService.updateAllSkills();
            output = { text: res.message, type: res.success ? 'success' : 'error', timestamp: Date.now() };
          } else {
            output = { text: "Usage: openclaw skills [install|update]", type: 'error', timestamp: Date.now() };
          }
        } else {
          output = { text: "Usage: openclaw skills ...", type: 'error', timestamp: Date.now() };
        }
        break;
      case 'clawhub':
        if (args[1] === 'sync' && args[2] === '--all') {
          const res = await skillService.syncAll();
          output = { text: res.message, type: res.success ? 'success' : 'error', timestamp: Date.now() };
        } else {
          output = { text: "Usage: clawhub sync --all", type: 'error', timestamp: Date.now() };
        }
        break;
      default:
        // Try shell execution via API
        if (!userService.hasPermission('access_terminal_admin')) {
          output = { text: `Command not found: ${command}`, type: 'error', timestamp: Date.now() };
        } else {
          try {
            const res = await fetch('/api/shell', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ command: cmd })
            });
            
            const text = await res.text();
            let data: any;
            try {
              data = JSON.parse(text);
            } catch (e) {
              setTerminalLines(prev => [...prev, { 
                text: `Server returned non-JSON response: ${text.slice(0, 100)}...`, 
                type: 'error', 
                timestamp: Date.now() 
              }]);
              break;
            }
            
            // 1. Handle stdout
            if (data.stdout && data.stdout.trim()) {
              setTerminalLines(prev => [...prev, { 
                text: data.stdout.trim(), 
                type: 'success', 
                timestamp: Date.now() 
              }]);
            }

            // 2. Handle stderr
            if (data.stderr && data.stderr.trim()) {
              setTerminalLines(prev => [...prev, { 
                text: `STDERR: ${data.stderr.trim()}`, 
                type: 'error', 
                timestamp: Date.now() 
              }]);
            }

            // 3. Handle specific execution errors or exit codes
            if (data.error || (data.code !== undefined && data.code !== 0)) {
              const errorMsg = data.error || `Command exited with code ${data.code}${data.signal ? ` (Signal: ${data.signal})` : ''}`;
              setTerminalLines(prev => [...prev, { 
                text: `ERROR: ${errorMsg}`, 
                type: 'error', 
                timestamp: Date.now() 
              }]);
            } else if (!data.stdout && !data.stderr) {
              setTerminalLines(prev => [...prev, { 
                text: "Command executed with no output.", 
                type: 'system', 
                timestamp: Date.now() 
              }]);
            }
            return; // Exit early as we've handled the output
          } catch (err) {
            output = { text: `Network error: ${err instanceof Error ? err.message : String(err)}`, type: 'error', timestamp: Date.now() };
          }
        }
    }
    setTerminalLines(prev => [...prev, output]);
  };

  const handleSpeak = async (text: string, id: string) => {
    if (speakingId === id) {
      audioRef.current?.pause();
      setSpeakingId(null);
      return;
    }
    try {
      setSpeakingId(id);
      const audioBase64 = await aiService.speak(text);
      if (audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setSpeakingId(null);
        audio.play();
      }
    } catch (err) {
      setSpeakingId(null);
    }
  };

  const handleClearAllData = async () => {
    if (confirm(t.clearConfirm)) {
      await storageService.delete('messages', { eq: ['user_id', user?.id || 'default-user'] });
      await storageService.delete('memories', { eq: ['user_id', user?.id || 'default-user'] });
      await storageService.delete('agents', { eq: ['user_id', user?.id || 'default-user'] });
      setMessages([]);
      setCustomPersonas([]);
      window.location.reload();
    }
  };

  const [isSynced, setIsSynced] = useState(false);
  const [isBooted, setIsBooted] = useState(false);
  const [hasTriggeredBoot, setHasTriggeredBoot] = useState(() => {
    return sessionStorage.getItem('hasTriggeredBoot') === 'true';
  });

  // --- Notification Helper ---
  const sendNotification = async (title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
      } catch (e) {
        console.warn("[Notification] ServiceWorker notification failed, falling back:", e);
        try {
          new Notification(title, options);
        } catch (innerE) {
          console.error("[Notification] All notification methods failed:", innerE);
        }
      }
    }
  };

  // --- Auto-Boot Logic ---
  useEffect(() => {
    if (user?.role === 'admin' && view === 'dashboard' && isAiReady && !hasTriggeredBoot) {
      const bootSystem = async () => {
        console.log("[System Boot] Admin detected. Initializing core systems...");
        setHasTriggeredBoot(true);
        sessionStorage.setItem('hasTriggeredBoot', 'true');
        setIsBooted(true);
        
        // 1. Check Health (Only if not already ready)
        if (!isDbReady || !isAiReady) {
          await checkHealth(false);
        }
        
        // 2. Sync if possible
        if (isDbReady && !isLocalOnly) {
          console.log("[System Boot] Database reachable. Syncing local data...");
          const syncRes = await storageService.syncToCloud();
          if (syncRes.success) setIsSynced(true);
        }

        // 3. System Ready Log
        console.log("[System Boot] Core systems initialized. Supervisor standing by.");
        setTerminalLines(prev => [...prev, { 
          text: "SYSTEM ONLINE: Supervisor Agent active. All bridges established.", 
          type: 'system', 
          timestamp: Date.now() 
        }]);

        // Optionally notify user
        sendNotification("Ghost & Goblin", { body: "System initialized and ready." });
      };

      bootSystem();
    }
  }, [user, view, isAiReady]);

  // --- Mobile Bridge Logic ---
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) {
      // Check PC bridge activity
      const checkPcBridge = async () => {
        try {
          // We can't easily check if a PC is polling without a dedicated endpoint
          // But we can assume if we get a result, it's active
        } catch (e) {}
      };
      return;
    }

    setIsMobileBridgeActive(true);
    console.log("[Mobile Bridge] Initializing automation...");
    
    // Request permissions
    const requestPermissions = async () => {
      try {
        if ('Notification' in window) await Notification.requestPermission();
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
      } catch (e) {
        console.warn("Permission request failed:", e);
      }
    };
    requestPermissions();

    const poll = async () => {
      // Don't poll if we're offline or have a system error that might affect the backend
      if (systemError?.type === 'network') {
        setTimeout(poll, 5000);
        return;
      }

      try {
        const res = await fetch('/api/bridge/poll');
        if (res.ok && res.status === 200) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json() as { id: string; command: string };
            const { id, command } = data;
            
            if (command.startsWith('MOBILE:')) {
            const parts = command.split(':');
            const action = parts[1];
            const paramsStr = parts.slice(2).join(':');
            const params = JSON.parse(paramsStr || '{}');
            console.log(`[Mobile Bridge] Executing: ${action}`, params);

            let result: any = { id, stdout: "", stderr: "", error: null };

            try {
              switch (action) {
                case 'get_location':
                  const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
                  result.stdout = JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  break;
                case 'speak':
                  const utterance = new SpeechSynthesisUtterance(params.text || "");
                  window.speechSynthesis.speak(utterance);
                  result.stdout = "Spoken: " + params.text;
                  break;
                case 'notify':
                  await sendNotification("Ghost & Goblin", { body: params.text });
                  result.stdout = "Notification sent";
                  break;
                case 'vibrate':
                  if ('vibrate' in navigator) {
                    navigator.vibrate(params.pattern || [200, 100, 200]);
                    result.stdout = "Vibrated";
                  } else {
                    result.error = "Vibration not supported";
                  }
                  break;
                default:
                  result.error = "Unknown mobile action: " + action;
              }
            } catch (e: any) {
              result.error = e.message;
            }

            // Send result back
            await fetch('/api/bridge/result', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result)
            });
          } else {
            // Re-queue if not a mobile command (for PC bridge)
            await fetch('/api/bridge/push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ command })
            });
          }
        }
      }
      // Success: poll again in 2s
      setTimeout(poll, 2000);
    } catch (e: any) {
      // Silent fail for network errors to avoid console spam
      if (!e.message.includes('Failed to fetch')) {
        console.error("[Mobile Bridge] Polling error:", e);
      }
      // Fail: wait longer before retrying
      setTimeout(poll, 5000);
    }
  };

    poll();
  }, []);

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {!isUnlocked && (
          <LockScreen 
            lang={lang} 
            onUnlock={() => {
              setIsUnlocked(true);
              sessionStorage.setItem('isUnlocked', 'true');
            }} 
          />
        )}
      </AnimatePresence>
      <div className={`min-h-screen bg-black flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* System Doctor Intervention Overlay */}
        <AnimatePresence>
          {githubConfirmation && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center">
                      <GitBranch size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tighter text-white">GitHub Bureau Action</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Security Confirmation Required</p>
                    </div>
                  </div>

                  <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Action</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                        githubConfirmation.action === 'delete' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {githubConfirmation.action}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Repository</span>
                      <p className="text-sm font-bold text-white">
                        {githubConfirmation.args.owner ? `${githubConfirmation.args.owner}/` : ''}{githubConfirmation.args.repoName}
                      </p>
                    </div>
                    {githubConfirmation.args.description && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Description</span>
                        <p className="text-xs text-white/60 leading-relaxed">{githubConfirmation.args.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        githubConfirmation.resolve({ error: "User cancelled the operation." });
                        setGithubConfirmation(null);
                      }}
                      className="flex-1 py-4 bg-white/5 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        githubService.setToken(apiKeys.github_pat || '');
                        try {
                          let result;
                          const { action, args } = githubConfirmation;
                          if (action === 'create') {
                            result = await githubService.createRepo(args.repoName, args.description || '', args.isPrivate || false);
                          } else if (action === 'update') {
                            result = await githubService.updateRepo(args.owner, args.repoName, args.updates);
                          } else if (action === 'delete') {
                            await githubService.deleteRepo(args.owner, args.repoName);
                            result = { success: true, message: `Repository ${args.owner}/${args.repoName} deleted successfully.` };
                          }
                          githubConfirmation.resolve(result);
                        } catch (err) {
                          githubConfirmation.resolve({ error: String(err) });
                        }
                        setGithubConfirmation(null);
                      }}
                      className={`flex-1 py-4 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-lg ${
                        githubConfirmation.action === 'delete' 
                          ? 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/20' 
                          : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20'
                      }`}
                    >
                      Confirm Action
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showDoctor && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-red-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <Stethoscope className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">System Doctor Intervention</h2>
                      <p className="text-sm text-gray-400">Autonomous Diagnostic & Repair Mode</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDoctor(false)}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-left">
                  {systemError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-4">
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-red-400">Detected Issue: {systemError.type.toUpperCase()}</h3>
                        <p className="text-sm text-gray-300 mt-1">{systemError.message}</p>
                      </div>
                    </div>
                  )}

                  {isDiagnosing ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
                      <p className="text-gray-400 animate-pulse">Analyzing system logs and connection status...</p>
                    </div>
                  ) : diagnosis ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Activity className="w-5 h-5" />
                        <h3 className="font-semibold">Diagnosis & Repair Guide</h3>
                      </div>
                      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap">
                        {diagnosis}
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => { setView('settings'); setShowDoctor(false); }}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Database className="w-5 h-5" />
                          Go to Settings
                        </button>
                        <button 
                          onClick={async () => { 
                            await storageService.setLocalOnly(true);
                            setIsLocalOnly(true);
                            setShowDoctor(false);
                            checkHealth(true);
                          }}
                          className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <Shield className="w-5 h-5" />
                          Force Local Mode
                        </button>
                        <button 
                          onClick={() => { checkHealth(); setDiagnosis(null); }}
                          className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-5 h-5" />
                          Retry Connection
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-6">The System Doctor is ready to diagnose and attempt a repair.</p>
                      <button 
                        onClick={handleDiagnose}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-600/20 transition-all transform hover:scale-105 flex items-center gap-3 mx-auto"
                      >
                        <Sparkles className="w-6 h-6" />
                        Start Autonomous Diagnosis
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showProfileSetup && (
            <ProfileSetup 
              onComplete={() => {
                setShowProfileSetup(false);
                loadData();
              }}
              t={t}
            />
          )}
        </AnimatePresence>
        {/* Local Mode Confirmation Banner */}
        <AnimatePresence>
          {isLocalOnly && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-center gap-3 z-[60]"
            >
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                  {lang === 'ar' ? 'وضع التخفي نشط: البيانات محفوظة محلياً فقط' : 'Stealth Mode Active: Data stored locally only'}
                </span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Warning */}
        <AnimatePresence>
          {!isDbReady && !isLocalOnly && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="bg-amber-500 text-black px-6 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                Database Authentication Failed. Operating in Local Mode.
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleDiagnose()} className="flex items-center gap-1 hover:underline">
                  <Stethoscope size={12} /> Diagnose
                </button>
                <button onClick={() => checkHealth()} className="flex items-center gap-1 hover:underline">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            </motion.div>
          )}
          {isAiReady === false && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="bg-red-500 text-white px-6 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <WifiOff size={14} />
                AI Service Offline: Intelligence Cores are disconnected.
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleDiagnose()} className="flex items-center gap-1 hover:underline">
                  <Stethoscope size={12} /> Diagnose
                </button>
                <button onClick={() => setView('settings')} className="flex items-center gap-1 hover:underline">
                  <Key size={12} /> Settings
                </button>
                <button onClick={() => checkHealth()} className="flex items-center gap-1 hover:underline">
                  <RefreshCw size={12} /> Retry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {view === 'dashboard' && (
            <Dashboard 
              onNavigate={setView}
              activePersonaName={activePersona.name}
              isDbReady={isDbReady}
              isAiReady={isAiReady}
              isMobileBridgeActive={isMobileBridgeActive}
              isPcBridgeActive={isPcBridgeActive}
              isSynced={isSynced}
              isBooted={isBooted}
              checkHealth={checkHealth}
              user={user}
              stats={stats}
              taskStats={taskStats}
              t={t}
            />
          )}
          {view === 'chat' && (
            <ChatInterface 
              messages={messages}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onSendMessage={handleSendMessage}
              onClear={() => {
                if (activeConversationId) handleDeleteConversation(activeConversationId);
              }}
              onBack={() => setView('dashboard')}
              isLoading={isLoading}
              activePersona={activePersona}
              personas={allPersonas}
              onSelectPersona={setActivePersonaId}
              memories={memories}
              onDeleteMemory={(id) => {
                memoryService.deleteMemory(id);
                setMemories(prev => prev.filter(m => m.id !== id));
              }}
              tasks={tasks}
              onUpdateTask={async (id, updates) => {
                await taskService.updateTask(id, updates);
                loadData();
              }}
              t={t}
              lang={lang}
              isRtl={lang === 'ar'}
              onSpeak={handleSpeak}
              speakingId={speakingId}
              onShare={(title, text) => navigator.share?.({ title, text, url: window.location.href })}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onRegenerate={handleRegenerate}
              suggestions={suggestions}
              user={user}
              isCompact={isCompact}
            />
          )}
          {view === 'terminal' && (
            <TerminalInterface 
              onBack={() => setView('dashboard')}
              lines={terminalLines}
              onCommand={handleCommand}
              onClear={() => setTerminalLines([])}
            />
          )}
          {view === 'memories' && (
            <MemoryView 
              onBack={() => setView('dashboard')}
              uid={user?.id || 'default-user'}
              t={t}
            />
          )}
          {view === 'templates' && (
            <TemplatesView 
              onBack={() => setView('dashboard')}
              onUseTemplate={(content) => {
                setMessages([{ id: crypto.randomUUID(), role: 'system', content, timestamp: Date.now() }]);
                setView('chat');
              }}
              t={t}
            />
          )}
          {view === 'agents' && (
            <AgentsView 
              onBack={() => setView('dashboard')}
              onSelect={(id) => { setActivePersonaId(id); set('activePersonaId', id); }}
              activeId={activePersonaId}
              customPersonas={customPersonas}
              onUpdate={loadData}
              user={user}
              t={t}
            />
          )}
          {view === 'users' && (
            <UsersView 
              onBack={() => setView('dashboard')}
              personas={allPersonas}
              t={t}
            />
          )}
          {view === 'collaboration' && (
            <CollaborationView 
              onBack={() => setView('dashboard')}
              tasks={tasks}
              personas={allPersonas}
              t={t}
            />
          )}
          {view === 'files' && (
            <LocalFileExplorer 
              onBack={() => setView('dashboard')}
              t={t}
            />
          )}
          {view === 'settings' && (
            <SettingsView 
              onBack={() => setView('dashboard')}
              lang={lang}
              onLangChange={(l) => { setLang(l); set('lang', l); }}
              isLocalOnly={isLocalOnly}
              onLocalOnlyChange={(v) => { setIsLocalOnly(v); storageService.setLocalOnly(v); }}
              isCompact={isCompact}
              onCompactChange={(v) => { setIsCompact(v); localStorage.setItem('isCompact', JSON.stringify(v)); }}
              theme={theme}
              onThemeChange={setTheme}
              apiKeys={apiKeys}
              onApiKeysChange={async (k) => { 
                setApiKeys(k); 
                aiService.setKeys(k); 
                set('apiKeys', k); 
                
                // Sync Telegram keys with server
                if (k.telegram_bot_token) {
                  await storageService.upsert('settings', { key: 'telegram_bot_token', value: k.telegram_bot_token }, { on: 'key' });
                }
                if (k.app_url) {
                  await storageService.upsert('settings', { key: 'app_url', value: k.app_url }, { on: 'key' });
                }
                if (k.groq) {
                  await storageService.upsert('settings', { key: 'groq_api_key', value: k.groq }, { on: 'key' });
                }

                // Re-init Telegram bot on server
                try {
                  await fetch('/api/telegram/reinit', { method: 'POST' });
                } catch (e) {
                  console.error("Failed to re-init Telegram bot:", e);
                }
              }}
              onClearAllData={handleClearAllData}
              onPruneMessages={pruneMessages}
              t={t}
              isDbReady={isDbReady}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
