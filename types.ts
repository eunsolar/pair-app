
export interface Milestone {
  label: string;
  date: Date;
  daysRemaining: number;
  isPassed: boolean;
}

export interface Todo {
  id: string;
  text: string;
  date: string;
  time: string;
  completed: boolean;
  completedAt?: string;
  assignedCharId?: string;
}

export interface DailyFortune {
  lastDrawDate: string | null;
  characterId: string;
  characterName: string;
  message: string;
  resultLevel?: string; // 대길, 중길, 소길, 길, 말, 흉, 소흉, 중흉, 대흉
}

export interface Character {
  id: string;
  name: string;
  imageUrl: string;
  personality: string;
  detailedSetting: string;
  reports: string[];
  sampleDialogue: string; // 존댓말/반말 체크 대신 예시 대사 작성 칸으로 변경
}

export interface Report {
  id: string;
  charId: string;
  charName: string;
  content: string;
  timestamp: string;
}

export interface Pair {
  id: string;
  name: string;
  anniversaryDate: string;
  imageUrl: string;
  description: string;
  createdAt: string;
  todos: Todo[];
  char1Id: string;
  char2Id: string;
}

export type ViewState = 'home' | 'calendar' | 'detail' | 'add' | 'edit' | 'fortune' | 'characters' | 'reports' | 'fortune_settings' | 'edit_character';
