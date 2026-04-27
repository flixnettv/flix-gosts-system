# Flix Gosts Remote Bridge Client

To allow **OpenClaw** to control your local machine, you need to run this lightweight script on your computer. It will poll the server for commands, execute them, and send the results back.

## Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.

## Setup Instructions

1. Create a new folder on your computer.
2. Create a file named `bridge.js` and paste the following code:

```javascript
const { exec } = require('child_process');

// CONFIGURATION
const SERVER_URL = 'https://ais-dev-2wgkohkyyldahdvn7wu4z7-176663467173.europe-west1.run.app'; // Your App URL
const POLL_INTERVAL = 2000; // 2 seconds

console.log('--- Flix Gosts Remote Bridge Client ---');
console.log('Connected to:', SERVER_URL);
console.log('Waiting for commands...');

async function poll() {
  try {
    const res = await fetch(`${SERVER_URL}/api/bridge/poll`);
    if (res.status === 200) {
      const { id, command } = await res.json();
      console.log(`\n[${new Date().toLocaleTimeString()}] Executing: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        const result = {
          id,
          stdout: stdout || "",
          stderr: stderr || "",
          error: error ? error.message : null
        };
        
        // Send result back
        fetch(`${SERVER_URL}/api/bridge/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        }).then(() => {
          console.log(`Result sent for command ${id}`);
        });
      });
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
  setTimeout(poll, POLL_INTERVAL);
}

poll();
```

3. Open a terminal/command prompt in that folder.
4. Run the script:
   ```bash
   node bridge.js
   ```

## Security Note
- This script allows the AI to execute shell commands on your machine.
- **OpenClaw** is instructed to work under the **Supervisor Agent's** oversight.
- You can stop the script at any time by pressing `Ctrl+C`.
