export const saveApiKey = async (userId: string, serviceName: string, apiKey: string) => {
  const response = await fetch('/api/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, serviceName, apiKey })
  });
  if (!response.ok) throw new Error('Failed to save API key');
};

export const getAllApiKeys = async (userId: string) => {
  const response = await fetch(`/api/api-keys?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch API keys');
  return response.json();
};
