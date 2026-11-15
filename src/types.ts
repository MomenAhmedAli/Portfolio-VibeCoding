export interface Project {
  id: string;
  title: string;
  category: string;
  years: string;
  tagline: string;
  description: string;
  badge?: string;
  tags: string[];
  role: string;
  deliverables: string[];
  metrics: string[];
  colorTheme: string;
  accentBg: string;
  previewType: 'arabic-edtech' | 'desert-app' | 'game-hud';
}

export interface HorizontalCard {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  tech: string[];
  metric: string;
  color: string;
}
