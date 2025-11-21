
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
  FoodAndNutrition = 'Food & Nutrition',
  
  // Primary Special Papers
  SpecialPaper1 = 'Special Paper 1',
  SpecialPaper2 = 'Special Paper 2'
}

export enum EducationLevel {
  Primary = 'Primary',
  JuniorSecondary = 'Junior Secondary',
  SeniorSecondary = 'Senior Secondary'
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizResult {
  score: number;
  total: number;
  answers: { questionId: number; selectedIndex: number }[];
}

export type AppState = 'SELECTION' | 'TOPIC_SELECTION' | 'LOADING' | 'QUIZ' | 'RESULTS' | 'ERROR' | 'LIVE_TUTOR';

export interface QuizConfig {
  subject: Subject;
  level: EducationLevel;
  customContext?: string; // For pasting text from past papers
}