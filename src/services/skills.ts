import { storageService } from './storage';

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description: string;
}

export class SkillService {
  async getSkills(uid: string): Promise<Skill[]> {
    const { data, error } = await storageService.query<Skill>('skills', {
      eq: ['user_id', uid]
    });
    if (error) {
      console.error("Error fetching skills:", error);
      return [];
    }
    return data || [];
  }

  async addSkill(uid: string, name: string, description: string) {
    const newSkill = {
      id: `${Date.now()}`,
      user_id: uid,
      name,
      description
    };
    const { data, error } = await storageService.insert('skills', [newSkill]);
    if (error) {
      console.error("Error adding skill:", error);
      return null;
    }
    return newSkill;
  }

  async deleteSkill(id: string) {
    const { error } = await storageService.delete('skills', {
      eq: ['id', id]
    });
    if (error) {
      console.error("Error deleting skill:", error);
    }
  }
}

export const skillService = new SkillService();
