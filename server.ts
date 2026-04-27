import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import { db } from './src/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  let bot: TelegramBot | null = null;
  let isInitializingBot = false;

  app.use(express.json());
  
  // Request Logger
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.path}`);
    next();
  });

  // --- API Routes ---
  
  // Health Check
  app.get("/api/health", async (req, res) => {
    let dbStatus = 'ok';
    let error: string | undefined;
    try {
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
      if (connectionString) {
        await db`SELECT 1`;
      } else {
        dbStatus = 'missing';
      }
    } catch (err: any) {
      dbStatus = 'error';
      const isAuthError = err.message?.includes('password authentication failed');
      error = isAuthError ? "Database authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded." : err.message;
    }
    res.json({ status: "ok", dbStatus, error });
  });

  // Shell Execution
  app.post("/api/shell", (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command provided" });

    try {
      exec(command, (error, stdout, stderr) => {
        const response = {
          stdout: stdout || "",
          stderr: stderr || "",
          error: error ? error.message : null,
          code: error ? (error as any).code : 0,
          signal: error ? (error as any).signal : null
        };
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json(response); // Always return 200 so the client can handle the JSON
      });
    } catch (err: any) {
      res.status(500).json({ error: "Execution failed", details: err.message });
    }
  });

  // Helper to convert camelCase to snake_case for DB
  const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  const mapKeysToSnakeCase = (obj: any) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const newObj: any = {};
    for (const key in obj) {
      newObj[toSnakeCase(key)] = obj[key];
    }
    return newObj;
  };

  // Generic Query Route
  app.get("/api/query/:table", async (req, res) => {
    const { table } = req.params;
    const { select, eq, order, limit } = req.query;
    
    try {
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
      if (!connectionString) throw new Error("DATABASE_URL is missing");

      let query = db`SELECT ${db.unsafe(select as string || '*')} FROM ${db(table)}`;
      
      if (eq) {
        const [col, val] = (eq as string).split(',');
        const snakeCol = toSnakeCase(col);
        query = db`${query} WHERE ${db(snakeCol)} = ${val}`;
      }
      
      if (order) {
        const [col, asc] = (order as string).split(',');
        const snakeCol = toSnakeCase(col);
        query = db`${query} ORDER BY ${db(snakeCol)} ${asc === 'true' ? db.unsafe('ASC') : db.unsafe('DESC')}`;
      }
      
      if (limit) {
        query = db`${query} LIMIT ${parseInt(limit as string)}`;
      }
      
      const data = await query;
      res.json(data);
    } catch (error: any) {
      const isAuthError = error.message?.includes('password authentication failed');
      res.status(500).json({ 
        error: isAuthError ? "Database authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded." : error.message 
      });
    }
  });

  // Generic Insert Route
  app.post("/api/insert/:table", async (req, res) => {
    const { table } = req.params;
    const data = req.body;
    try {
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
      if (!connectionString) throw new Error("DATABASE_URL is missing");
      const results = [];
      for (const item of data) {
        const mappedItem = mapKeysToSnakeCase(item);
        const keys = Object.keys(mappedItem);
        const [res] = await db`
          INSERT INTO ${db(table)} ${db(mappedItem, ...keys)}
          RETURNING *
        `;
        results.push(res);
      }
      res.json(results);
    } catch (error: any) {
      console.error(`[Insert Error] ${table}:`, error);
      const isAuthError = error.message?.includes('password authentication failed');
      res.status(500).json({ 
        error: isAuthError ? "Database authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded." : error.message 
      });
    }
  });

  // Generic Upsert Route
  app.post("/api/upsert/:table", async (req, res) => {
    const { table } = req.params;
    const { data, options } = req.body;
    try {
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
      if (!connectionString) throw new Error("DATABASE_URL is missing");
      
      const mappedData = mapKeysToSnakeCase(data);
      const keys = Object.keys(mappedData);
      const conflictCol = toSnakeCase(options.on);
      
      // Filter out the conflict column from the update set to avoid updating the key itself
      const updateKeys = keys.filter(k => k !== conflictCol);
      
      const [resData] = await db`
        INSERT INTO ${db(table)} ${db(mappedData, keys)}
        ON CONFLICT (${db(conflictCol)}) 
        DO UPDATE SET ${db(mappedData, ...updateKeys)}
        RETURNING *
      `;
      
      // If we updated settings, refresh our local variables
      if (table === 'settings') {
        if (data.key === 'telegram_bot_token') {
          process.env.TELEGRAM_BOT_TOKEN = data.value;
        }
        if (data.key === 'app_url') {
          process.env.APP_URL = data.value;
        }
      }

      res.json(resData);
    } catch (error: any) {
      const isAuthError = error.message?.includes('password authentication failed');
      res.status(500).json({ 
        error: isAuthError ? "Database authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded." : error.message 
      });
    }
  });

  // Generic Delete Route
  app.post("/api/delete/:table", async (req, res) => {
    const { table } = req.params;
    const { eq } = req.body;
    try {
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
      if (!connectionString) throw new Error("DATABASE_URL is missing");
      await db`DELETE FROM ${db(table)} WHERE ${db(eq[0])} = ${eq[1]}`;
      res.json({ success: true });
    } catch (error: any) {
      const isAuthError = error.message?.includes('password authentication failed');
      res.status(500).json({ 
        error: isAuthError ? "Database authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded." : error.message 
      });
    }
  });

  // Git Export Route
  app.post("/api/git/export", (req, res) => {
    const { repoUrl, commitMessage } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "No repository URL provided" });

    // Use a temporary directory or the current workspace
    // In this environment, we are in the workspace root
    const commands = [
      "git init",
      "git config user.email 'flixnettv@gmail.com'",
      "git config user.name 'Ghost Admin'",
      "git add .",
      // Pre-commit hook logic: Check for sensitive information (API keys, secrets, etc.)
      // We exclude certain files that are known to contain these strings for configuration/documentation purposes
      "if grep -rEi \"api_key|secret|password|token\" . --exclude-dir=.git --exclude=PROJECT_TRANSFER.md --exclude=package-lock.json --exclude=server.ts --exclude=firebase-applet-config.json --exclude=*.md | grep -v \"//\" | grep -v \"#\"; then echo 'SECURITY ERROR: Sensitive information (API keys/secrets) detected in staged files. Commit aborted.'; exit 1; fi",
      `git commit -m "${commitMessage || 'Export from Ghost & Goblin Platform'}"`,
      `git remote add origin ${repoUrl} || git remote set-url origin ${repoUrl}`,
      "git branch -M main",
      "git push -u origin main"
    ];

    const fullCommand = commands.join(" && ");

    exec(fullCommand, (error, stdout, stderr) => {
      const response = {
        stdout: stdout || "",
        stderr: stderr || "",
        error: error ? error.message : null
      };
      res.setHeader('Content-Type', 'application/json');
      res.status(error ? 500 : 200).json(response);
    });
  });

  // Git Push Route
  app.post("/api/git/push", (req, res) => {
    const { repoUrl, branch = 'main', commitMessage } = req.body;
    if (!repoUrl) return res.status(400).json({ error: "No repository URL provided" });

    const commands = [
      "git init",
      "git config user.email 'flixnettv@gmail.com'",
      "git config user.name 'Ghost Admin'",
      "git add .",
      `git commit -m "${commitMessage || 'Push from Ghost & Goblin Platform'}"`,
      `git remote add origin ${repoUrl} || git remote set-url origin ${repoUrl}`,
      `git branch -M ${branch}`,
      `git push -u origin ${branch}`
    ];

    const fullCommand = commands.join(" && ");

    exec(fullCommand, (error, stdout, stderr) => {
      const response = {
        stdout: stdout || "",
        stderr: stderr || "",
        error: error ? error.message : null
      };
      res.setHeader('Content-Type', 'application/json');
      res.status(error ? 500 : 200).json(response);
    });
  });

  // --- Remote Bridge (Local Machine Control) ---
  let remoteCommandQueue: { id: string; command: string; timestamp: number }[] = [];
  let remoteResults: Record<string, { stdout: string; stderr: string; error: string | null }> = {};

  // Agent pushes a command to the remote machine
  app.post("/api/bridge/push", (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command provided" });
    
    const id = Math.random().toString(36).substring(7);
    remoteCommandQueue.push({ id, command, timestamp: Date.now() });
    console.log(`[Bridge] Command pushed: ${id} -> ${command}`);
    res.json({ id, status: "queued" });
  });

  // Local client polls for commands
  app.get("/api/bridge/poll", (req, res) => {
    const cmd = remoteCommandQueue.shift();
    if (cmd) {
      res.json(cmd);
    } else {
      res.status(204).send(); // No content
    }
  });

  // Local client posts the result
  app.post("/api/bridge/result", (req, res) => {
    const { id, stdout, stderr, error } = req.body;
    remoteResults[id] = { stdout, stderr, error };
    console.log(`[Bridge] Result received for ${id}`);
    res.json({ status: "received" });
  });

  // Agent checks for the result
  app.get("/api/bridge/result/:id", (req, res) => {
    const { id } = req.params;
    const result = remoteResults[id];
    if (result) {
      delete remoteResults[id];
      res.json(result);
    } else {
      res.status(404).json({ error: "Result not ready" });
    }
  });

  // --- Telegram Bot Integration ---
  const initTelegramBot = async () => {
    if (isInitializingBot) return;
    isInitializingBot = true;

    try {
      const tokenRes = await db`SELECT value FROM settings WHERE key = 'telegram_bot_token'`;
      const urlRes = await db`SELECT value FROM settings WHERE key = 'app_url'`;
      
      const token = tokenRes[0]?.value || process.env.TELEGRAM_BOT_TOKEN;
      const appUrl = urlRes[0]?.value || process.env.APP_URL;

      if (!token) {
        console.log("[Telegram] No bot token found. Bot disabled.");
        return;
      }

      if (bot) {
        console.log("[Telegram] Bot already initialized. Skipping.");
        return;
      }

      console.log("[Telegram] Initializing bot...");
      bot = new TelegramBot(token, { polling: false });

      // Handle polling errors (specifically 409 Conflict)
      bot.on('polling_error', (error: any) => {
        console.error(`[Telegram Polling Error] ${error.code}: ${error.message}`);
        if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
          console.warn("[Telegram] 409 Conflict: Another instance is polling. Stopping this instance's polling.");
          bot?.stopPolling().catch(err => console.error("[Telegram] Failed to stop polling:", err));
        }
      });

      if (appUrl) {
        const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
        await bot.setWebHook(webhookUrl);
        console.log(`[Telegram] Webhook set to: ${webhookUrl}`);
      } else {
        // If no appUrl, we must ensure webhook is deleted before polling to avoid 409 Conflict
        await bot.deleteWebHook();
        await bot.startPolling();
        console.log(`[Telegram] Webhook deleted and polling started.`);
      }

      bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text) return;

        // Handle /start <token>
        if (text.startsWith('/start ')) {
          const token = text.split(' ')[1];
          const userRes = await db`SELECT id, email FROM users WHERE telegram_token = ${token}`;
          if (userRes.length > 0) {
            const user = userRes[0];
            await db`UPDATE users SET telegram_chat_id = ${chatId} WHERE id = ${user.id}`;
            await bot?.sendMessage(chatId, `✅ تم ربط حسابك بنجاح! مرحباً بك ${user.email}.`);
          } else {
            await bot?.sendMessage(chatId, `❌ رمز الربط غير صالح.`);
          }
          return;
        }

        // Check if user is linked
        const userRes = await db`SELECT id, email FROM users WHERE telegram_chat_id = ${chatId}`;
        if (userRes.length === 0) {
          await bot?.sendMessage(chatId, `⚠️ حسابك غير مربوط. يرجى الذهاب إلى الإعدادات في التطبيق.`);
          return;
        }

        const user = userRes[0];

        // Handle commands
        if (text === '/agents') {
          const agents = await db`SELECT id, name FROM agents WHERE user_id = ${user.id} OR type = 'ghost'`;
          const list = agents.map(a => `• ${a.name} - \`/switch ${a.id}\``).join('\n');
          await bot?.sendMessage(chatId, `🤖 الوكلاء المتاحون:\n${list}`);
          return;
        }

        if (text.startsWith('/switch ')) {
          const agentId = text.split(' ')[1];
          await db`INSERT INTO settings (key, value) VALUES (${`tg_active_agent_${chatId}`}, ${JSON.stringify(agentId)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
          await bot?.sendMessage(chatId, `🔄 تم التبديل إلى الوكيل بنجاح.`);
          return;
        }

        // Default: Chat with active agent
        try {
          const [activeAgentSetting] = await db`SELECT value FROM settings WHERE key = ${`tg_active_agent_${chatId}`}`;
          const agentId = activeAgentSetting ? activeAgentSetting.value : 'supervisor-agent';
          const [agent] = await db`SELECT * FROM agents WHERE id = ${agentId}`;
          const systemInstruction = agent ? agent.system_instruction : 'أنت وكيل مساعد في نظام Flix Gosts. اسمك OpenClaw AI.';

          const attemptChat = async () => {
            // 1. Try Groq
            const groqKey = process.env.GROQ_API_KEY;
            if (groqKey) {
              try {
                const groq = new Groq({ apiKey: groqKey });
                const completion = await groq.chat.completions.create({
                  model: 'llama-3.3-70b-versatile',
                  messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: text }
                  ]
                });
                return completion.choices[0].message.content;
              } catch (e) {
                console.warn("[Telegram] Groq failed, trying fallback...");
              }
            }

            // 2. Try OpenRouter
            const orKey = process.env.OPENROUTER_API_KEY;
            if (orKey) {
              try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${orKey}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    model: "google/gemma-2-9b-it:free",
                    messages: [
                      { role: "system", content: systemInstruction },
                      { role: "user", content: text }
                    ]
                  })
                });
                const data = await response.json() as any;
                return data.choices[0].message.content;
              } catch (e) {
                console.warn("[Telegram] OpenRouter failed, trying fallback...");
              }
            }

            // 3. Try Hugging Face
            const hfKey = process.env.HUGGINGFACE_API_KEY;
            if (hfKey) {
              try {
                const response = await fetch("https://api-inference.huggingface.co/models/google/gemma-2-9b-it", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${hfKey}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ inputs: text })
                });
                const data = await response.json() as any;
                return Array.isArray(data) ? data[0].generated_text : data.generated_text;
              } catch (e) {
                console.warn("[Telegram] Hugging Face failed, trying fallback...");
              }
            }

            throw new Error("All AI providers failed.");
          };

          const responseText = await attemptChat() || "No response";
          await bot?.sendMessage(chatId, responseText);

          // Save to DB
          await db`INSERT INTO messages (user_id, role, content, persona) VALUES (${user.id}, 'user', ${text}, ${agentId})`;
          await db`INSERT INTO messages (user_id, role, content, persona) VALUES (${user.id}, 'model', ${responseText}, ${agentId})`;

        } catch (err: any) {
          console.error(`[Telegram AI Error]`, err);
          await bot?.sendMessage(chatId, `❌ حدث خطأ أثناء معالجة طلبك.`);
        }
      });
    } catch (err) {
      console.error("[Telegram] Init failed:", err);
    } finally {
      isInitializingBot = false;
    }
  };

  // Telegram Webhook Endpoint
  app.post("/api/telegram/webhook", async (req, res) => {
    if (bot) {
      bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  });

  // Re-init when settings change
  app.post("/api/telegram/reinit", async (req, res) => {
    if (bot) {
      if (bot.isPolling()) await bot.stopPolling();
      bot = null;
    }
    await initTelegramBot();
    res.json({ status: "ok" });
  });

  // Proactive Notification API
  app.post("/api/telegram/notify", async (req, res) => {
    const { userId, text } = req.body;
    if (!userId || !text) return res.status(400).json({ error: "userId and text are required" });

    try {
      const [user] = await db`SELECT telegram_chat_id FROM users WHERE id = ${userId}`;
      if (user && user.telegram_chat_id && bot) {
        await bot.sendMessage(Number(user.telegram_chat_id), text);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "User not linked or bot not ready" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Web Claw Proxy (using r.jina.ai for free markdown scraping)
  app.get("/api/proxy/claw", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: "URL is required" });
    
    try {
      console.log(`[Claw] Grabbing content from: ${url}`);
      const response = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Accept': 'text/event-stream', // Jina supports streaming but we'll take the full text
          'X-With-Links-Summary': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Claw failed with status: ${response.status}`);
      }
      
      const text = await response.text();
      res.setHeader('Content-Type', 'text/plain');
      res.send(text);
    } catch (err: any) {
      console.error(`[Claw Error] ${err.message}`);
      res.status(500).json({ error: "Claw execution failed", details: err.message });
    }
  });

  // --- Server Start & DB Init ---
  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(err.status || 500).json({ 
      error: "Internal Server Error", 
      message: err.message || String(err),
      path: req.path
    });
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Run init after a short delay to ensure DB is ready
    setTimeout(initTelegramBot, 5000);
    
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
    if (!connectionString) {
      console.warn("DATABASE_URL is missing. Skipping table initialization.");
      return;
    }

    try {
      await db`SELECT 1`;
      console.log("Database connection verified. Initializing tables...");
      
      // Fetch Telegram settings from DB if not in env
      const telegramTokenSetting = await db`SELECT value FROM settings WHERE key = 'telegram_bot_token'`.catch(() => []);
      if (telegramTokenSetting.length > 0 && !process.env.TELEGRAM_BOT_TOKEN) {
        process.env.TELEGRAM_BOT_TOKEN = telegramTokenSetting[0].value;
        console.log("[Telegram] Loaded token from database.");
      }

      const appUrlSetting = await db`SELECT value FROM settings WHERE key = 'app_url'`.catch(() => []);
      if (appUrlSetting.length > 0 && !process.env.APP_URL) {
        process.env.APP_URL = appUrlSetting[0].value;
        console.log("[Telegram] Loaded APP_URL from database.");
      }

      // Re-initialize Telegram if we just loaded keys
      if (process.env.TELEGRAM_BOT_TOKEN && process.env.APP_URL) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const url = process.env.APP_URL;
        fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${url}/api/telegram/webhook`)
          .then(r => r.json())
          .then(data => console.log(`[Telegram] Webhook auto-configured:`, data))
          .catch(err => console.error(`[Telegram] Webhook auto-config failed:`, err));
      }

      await db`
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          title TEXT,
          persona_id TEXT,
          updated_at TIMESTAMPTZ DEFAULT now(),
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          user_id TEXT,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          persona TEXT,
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS memories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          content TEXT NOT NULL,
          category TEXT DEFAULT 'general',
          tags TEXT[] DEFAULT '{}',
          importance INTEGER DEFAULT 1,
          embedding float8[],
          metadata JSONB DEFAULT '{}',
          timestamp BIGINT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;
      
      try {
        await db`CREATE EXTENSION IF NOT EXISTS vector`;
        await db`ALTER TABLE memories ALTER COLUMN embedding TYPE vector(768) USING embedding::vector(768)`;
      } catch (e) {
        console.warn("[Database] pgvector extension not available, using float8[] for embeddings.");
      }

      await db`
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          description TEXT,
          system_instruction TEXT NOT NULL,
          icon TEXT DEFAULT 'Bot',
          capabilities TEXT[] DEFAULT '{}',
          model TEXT DEFAULT 'gemini-2.0-flash',
          type TEXT DEFAULT 'goblin',
          role TEXT DEFAULT '',
          manager_id TEXT,
          custom_model_id TEXT,
          custom_api_url TEXT,
          api_key TEXT,
          mcp_enabled BOOLEAN DEFAULT false,
          mcp_config JSONB DEFAULT '{"endpoint": "", "tools": []}',
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS user_api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          service_name TEXT NOT NULL,
          api_key_encrypted TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, service_name)
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          content TEXT NOT NULL,
          category TEXT,
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          avatar_url TEXT,
          role TEXT DEFAULT 'user',
          telegram_chat_id BIGINT UNIQUE,
          telegram_token TEXT UNIQUE,
          updated_at TIMESTAMPTZ DEFAULT now(),
          created_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
          user_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'upcoming',
          collaborator_ids TEXT[] DEFAULT '{}',
          sub_tasks JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      await db`
        CREATE TABLE IF NOT EXISTS skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          version TEXT,
          config JSONB DEFAULT '{}',
          installed_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `;

      // Ensure default admin
      await db`INSERT INTO users (email, role, telegram_chat_id) VALUES ('flixnettv@gmail.com', 'admin', 8193688252) ON CONFLICT (email) DO UPDATE SET telegram_chat_id = EXCLUDED.telegram_chat_id`;

      // Ensure OpenClaw AI agent
      await db`
        INSERT INTO agents (id, name, description, system_instruction, icon, type, role)
        VALUES (
          'openclaw-ai',
          'OpenClaw AI',
          'Your personal assistant from openclaw.ai',
          'أنت OpenClaw AI، المساعد الشخصي للمستخدم. أنت خبير في التكنولوجيا والذكاء الاصطناعي وتساعد المستخدم في جميع مهامه.',
          'Ghost',
          'ghost',
          'Personal Assistant'
        )
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          system_instruction = EXCLUDED.system_instruction
      `;

      // Ensure Telegram Bot Token in settings
      await db`INSERT INTO settings (key, value) VALUES ('telegram_bot_token', '"8554899820:AAGiVUq3MIRfOdY-g8KOnqUuQ3gkEFyfCcc"') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;

      // Ensure columns exist (migrations)
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-1.5-flash'`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS mcp_enabled BOOLEAN DEFAULT false`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS mcp_config JSONB DEFAULT '{"endpoint": "", "tools": []}'`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_model_id TEXT`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS custom_api_url TEXT`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS api_key TEXT`;

      await db`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`;
      await db`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS persona_id TEXT`;
      await db`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS collaborator_ids TEXT[] DEFAULT '{}'`;
      await db`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'`;

      // Fix user_id types if they are still UUID
      const fixUserIdType = async (table: string) => {
        try {
          await db.unsafe(`ALTER TABLE ${table} ALTER COLUMN user_id TYPE TEXT`);
        } catch (e) {
          // Ignore if already text or other issues
        }
      };

      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_token TEXT UNIQUE`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Bot'`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gemini-2.0-flash'`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'goblin'`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS role TEXT DEFAULT ''`;
      await db`ALTER TABLE agents ALTER COLUMN role DROP NOT NULL`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS manager_id TEXT`;
      await db`ALTER TABLE agents ADD COLUMN IF NOT EXISTS capabilities TEXT[] DEFAULT '{}'`;

      await fixUserIdType('conversations');
      await fixUserIdType('messages');
      await fixUserIdType('memories');
      await fixUserIdType('agents');
      await fixUserIdType('user_api_keys');
      await fixUserIdType('tasks');

      // Migrate existing agents
      await db`UPDATE agents SET model = 'gemini-2.0-flash' WHERE model LIKE '%gemini-1.5%' OR model LIKE '%gemini-3%' OR model LIKE '%gemini-flash-latest%' OR model LIKE 'models/%'`;

      // Ensure default settings
      await db`INSERT INTO settings (key, value) VALUES ('admin_pin', '"135790"') ON CONFLICT DO NOTHING`;

      console.log("Database schema initialized successfully.");
    } catch (error: any) {
      if (error.message.includes('password authentication failed')) {
        console.error("CRITICAL: Database password authentication failed. Please check your DATABASE_URL in the Settings menu. Hint: Ensure special characters in the password are URL-encoded. You can use the 'Connection Helper' in the app settings to generate a correctly encoded URL.");
      } else {
        console.error("Error initializing database schema:", error);
      }
    }
  });
}

startServer();
