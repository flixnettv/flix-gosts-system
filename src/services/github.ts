
export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  private: boolean;
}

export class GitHubService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new Error("GitHub Personal Access Token (PAT) is required. Please provide it in the Settings menu.");
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`GitHub API Error: ${response.statusText} ${JSON.stringify(err)}`);
    }

    if (response.status === 204) return null as any;
    return await response.json() as T;
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return await this.request<GitHubRepo>(`/repos/${owner}/${repo}`);
  }

  async createRepo(name: string, description: string, isPrivate: boolean): Promise<GitHubRepo> {
    return await this.request<GitHubRepo>('/user/repos', {
      method: 'POST',
      body: JSON.stringify({ name, description, private: isPrivate }),
    });
  }

  async updateRepo(owner: string, repo: string, updates: Partial<{ name: string; description: string; private: boolean }>): Promise<GitHubRepo> {
    return await this.request<GitHubRepo>(`/repos/${owner}/${repo}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteRepo(owner: string, repo: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}`, {
      method: 'DELETE',
    });
  }

  async listRepos(): Promise<GitHubRepo[]> {
    return await this.request<GitHubRepo[]>('/user/repos?sort=updated');
  }
}

export const githubService = new GitHubService();
