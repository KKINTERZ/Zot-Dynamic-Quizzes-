
export enum Subject {
  Mathematics = 'Mathematics',
  English = 'English Language',
  Biology = 'Biology',
  Civics = 'Civic Education',
  Physics = 'Physics',
  Chemistry = 'Chemistry',
  History = 'History',
  Geography = 'Geography',
  ReligiousEducation = 'Religious Education',
  Commerce = 'Commerce',
  Accounts = 'Principles of Accounts',
  ComputerStudies = 'Computer Studies',
  AgriculturalScience = 'Agricultural Science',
  Literature = 'Literature in English',
  AdditionalMathematics = 'Additional Mathematics',
  IntegratedScience = 'Integrated Science',
  SocialStudies = 'Social Studies',
  
  // New Subjects
  CTS = 'Creative & Technology Studies',
  HomeEconomics = 'Home Economics',
  BusinessStudies = 'Business Studies',
  DesignAndTechnology = 'Design & Technology',
  ArtAndDesign = 'Art & Design',
  ZambianLanguages = 'Zambian Languages',
  French = 'French',
  Chinese = 'Chinese',
  FoodAndNutrition = 'Food & Nutrition',
  Music = 'Music',
  MusicalArtsEducation = 'Musical Arts Education',
  PhysicalEducation = 'Physical Education',
  
  // Primary Special Papers
  SpecialPaper1 = 'Special Paper 1',
  SpecialPaper2 = 'Special Paper 2'
}

export enum EducationLevel {
  Primary = 'Primary',
  JuniorSecondary = 'Junior Secondary',
  SeniorSecondary = 'Senior Secondary'
}

export type Difficulty = 'Simple' | 'Medium' | 'Difficulty' | 'Mixed' | 'Auto';

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  imagePrompt?: string;
  imageUrl?: string;
}

export interface QuizResult {
  score: number;
  total: number;
  answers: { questionId: number; selectedIndex: number }[];
}

export type AppState = 'AUTH' | 'SELECTION' | 'TOPIC_SELECTION' | 'CONFIG' | 'LOADING' | 'QUIZ' | 'RESULTS' | 'ERROR' | 'LIVE_TUTOR' | 'ABOUT' | 'HELP' | 'HISTORY' | 'CONTACT' | 'LEADERBOARD' | 'TEACHER_PREVIEW' | 'PROFILE';

export interface QuizConfig {
  subject: Subject;
  level: EducationLevel;
  difficulty: Difficulty;
  customContext?: string; // For pasting text from past papers
}

export interface QuizHistoryItem {
  id: string;
  timestamp: number;
  subject: Subject;
  topic: string;
  level: EducationLevel;
  difficulty: Difficulty;
  score?: number; // Optional for Teacher History (Generation only)
  totalQuestions: number;
  questions: Question[];
  answers?: { questionId: number; selectedIndex: number }[]; // Optional for Teacher History
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface UserProfile {
  uid?: string;
  name: string;
  email?: string;
  isGuest: boolean;
  role?: 'student' | 'teacher';
}
