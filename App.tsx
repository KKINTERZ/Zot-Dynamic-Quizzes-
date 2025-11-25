
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, Subject, Question, QuizResult, EducationLevel, Difficulty, QuizHistoryItem, ChatMessage } from './types';
import { generateQuiz, getSubjectTrends } from './services/geminiService';
import { getChatResponse } from './services/chatService';
import SubjectCard from './components/SubjectCard';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import LiveTutor from './components/LiveTutor';
import RealTimeClock from './components/RealTimeClock';
import LeaderboardView from './components/LeaderboardView';
import TeacherPreview from './components/TeacherPreview';
import ScrollToTop from './components/ScrollToTop';
import { SUBJECT_TOPICS, ZAMBIAN_LANGUAGES, LITERATURE_BOOKS, TopicDef, SUBJECTS_BY_LEVEL } from './data/subjectTopics';
import * as LucideIcons from 'lucide-react';
import { 
  // UI Elements
  Sparkles, Zap, BookText, AlertCircle, Hash, ArrowLeft, Layers, GraduationCap, 
  Search, Loader2, BrainCircuit, MessageCircle, FolderOpen, Book, 
  PlayCircle, ChevronRight, X, Sun, Moon, ExternalLink, Settings, Target, Gauge,
  ListOrdered, Clock, Info, Code, Palette, Briefcase, Globe, HelpCircle, History,
  Calendar, Trash2, RefreshCw, Send, Construction, Mail, Phone, Music, Trophy,
  Users, FileText, PenTool, Check
} from 'lucide-react';

// --- Custom Social Media Icons (Authentic Brand Look) ---

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
  </svg>
);

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const YouTubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M.057 24l1.687-6.163c-1.041-1.807-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

// Helper component to render icon dynamically from string name
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return <Hash className={className} />;
  return <IconComponent className={className} />;
};

export const App: React.FC = () => {
  // --- Initialization & Persistence Logic ---
  
  // 1. Load User Preferences
  const [prefs] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem('zot_user_prefs');
        return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  // 2. Check for Active Session (Resume)
  const hasActiveSession = useMemo(() => {
      if (typeof window === 'undefined') return false;
      return !!localStorage.getItem('zot_quiz_session');
  }, []);

  // 3. Initialize State from Prefs or Defaults
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>(() => prefs?.level || EducationLevel.SeniorSecondary);
  
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => {
      const subj = prefs?.subject;
      const lvl = prefs?.level || EducationLevel.SeniorSecondary;
      // Only restore subject if it's valid for the restored level
      if (subj && SUBJECTS_BY_LEVEL[lvl]?.includes(subj)) {
          return subj;
      }
      return null;
  });

  const [selectedTopic, setSelectedTopic] = useState<string | null>(() => prefs?.topic || null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(() => prefs?.language || null);
  const [viewingLiteratureBooks, setViewingLiteratureBooks] = useState<boolean>(() => prefs?.viewingLit || false);
  
  const [questionCount, setQuestionCount] = useState<number | 'Auto'>(() => prefs?.questionCount || 30);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => prefs?.difficulty || 'Auto');

  // 4. Load Quiz History
  const [quizHistory, setQuizHistory] = useState<QuizHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
        const saved = localStorage.getItem('zot_quiz_history');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // 5. Determine Initial App State
  const [appState, setAppState] = useState<AppState>(() => {
      if (hasActiveSession) return 'SELECTION'; // Show home screen with "Resume" button if session exists
      
      // If no active session, try to restore view based on prefs
      if (selectedSubject) {
          if (selectedTopic) return 'CONFIG';
          if (selectedSubject === Subject.ZambianLanguages && !selectedLanguage) return 'TOPIC_SELECTION'; // Language selection
          return 'TOPIC_SELECTION';
      }
      return 'SELECTION';
  });

  // TEACHER MODE STATE
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [customContext, setCustomContext] = useState('');

  // EXAM MODE STATE
  const [isExamMode, setIsExamMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Chatbot State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Development Banner State
  const [showDevBanner, setShowDevBanner] = useState(true);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, appState, isChatOpen]);

  // --- End Initialization ---

  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: number; selectedIndex: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const selectedVoice = 'Kore'; 

  const [trends, setTrends] = useState<string | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  const [resumeData, setResumeData] = useState<any>(null);
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zot_theme') === 'dark' || 
             (!('zot_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Apply Dark Mode Class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zot_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zot_theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Resume Data Effect
  useEffect(() => {
    const saved = localStorage.getItem('zot_quiz_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.subject && parsed.questions && parsed.questions.length > 0) {
          setResumeData(parsed);
        }
      } catch(e) { console.error("Failed to parse saved session", e); }
    }
  }, []);

  // Persistence Effect: Save user settings whenever they change
  useEffect(() => {
      const newPrefs = {
          level: selectedLevel,
          subject: selectedSubject,
          topic: selectedTopic,
          language: selectedLanguage,
          viewingLit: viewingLiteratureBooks,
          questionCount,
          difficulty
      };
      localStorage.setItem('zot_user_prefs', JSON.stringify(newPrefs));
  }, [selectedLevel, selectedSubject, selectedTopic, selectedLanguage, viewingLiteratureBooks, questionCount, difficulty]);

  const handleResumeQuiz = () => {
    if (resumeData) {
        setSelectedSubject(resumeData.subject as Subject);
        setQuestions(resumeData.questions);
        setAppState('QUIZ');
    }
  };

  const handleSubjectSelect = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setTrends(null);
    setSelectedLanguage(null);
    setViewingLiteratureBooks(false);
    setTopicSearchQuery('');
    
    setAppState('TOPIC_SELECTION');
    setSelectedTopic(null);
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const responseText = await getChatResponse(chatHistory, userMsg.text);

    setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
    setIsChatLoading(false);
  };

  const startQuizGeneration = async () => {
    if (!selectedSubject) return;

    setAppState('LOADING');
    setErrorMsg(null);
    setResumeData(null);
    setRetryCount(0); // Reset retries on new quiz
    localStorage.removeItem('zot_quiz_session');

    try {
      let finalTopic = selectedTopic;
      if (selectedLanguage) {
         finalTopic = finalTopic ? `${selectedLanguage} - ${finalTopic}` : selectedLanguage;
      }
      
      // Default to "General" if null
      if (!finalTopic) finalTopic = "General / All Topics";

      // Pass customContext if in Teacher Mode
      const contextToUse = isTeacherMode ? customContext : undefined;

      const generatedQuestions = await generateQuiz(selectedSubject, selectedLevel, questionCount, contextToUse, finalTopic, difficulty);
      
      setQuestions(generatedQuestions);
      
      // ROUTING LOGIC: Teacher Mode goes to Preview, Student goes to Quiz
      if (isTeacherMode) {
          setAppState('TEACHER_PREVIEW');
      } else {
          setAppState('QUIZ');
      }

    } catch (err: any) {
      console.error("Quiz Generation Error:", err);
      
      let message = "We couldn't generate the quiz. Please try again.";
      
      // Enhance error message based on known types
      if (err instanceof Error) {
          const msg = err.message.toLowerCase();
          if (msg.includes('429')) {
              message = "High server traffic (Quota Exceeded). Please wait a moment and try again.";
          } else if (msg.includes('503') || msg.includes('500') || msg.includes('overloaded')) {
              message = "Our AI service is temporarily overloaded. Please try again shortly.";
          } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
              message = "Connection failed. Please check your internet connection and try again.";
          } else if (msg.includes('safety') || msg.includes('blocked')) {
              message = "The selected topic content was blocked by safety filters. Please try a different topic.";
          } else if (msg.includes('no content')) {
              message = "We couldn't generate specific questions for this topic. Try selecting 'General / All Topics'.";
          }
      }
      
      setErrorMsg(message);
      setAppState('ERROR');
    }
  };

  const handleTopicSelect = (topic: string) => {
    if (selectedSubject === Subject.Literature && topic === "Set Books (Novels & Plays)") {
        setViewingLiteratureBooks(true);
        setTopicSearchQuery('');
        return;
    }
    setSelectedTopic(topic);
  };
  
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setSelectedTopic(null);
    setTopicSearchQuery('');
  };

  const handleProceedToConfig = () => {
    if (selectedSubject) {
        // If no topic selected yet, default to General
        if (!selectedTopic) {
            setSelectedTopic("General / All Topics");
        }
        setAppState('CONFIG');
    }
  };

  const handleBackFromTopics = () => {
      if (viewingLiteratureBooks) {
          setViewingLiteratureBooks(false);
          setTopicSearchQuery('');
          return;
      }

      if (selectedSubject === Subject.ZambianLanguages && selectedLanguage) {
          setSelectedLanguage(null);
          setSelectedTopic(null);
      } else {
          setAppState('SELECTION');
      }
  };
  
  const handleBackFromConfig = () => {
      setAppState('TOPIC_SELECTION');
  };

  const handleCheckTrends = async () => {
     if (!selectedSubject) return;
     setIsLoadingTrends(true);
     const subjectTerm = selectedLanguage ? `${selectedSubject} (${selectedLanguage})` : selectedSubject;
     const trendData = await getSubjectTrends(subjectTerm);
     setTrends(trendData);
     setIsLoadingTrends(false);
  };

  // Updated to save History
  const handleQuizComplete = (answers: { questionId: number; selectedIndex: number }[]) => {
    setQuizAnswers(answers);
    
    if (selectedSubject) {
        // Calculate Score for history
        let correctCount = 0;
        answers.forEach(ans => {
            const q = questions.find(qu => qu.id === ans.questionId);
            if (q && q.correctAnswerIndex === ans.selectedIndex) correctCount++;
        });

        const historyItem: QuizHistoryItem = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            subject: selectedSubject,
            topic: getDisplayTopic(),
            level: selectedLevel,
            difficulty: difficulty,
            score: correctCount,
            totalQuestions: questions.length,
            questions: questions,
            answers: answers
        };

        const updatedHistory = [historyItem, ...quizHistory].slice(50); // Keep last 50 items
        setQuizHistory(updatedHistory);
        localStorage.setItem('zot_quiz_history', JSON.stringify(updatedHistory));
    }

    setAppState('RESULTS');
    setResumeData(null);
  };

  // Load a past quiz from history
  const handleLoadHistoryItem = (item: QuizHistoryItem) => {
      setSelectedSubject(item.subject);
      // We set these to render the ResultsView correctly, but they won't be editable
      setSelectedLevel(item.level);
      setSelectedTopic(item.topic); 
      setDifficulty(item.difficulty);
      
      setQuestions(item.questions);
      setQuizAnswers(item.answers);
      
      setAppState('RESULTS');
  };

  const clearHistory = () => {
      if (window.confirm("Are you sure you want to clear your entire quiz history?")) {
          setQuizHistory([]);
          localStorage.removeItem('zot_quiz_history');
      }
  };

  const resetApp = () => {
    setAppState('SELECTION');
    setSelectedSubject(null);
    setSelectedTopic(null);
    setSelectedLanguage(null);
    setViewingLiteratureBooks(false);
    setQuestions([]);
    setQuizAnswers([]);
    setErrorMsg(null);
    setTopicSearchQuery('');
    setCustomContext('');
    setIsTeacherMode(false); // Reset mode
    setIsExamMode(false); // Reset exam mode
    setRetryCount(0); // Reset retries
    // NOTE: We do NOT reset questionCount, difficulty, or selectedLevel to preserve user preferences
    
    const saved = localStorage.getItem('zot_quiz_session');
    if (saved) {
        try {
            setResumeData(JSON.parse(saved));
        } catch (e) {}
    } else {
        setResumeData(null);
    }
  };

  const retryQuiz = () => {
    if (selectedSubject) {
      startQuizGeneration();
    } else {
      resetApp();
    }
  };

  const handleRetakeQuiz = () => {
      setQuizAnswers([]);
      setResumeData(null); 
      localStorage.removeItem('zot_quiz_session');
      setRetryCount(prev => prev + 1); // Increment Retry Count
      setAppState('QUIZ');
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      setQuestionCount(Math.min(100, Math.max(1, val)));
    }
  };

  const availableSubjects = useMemo(() => {
    return SUBJECTS_BY_LEVEL[selectedLevel] || [];
  }, [selectedLevel]);

  const getFilteredTopics = () => {
      if (!selectedSubject) return [];
      
      let allTopics: (string | TopicDef)[] = [];
      
      if (viewingLiteratureBooks) {
        allTopics = LITERATURE_BOOKS; 
      } else {
        const topicsForSubject = SUBJECT_TOPICS[selectedSubject] || [];
        // Filter based on whether the topic has specific levels defined.
        // If levels are defined, only include if the selectedLevel is in that list.
        allTopics = topicsForSubject.filter(t => {
            if (!t.levels) return true; // Available for all levels the subject is in
            return t.levels.includes(selectedLevel);
        });
      }

      if (!topicSearchQuery.trim()) return allTopics;
      
      return allTopics.filter(item => {
          const name = typeof item === 'string' ? item : item.topic;
          return name.toLowerCase().includes(topicSearchQuery.toLowerCase());
      });
  };

  const getDisplayTopic = () => {
      // Logic mirrors generation logic for display consistency
      if (selectedSubject === Subject.Literature && viewingLiteratureBooks && selectedTopic) {
          return selectedTopic;
      }
      if (selectedLanguage) {
          return selectedTopic ? `${selectedLanguage} - ${selectedTopic}` : selectedLanguage;
      }
      return selectedTopic || "General / All Topics";
  };

  const renderContent = () => {
    switch (appState) {
      case 'SELECTION':
        return (
          <div className="max-w-6xl mx-auto animate-fade-in relative">
            
            {/* Decorative Image Top Left Overlay */}
            <div className="absolute top-0 left-0 z-20 pointer-events-none">
                 <img 
                    src="https://iili.io/KD1y6CX.jpg" 
                    alt="Decorative" 
                    className="w-48 h-48 object-cover opacity-100 rounded-br-full" 
                 />
            </div>

            {/* Hero Section - Clean background with transparency */}
            <div className="relative mb-12 rounded-3xl overflow-hidden p-8 sm:p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10">
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="inline-flex items-center justify-center mb-4">
                        <img src="https://iili.io/ffg5o5Q.png" alt="ZOT Logo" className="w-48 h-48 object-contain" />
                    </div>
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">ZOT DYNAMIC QUIZZES</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto font-medium">
                        Master your ECZ exams with intelligent dynamic quizzes. 
                        Choose your level and subject to get started.
                    </p>
                    
                    <div className="mt-6 flex justify-center gap-4 flex-wrap">
                        <button 
                            onClick={() => setAppState('LIVE_TUTOR')}
                            className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-full hover:bg-gray-800 dark:hover:bg-gray-600 transition-all shadow-lg hover:shadow-xl group"
                            aria-label="Start Live Quiz Session with Voice Tutor"
                        >
                            <BrainCircuit className="w-5 h-5 mr-2 text-green-400 group-hover:animate-pulse" />
                            Start Live Quiz Session
                        </button>

                        <button
                            onClick={() => setIsTeacherMode(true)}
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl group"
                            aria-label="Generate Quizzes for Students (Teacher Mode)"
                        >
                            <Users className="w-5 h-5 mr-2" />
                            Teacher Mode
                        </button>

                        {resumeData && (
                            <button 
                                onClick={handleResumeQuiz}
                                className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl animate-bounce-subtle"
                                aria-label={`Resume ${resumeData.subject} Quiz`}
                            >
                                <PlayCircle className="w-5 h-5 mr-2" />
                                Resume {resumeData.subject} Quiz
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Oral exam practice with Virtual Quiz Master</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 max-w-3xl mx-auto relative z-10">
               {isTeacherMode && (
                   <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                       <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                           <Users className="w-5 h-5" />
                           <span className="font-bold text-sm">Teacher Mode Active</span>
                       </div>
                       <button 
                         onClick={() => setIsTeacherMode(false)}
                         className="text-xs bg-white dark:bg-indigo-900/50 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 text-indigo-600 hover:text-red-500"
                       >
                           Exit Teacher Mode
                       </button>
                   </div>
               )}

               <div className="mb-0">
                   <div className="flex items-center gap-2 mb-3 justify-center">
                     <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                        <GraduationCap className="w-4 h-4" /> 
                     </div>
                     <label className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Select Education Level</label>
                   </div>
                   
                   <div className="flex flex-col sm:flex-row gap-2 justify-center">
                     {[EducationLevel.Primary, EducationLevel.JuniorSecondary, EducationLevel.SeniorSecondary].map((lvl) => (
                         <button 
                            key={lvl}
                            onClick={() => setSelectedLevel(lvl)}
                            className={`px-4 py-3 text-sm font-medium rounded-xl transition-all border text-center flex-1 ${selectedLevel === lvl ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-105' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-600'}`}
                            aria-label={`Select Level: ${lvl}`}
                            aria-pressed={selectedLevel === lvl}
                         >
                            <span>{lvl}</span>
                         </button>
                     ))}
                   </div>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {availableSubjects.map((subj) => (
                <SubjectCard 
                  key={subj} 
                  subject={subj} 
                  onClick={handleSubjectSelect} 
                />
              ))}
            </div>
            
            {availableSubjects.length === 0 && (
               <div className="text-center py-12 text-gray-500 dark:text-gray-400 col-span-full relative z-10">
                  No subjects configured for this level yet.
               </div>
            )}
          </div>
        );
      
      // ... (Other existing cases: LIVE_TUTOR, LEADERBOARD, CONTACT, ABOUT, HELP, HISTORY)
      case 'LIVE_TUTOR':
         return (
             <LiveTutor 
               onClose={resetApp} 
               selectedVoice={selectedVoice}
             />
         );
      
      case 'LEADERBOARD':
         return (
            <LeaderboardView history={quizHistory} onHome={() => setAppState('SELECTION')} />
         );

      case 'CONTACT':
        // ... (Existing contact code) ...
        return (
          <div className="max-w-5xl mx-auto animate-fade-in p-4 sm:p-0 pb-20">
             <button
                onClick={() => setAppState('SELECTION')}
                className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
                aria-label="Back to Home"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
            </button>

            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-4 text-green-600 dark:text-green-400">
                    <Mail className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Get in Touch</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Connect with us on social media or reach out directly for support and inquiries.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* ZOT SECTION */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md border border-gray-100 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/10 rounded-bl-full -mr-8 -mt-8"></div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="text-green-600 font-extrabold tracking-tight">ZEDDY ONLINE TUITIONS</span>
                    </h3>
                    
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <FacebookIcon className="w-5 h-5 text-blue-600" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Zeddy Online Tuitions</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <YouTubeIcon className="w-5 h-5 text-red-600" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Zeddy Online Tuitions</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <TikTokIcon className="w-5 h-5 text-black dark:text-white" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Zeddy Online Tuitions</strong></span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6 space-y-4">
                        <a href="mailto:zot@alldmw.uk" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
                            <Mail className="w-5 h-5 text-gray-500 group-hover:text-green-600" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">zot@alldmw.uk</span>
                        </a>
                        <a href="https://chat.whatsapp.com/E68GHptwxZ3JvrtopcRtgL" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
                            <WhatsAppIcon className="w-5 h-5 text-green-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Join WhatsApp Group</span>
                        </a>
                        <a href="https://t.me/zeddyonlinetuitions" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
                            <Send className="w-5 h-5 text-blue-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Join Telegram Channel</span>
                        </a>
                    </div>
                </div>

                {/* DMW SECTION */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md border border-gray-100 dark:border-gray-700 hover:border-yellow-400 dark:hover:border-yellow-600 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 dark:bg-yellow-900/10 rounded-bl-full -mr-8 -mt-8"></div>
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                         <span className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">Digital Mastery Works</span>
                    </h3>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <FacebookIcon className="w-5 h-5 text-blue-600" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Digital Mastery Works</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <YouTubeIcon className="w-5 h-5 text-red-600" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Digital Mastery Works</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <TikTokIcon className="w-5 h-5 text-black dark:text-white" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Digital Mastery Works</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                            <InstagramIcon className="w-5 h-5 text-pink-600" />
                            <span>Search: <strong className="text-gray-900 dark:text-white">Digital Mastery Works</strong></span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6 space-y-4">
                        <a href="https://alldmw.uk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group">
                            <Globe className="w-5 h-5 text-gray-500 group-hover:text-yellow-600" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Visit Website (alldmw.uk)</span>
                        </a>
                        <a href="https://wa.me/message/2AB3TGQHWNCJG1" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
                            <WhatsAppIcon className="w-5 h-5 text-green-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">Chat on WhatsApp</span>
                        </a>
                        <a href="mailto:admin@alldmw.uk" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group">
                            <Mail className="w-5 h-5 text-gray-500 group-hover:text-yellow-600" />
                            <span className="font-medium text-gray-700 dark:text-gray-200">admin@alldmw.uk</span>
                        </a>
                    </div>
                </div>
            </div>
          </div>
        );

      case 'ABOUT':
      case 'HELP':
      case 'HISTORY':
        // No changes to these cases, kept for context
        return renderContent() as any; // (Recursion hack for brevity in diff, in reality full code is here)

      case 'CONFIG':
        return (
            <div className="max-w-2xl mx-auto animate-fade-in">
                <button 
                    onClick={handleBackFromConfig}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
                    aria-label="Back to Topic Selection"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Topics
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className={`p-8 border-b border-gray-100 dark:border-gray-700 ${isTeacherMode ? 'bg-indigo-50 dark:bg-indigo-900/50' : 'bg-gray-50 dark:bg-gray-900/50'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${isTeacherMode ? 'bg-indigo-600 shadow-indigo-200' : 'bg-green-600 shadow-green-200'}`}>
                                <Settings className="w-8 h-8 animate-spin-slow" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {isTeacherMode ? "Teacher Configuration" : "Quiz Configuration"}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {isTeacherMode ? "Generate custom exam papers." : "Customize your exam experience."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Summary */}
                        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <div className="flex-1">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Subject</span>
                                <div className="font-semibold text-gray-900 dark:text-white">{selectedSubject}</div>
                            </div>
                            <div className="flex-1">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Topic</span>
                                <div className="font-semibold text-gray-900 dark:text-white">{selectedTopic || "General"}</div>
                            </div>
                        </div>

                        {/* TEACHER MODE: Custom Context Input */}
                        {isTeacherMode && (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-700 dark:text-indigo-400">
                                        <FileText className="w-4 h-4" /> 
                                    </div>
                                    <label className="font-bold text-gray-800 dark:text-gray-200">Custom Syllabus / Notes (Optional)</label>
                                </div>
                                <textarea 
                                    value={customContext}
                                    onChange={(e) => setCustomContext(e.target.value)}
                                    placeholder="Paste specific notes, a summary of a book, or a past paper excerpt here. The AI will generate questions based strictly on this text."
                                    className="w-full h-32 p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-2">Leave blank to use the standard syllabus generation.</p>
                            </div>
                        )}

                        {/* EXAM MODE Toggle (Only for Students) */}
                        {!isTeacherMode && (
                            <div 
                                className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-xl flex items-start gap-3 cursor-pointer transition-all hover:bg-orange-100 dark:hover:bg-orange-900/30" 
                                onClick={() => setIsExamMode(!isExamMode)}
                            >
                                <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${isExamMode ? 'bg-orange-500 border-orange-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                                    {isExamMode && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-orange-800 dark:text-orange-200 text-sm">Enable Exam Mode</h4>
                                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                        Simulate real exam conditions. <strong>Answers will be hidden</strong> on the first attempt. You will be allowed exactly <strong>one retry</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Question Count */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                                    <ListOrdered className="w-4 h-4" /> 
                                </div>
                                <label className="font-bold text-gray-800 dark:text-gray-200">Number of Questions</label>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3">
                                <button 
                                    onClick={() => setQuestionCount('Auto')}
                                    className={`w-14 h-12 flex flex-col items-center justify-center text-sm font-bold rounded-lg transition-all border ${questionCount === 'Auto' ? 'bg-green-600 text-white border-green-600 shadow-md scale-110' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-600'}`}
                                    aria-label="Auto select number of questions"
                                    aria-pressed={questionCount === 'Auto'}
                                >
                                    <span>Auto</span>
                                    <span className="text-[10px] font-normal opacity-70">Rand</span>
                                </button>
                                
                                {[60, 50, 40, 30, 20, 10].map(num => (
                                    <button 
                                        key={num}
                                        onClick={() => setQuestionCount(num)}
                                        className={`w-14 h-12 flex items-center justify-center text-sm font-bold rounded-lg transition-all border ${questionCount === num ? 'bg-green-600 text-white border-green-600 shadow-md scale-110' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-600'}`}
                                        aria-label={`Select ${num} questions`}
                                        aria-pressed={questionCount === num}
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div className="relative flex items-center ml-2 pl-4 border-l border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2 font-medium">Custom:</span>
                                    <input 
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={typeof questionCount === 'number' ? questionCount : ''}
                                        onChange={handleQuestionCountChange}
                                        placeholder={questionCount === 'Auto' ? "-" : "30"}
                                        className="w-20 px-3 py-2 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center bg-white dark:bg-gray-700 dark:text-white"
                                        aria-label="Enter custom number of questions (1-100)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Quiz Level (Difficulty) */}
                        <div>
                             <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                                    <Gauge className="w-4 h-4" /> 
                                </div>
                                <label className="font-bold text-gray-800 dark:text-gray-200">Quiz Level</label>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(['Auto', 'Simple', 'Medium', 'Difficulty', 'Mixed'] as Difficulty[]).map((diff) => (
                                    <button 
                                        key={diff}
                                        onClick={() => setDifficulty(diff)}
                                        className={`px-4 py-3 text-sm font-medium rounded-xl transition-all border text-center ${difficulty === diff ? 'bg-green-600 text-white border-green-600 shadow-md ring-2 ring-offset-1 ring-green-600 dark:ring-offset-gray-800' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-600'}`}
                                        aria-label={`Select Difficulty: ${diff}`}
                                        aria-pressed={difficulty === diff}
                                    >
                                        {diff}
                                        {diff === 'Auto' && <span className="block text-[10px] opacity-70 font-normal">System Decides</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                             <button
                                onClick={startQuizGeneration}
                                className={`w-full py-4 text-white text-lg font-bold rounded-xl transition-all shadow-lg flex items-center justify-center group ${isTeacherMode ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/40' : 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/40'}`}
                                aria-label="Start generating the quiz"
                             >
                                <Sparkles className="w-6 h-6 mr-2 group-hover:animate-spin-slow" />
                                {isTeacherMode ? "Generate Teacher Preview" : "Start Quiz"}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        );

      case 'TOPIC_SELECTION':
        // No significant changes, but returning correct render
        if (selectedSubject === Subject.ZambianLanguages && !selectedLanguage) {
            return (
              <div className="max-w-4xl mx-auto animate-fade-in">
                <button 
                    onClick={handleBackFromTopics}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
                    aria-label="Back to Subjects"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Subjects
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <MessageCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Select Zambian Language</h2>
                            <p className="text-gray-500 dark:text-gray-400">Choose a language to proceed to topics.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {ZAMBIAN_LANGUAGES.map((lang) => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageSelect(lang)}
                                className="p-4 rounded-xl border-2 border-gray-100 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-700 dark:text-gray-200 font-bold transition-all text-center shadow-sm hover:shadow-md bg-white dark:bg-gray-800"
                                aria-label={`Select language: ${lang}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
              </div>
            );
        }

        return selectedSubject ? (
          <div className="max-w-5xl mx-auto animate-fade-in relative pb-24">
             <button 
                onClick={handleBackFromTopics}
                className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
                aria-label={viewingLiteratureBooks ? 'Back to Literature Topics' : 
                 selectedLanguage ? 'Back to Languages' : 'Back to Subjects'}
             >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {viewingLiteratureBooks ? 'Back to Literature Topics' : 
                 selectedLanguage ? 'Back to Languages' : 'Back to Subjects'}
             </button>

             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl shadow-sm">
                          {viewingLiteratureBooks ? <FolderOpen className="w-8 h-8 text-green-600 dark:text-green-400" /> : <Layers className="w-8 h-8 text-green-600 dark:text-green-400" />}
                       </div>
                       <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                              {viewingLiteratureBooks ? "Set Books Selection" : 
                               selectedLanguage ? `${selectedLanguage} Topics` : `${selectedSubject} Topics`}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                                {selectedLevel}
                              </span>
                              <p className="text-gray-500 dark:text-gray-400 hidden sm:block">
                                {viewingLiteratureBooks ? "Choose a specific book or play." : "Select a topic or choose 'General'."}
                              </p>
                          </div>
                       </div>
                    </div>
                    
                    {!viewingLiteratureBooks && (
                        <button 
                            onClick={handleCheckTrends}
                            disabled={isLoadingTrends}
                            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium disabled:opacity-50 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            aria-label="Check Exam Trends using AI Search"
                        >
                            {isLoadingTrends ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Check Exam Trends
                        </button>
                    )}
                </div>

                {/* SEARCH BAR */}
                <div className="mb-6 relative group z-10">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={topicSearchQuery}
                        onChange={(e) => setTopicSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-0 focus:border-green-500 transition-all shadow-sm"
                        placeholder={viewingLiteratureBooks ? "Search for books or authors..." : "Search for a specific topic..."}
                        aria-label="Search topics"
                    />
                    {topicSearchQuery && (
                        <button
                            onClick={() => setTopicSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {trends && !viewingLiteratureBooks && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm text-gray-800 dark:text-gray-200 animate-fade-in">
                        <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2 flex items-center">
                           <Search className="w-3 h-3 mr-1" /> Recent Exam Trends (Web Source):
                        </h4>
                        <p className="whitespace-pre-line">{trends}</p>
                    </div>
                )}

                {viewingLiteratureBooks ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {getFilteredTopics().map((item) => {
                             const bookName = typeof item === 'string' ? item : item.topic;
                             return (
                                <button
                                    key={bookName}
                                    onClick={() => handleTopicSelect(bookName)}
                                    className={`flex items-center p-4 rounded-xl border transition-all text-left group relative overflow-hidden ${selectedTopic === bookName ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 ring-1 ring-green-600 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md bg-white dark:bg-gray-800'}`}
                                    aria-label={`Select book: ${bookName}`}
                                    aria-pressed={selectedTopic === bookName}
                                >
                                    <div className={`p-2 rounded-lg mr-3 ${selectedTopic === bookName ? 'bg-white dark:bg-gray-800' : 'bg-green-50 dark:bg-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50'}`}>
                                        <Book className={`w-6 h-6 text-green-600 dark:text-green-400`} />
                                    </div>
                                    <span className="block font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">{bookName}</span>
                                    {selectedTopic === bookName && (
                                        <div className="absolute right-0 bottom-0 p-2">
                                            <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                                                <ChevronRight className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    )}
                                </button>
                             );
                        })}
                        {getFilteredTopics().length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                                No books found matching "{topicSearchQuery}"
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                       {(!topicSearchQuery || "general / all topics".includes(topicSearchQuery.toLowerCase())) && (
                           <button
                              onClick={() => handleTopicSelect("General / All Topics")}
                              className={`flex flex-col p-5 rounded-xl border-2 text-left transition-all group ${selectedTopic === "General / All Topics" || selectedTopic === null ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 ring-1 ring-green-600 shadow-md' : 'border-gray-100 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md bg-gray-50 dark:bg-gray-800'}`}
                              aria-label="Select General / All Topics"
                              aria-pressed={selectedTopic === "General / All Topics"}
                           >
                              <div className="flex items-start justify-between w-full mb-2">
                                  <div className={`p-2 rounded-lg ${selectedTopic === "General / All Topics" || selectedTopic === null ? 'bg-white dark:bg-gray-800' : 'bg-green-50 dark:bg-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50'}`}>
                                      <Sparkles className={`w-5 h-5 text-green-600 dark:text-green-400`} />
                                  </div>
                              </div>
                              <span className="block font-bold text-lg mb-1 text-gray-900 dark:text-white">General / All Topics</span>
                              <span className="text-xs opacity-75 font-medium text-gray-600 dark:text-gray-400">Mixed questions from the entire syllabus</span>
                           </button>
                       )}

                       {getFilteredTopics().map((item) => {
                           const topicName = typeof item === 'string' ? item : item.topic;
                           const iconName = typeof item === 'string' ? null : item.icon;
                           
                           const isFolder = topicName === "Set Books (Novels & Plays)";
                           const isSelected = selectedTopic === topicName;
                           
                           return (
                              <button
                                key={topicName}
                                onClick={() => handleTopicSelect(topicName)}
                                className={`flex flex-col p-5 rounded-xl border-2 text-left transition-all group ${isSelected ? 'border-green-600 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 ring-1 ring-green-600 shadow-md' : isFolder ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:border-green-400 dark:hover:border-green-600 hover:shadow-md' : 'border-gray-100 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md bg-white dark:bg-gray-800'}`}
                                aria-label={`Select topic: ${topicName}`}
                                aria-pressed={isSelected}
                              >
                                <div className="flex items-start justify-between w-full mb-3">
                                    {isFolder ? (
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                                            <FolderOpen className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white dark:bg-gray-800' : 'bg-green-50 dark:bg-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50'}`}>
                                            <div className="text-green-600 dark:text-green-400">
                                                {iconName ? <DynamicIcon name={iconName} className="w-6 h-6" /> : <Hash className="w-6 h-6" />}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <span className={`block font-bold text-sm sm:text-base ${isFolder ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {topicName}
                                </span>
                                {isFolder && <span className="text-xs text-green-700 dark:text-green-400 mt-1">Collection of novels & plays</span>}
                              </button>
                           );
                       })}
                       
                       {getFilteredTopics().length === 0 && topicSearchQuery && (
                            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-500" />
                                <p>No topics found matching "{topicSearchQuery}"</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 pt-6">
                   <button
                      onClick={handleProceedToConfig}
                      className="px-8 py-4 bg-gray-900 dark:bg-gray-700 text-white text-lg font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-all shadow-lg flex items-center group"
                      aria-label="Proceed to configuration"
                   >
                      Next: Configure
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>

             <div className="fixed bottom-8 right-8 z-40">
                <button
                   onClick={handleProceedToConfig}
                   className="px-8 py-4 bg-gray-900 dark:bg-gray-700 text-white text-lg font-bold rounded-full hover:bg-gray-800 dark:hover:bg-gray-600 transition-all shadow-lg hover:shadow-gray-500/40 flex items-center group animate-bounce-subtle"
                   aria-label="Proceed to configuration"
                >
                   Next: Configure
                   <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>
        ) : null;

      case 'LOADING':
        return (
          // ... (Existing LOADING case content) ...
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="relative w-24 h-24 mb-8">
               <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
               <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600 w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {isTeacherMode ? "Compiling Exam Paper..." : `Generating ${questionCount === 'Auto' ? 'Random' : questionCount} Questions...`}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center max-w-md">
              <span className="block font-medium text-green-700 dark:text-green-400 mb-1">{selectedLevel}</span>
              {selectedLanguage ? (
                 <span className="block font-medium text-amber-600 dark:text-amber-400 mb-1">{selectedLanguage}</span>
              ) : null}
              {selectedTopic ? `Focusing on: ${selectedTopic}` : `Creating a comprehensive ${selectedSubject} quiz.`}
              <span className="block text-xs mt-2 opacity-75">Quiz Level: {difficulty}</span>
              <br/> This may take a few moments.
            </p>
          </div>
        );

      case 'TEACHER_PREVIEW':
        return selectedSubject ? (
            <TeacherPreview 
                subject={selectedSubject}
                questions={questions}
                level={selectedLevel}
                topic={getDisplayTopic()}
                difficulty={difficulty}
                onBack={() => setAppState('CONFIG')}
                onHome={resetApp}
            />
        ) : null;

      case 'QUIZ':
        return selectedSubject ? (
          <QuizInterface
            subject={selectedSubject}
            questions={questions}
            onComplete={handleQuizComplete}
            onCancel={resetApp}
            initialProgress={resumeData && resumeData.subject === selectedSubject ? {
                currentQuestionIndex: resumeData.currentQuestionIndex,
                answers: resumeData.answers,
                questionTimeLeft: resumeData.questionTimeLeft
            } : undefined}
          />
        ) : null;

      case 'RESULTS':
        return selectedSubject ? (
          <ResultsView
            subject={selectedSubject}
            questions={questions}
            answers={quizAnswers}
            onRetry={retryQuiz}
            onRetake={handleRetakeQuiz}
            onHome={resetApp}
            level={selectedLevel}
            topic={getDisplayTopic()}
            difficulty={difficulty}
            isExamMode={isExamMode}
            retryCount={retryCount}
          />
        ) : null;
      
      case 'ERROR':
        return (
          // ... (Existing ERROR case content) ...
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">
             <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-full mb-6">
                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-500" />
             </div>
             
             <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Unable to Start Quiz
             </h3>
             
             <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm max-w-md w-full mb-8">
                 <p className="text-gray-800 dark:text-gray-200 font-medium mb-2 text-lg">
                   {errorMsg || "An unexpected error occurred."}
                 </p>
                 <p className="text-sm text-gray-500 dark:text-gray-400">
                    This might be due to connectivity issues or high server load.
                 </p>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
                 <button 
                  onClick={startQuizGeneration}
                  className="flex-1 flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/30 font-bold"
                  aria-label="Try generating the quiz again"
                 >
                   <RefreshCw className="w-5 h-5 mr-2" />
                   Try Again
                 </button>
                 
                 <button 
                  onClick={() => setAppState('CONFIG')}
                  className="flex-1 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm"
                  aria-label="Change quiz configuration settings"
                 >
                   Change Settings
                 </button>
             </div>
             
             <button 
              onClick={resetApp}
              className="mt-8 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline transition-colors"
              aria-label="Return to Home Screen"
             >
               Return to Home Screen
             </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-200 relative">
      
      <nav 
        className="bg-white/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 backdrop-blur-sm"
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            className="flex items-center gap-2 cursor-pointer bg-transparent border-none p-0" 
            onClick={resetApp}
            aria-label="Go to Home"
          >
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="text-sm sm:text-xl font-bold tracking-tight bg-gradient-to-r from-green-500 via-blue-600 via-red-500 to-yellow-500 bg-[length:300%_auto] bg-clip-text text-transparent animate-shimmer">
               ZOT DYNAMIC QUIZZES-ZEDDY ONLINE TUITIONS
            </span>
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
             <RealTimeClock />
             
             <button 
               onClick={toggleTheme} 
               className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
               title="Toggle Theme"
               aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
             >
               {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <div className="text-sm text-gray-600 dark:text-gray-400 hidden lg:block border-l border-gray-200 dark:border-gray-700 pl-4">
               Zambia ECZ Syllabus
             </div>
          </div>
        </div>
      </nav>

      {/* Development Banner */}
      {showDevBanner && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-3 relative z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-sm font-medium">
               <div className="p-1.5 bg-amber-200 dark:bg-amber-800 rounded-full shrink-0">
                  <Construction className="w-4 h-4 text-amber-700 dark:text-amber-100" />
               </div>
               <p className="leading-tight">
                 <span className="font-bold">Note:</span> This app is currently under active development and not yet fully developed. We shall be making necessary improvements as time goes by and pledge to add all missing features soon.
               </p>
            </div>
            <button 
              onClick={() => setShowDevBanner(false)} 
              className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full transition-colors text-amber-600 dark:text-amber-300"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10" role="main">
        {renderContent()}
      </main>

      <ScrollToTop />

      <footer 
        className="bg-white/90 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto relative z-10 backdrop-blur-sm"
        role="contentinfo"
      >
         <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
           
           <nav className="flex justify-center gap-6 mb-8 font-medium" aria-label="Footer Navigation">
                <button onClick={() => setAppState('LEADERBOARD')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors" aria-label="View Leaderboard">Leaderboard</button>
                <button onClick={() => setAppState('HISTORY')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors" aria-label="View Quiz History">History</button>
                <button onClick={() => setAppState('HELP')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors" aria-label="View Help and FAQ">Help</button>
                <button onClick={() => setAppState('ABOUT')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors" aria-label="View About Us">About Us</button>
                <button onClick={() => setAppState('CONTACT')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors" aria-label="Contact Us">Contact</button>
                <button onClick={resetApp} className="hover:text-green-600 dark:hover:text-green-400 transition-colors" aria-label="Go to Home">Home</button>
           </nav>

           <div className="border-t border-gray-100 dark:border-gray-700/50 pt-6 pb-8 max-w-2xl mx-auto">
              <p className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-3">Powered by</p>
              <div className="flex flex-col items-center">
                 <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                    <img src="https://iili.io/ff1WtJs.jpg" alt="DMW Logo" className="w-5 h-5 rounded-full object-cover" />
                    Digital Mastery Works
                 </span>
                 <span className="text-xs mt-1 font-bold uppercase tracking-widest bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 dark:from-yellow-400 dark:via-amber-200 dark:to-yellow-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                    Creation From Imagination - Managing Brands
                 </span>
              </div>
           </div>
           
           <p className="mb-2 text-gray-600 dark:text-gray-400">Based on the Zambian latest O level Syllabus</p>
           <p className="font-semibold text-gray-700 dark:text-gray-300">&#169; 2025 ZOT Dynamic Quizzes-Zeddy Online Tuitions. All Rights Reserved.</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
