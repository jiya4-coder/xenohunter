export interface StudentProfile {
  name: string;
  classLevel: string;
  primaryExam: string;
  secondaryExams: string[];
  language: string;
  dailyHours: number;
  persona: string;
  onboarded: boolean;
}

export interface StudyStats {
  studyTimeMinutes: number;
  questionsSolved: number;
  correctAnswers: number;
  testAccuracy: number;
  dayStreak: number;
  starsEarned: number;
  badgesCount: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: string;
  learningAids?: string[];
  sources?: GroundingSource[];
  searchQueries?: string[];
  grounded?: boolean;
}

export interface MockQuestion {
  id: number;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface MockTestResult {
  topic: string;
  difficulty: string;
  negativeMarking: boolean;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  maxScore: number;
  accuracy: number;
  date: string;
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  tip?: string;
  category?: string;
  mastered?: boolean;
}

export interface PlannerTask {
  id: string;
  day: string;
  subject: string;
  task: string;
  duration: string;
  completed: boolean;
}

export type NoteType =
  | 'executive_master'
  | 'cornell'
  | 'summary'
  | 'mindmap'
  | 'formula_definitions'
  | 'qa_revision'
  | 'detailed_chapter';

export interface CornellSection {
  cues: string[];
  notes: string[];
  summary: string;
}

export interface FormulaTableRow {
  concept: string;
  formula: string;
  unit: string;
  takeaway: string;
}

export interface ConceptSection {
  number: number;
  title: string;
  points: {
    term: string;
    definition: string;
    subPoints?: string[];
  }[];
}

export interface StudyNote {
  id: string;
  title: string;
  topic: string;
  noteType: NoteType;
  subject: string;
  classLevel: string;
  executiveSummary?: string;
  conceptSections?: ConceptSection[];
  formulaTable?: {
    columns: string[];
    rows: FormulaTableRow[];
  };
  content: string;
  cornellData?: CornellSection;
  keyTakeaways: string[];
  examTips: string[];
  createdAt: string;
  tags?: string[];
}

export interface MistakeRecord {
  id: string;
  testTopic: string;
  subject: string;
  classLevel: string;
  question: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  userAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  date: string;
  timestamp: number;
  mastered: boolean;
  retryAttempts?: number;
}

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  responsePreview?: string;
  fullResponse?: string;
  timestamp: string;
  date: string;
  epoch: number;
  mode: string;
  subject?: string;
  classLevel?: string;
  starred?: boolean;
  sources?: GroundingSource[];
  searchQueries?: string[];
}

export type BadgeCategory = 'mock_tests' | 'study_streak' | 'mastery' | 'milestones';

export interface AchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  category: BadgeCategory;
  criteria: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  unlocked: boolean;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  qualifyingDetails?: string[];
}

export interface DailyStudyLog {
  date: string; // YYYY-MM-DD
  dayLabel: string; // 'Mon', 'Tue', etc.
  minutes: number;
  targetMet: boolean; // minutes >= 60
}
