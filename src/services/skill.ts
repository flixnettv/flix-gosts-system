import { storageService } from './storage';
import { userService } from './user';

export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  installed_at: string;
  updated_at: string;
  config?: any;
}

export class SkillService {
  private skills: Skill[] = [];

  async init() {
    await this.loadSkills();
  }

  async loadSkills() {
    const { data, error } = await storageService.query<Skill>('skills', {});
    if (!error && data) {
      this.skills = data;
    }
  }

  async installSkill(slug: string): Promise<{ success: boolean; message: string }> {
    if (!userService.isAdmin()) {
      return { success: false, message: "Admin privileges required to install skills." };
    }

    // Mocking ClawHub download
    console.log(`[SkillService] Downloading skill: ${slug} from ClawHub...`);
    
    const newSkill: Skill = {
      id: crypto.randomUUID(),
      slug,
      name: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      description: `Advanced capability module for ${slug}.`,
      version: '1.0.0',
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await storageService.insert('skills', [newSkill]);
    if (error) {
      return { success: false, message: `Installation failed: ${error}` };
    }

    await this.loadSkills();
    return { success: true, message: `Skill '${newSkill.name}' installed successfully to /skills/${slug}` };
  }

  async updateAllSkills(): Promise<{ success: boolean; message: string }> {
    if (!userService.isAdmin()) {
      return { success: false, message: "Admin privileges required to update skills." };
    }

    console.log(`[SkillService] Updating all skills...`);
    
    for (const skill of this.skills) {
      await storageService.upsert('skills', {
        ...skill,
        version: '1.1.0', // Mock update
        updated_at: new Date().toISOString()
      }, { on: 'id' });
    }

    await this.loadSkills();
    return { success: true, message: `All ${this.skills.length} skills updated to latest versions.` };
  }

  async syncAll(): Promise<{ success: boolean; message: string }> {
    if (!userService.isAdmin()) {
      return { success: false, message: "Admin privileges required to sync skills." };
    }

    console.log(`[SkillService] Syncing skills with ClawHub...`);
    // Simulate scan + publish
    return { success: true, message: "ClawHub sync complete. All local updates published." };
  }

  getSkills() {
    return this.skills;
  }
}

export const skillService = new SkillService();
