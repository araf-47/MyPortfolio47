export interface Skill {
  name: string;
  icon: string;
  level: string; // e.g., 'Advanced', 'Proficient', 'Core'
  color: string; // accent color hex/rgb
}

export interface SkillCategory {
  title: string;
  category: 'Frontend' | 'Backend' | 'Databases' | 'Mobile';
  icon: string;
  accentGradient: string;
  skills: Skill[];
}

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  fullDescription: string;
  image: string;
  tags: string[];
  gradient: string;
  featured: boolean;
  demoUrl?: string;
  githubUrl?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
  label: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}
