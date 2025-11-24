
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppState, Subject, Question, QuizResult, EducationLevel, Difficulty, QuizHistoryItem, ChatMessage } from './types';
import { generateQuiz, getSubjectTrends } from './services/geminiService';
import { getChatResponse } from './services/chatService';
import SubjectCard from './components/SubjectCard';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import LiveTutor from './components/LiveTutor';
import RealTimeClock from './components/RealTimeClock';
import { SUBJECT_TOPICS, ZAMBIAN_LANGUAGES, LITERATURE_BOOKS, TopicDef } from './data/subjectTopics';
import * as LucideIcons from 'lucide-react';
import { 
  // UI Elements
  Sparkles, Zap, BookText, AlertCircle, Hash, ArrowLeft, Layers, GraduationCap, 
  Search, Loader2, BrainCircuit, MessageCircle, FolderOpen, Book, 
  PlayCircle, ChevronRight, X, Sun, Moon, ExternalLink, Settings, Target, Gauge,
  ListOrdered, Clock, Info, Code, Palette, Briefcase, Globe, HelpCircle, History,
  Calendar, Trash2, RefreshCw, Send
} from 'lucide-react';

// ... (rest of imports and helper functions remain the same) ...
// Helper component to render icon dynamically from string name
const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) return <Hash className={className} />;
  return <IconComponent className={className} />;
};

const SUBJECTS_BY_LEVEL: Record<EducationLevel, Subject[]> = {
  [EducationLevel.Primary]: [
    Subject.CTS,                    // Creative & Technology Studies
    Subject.DesignAndTechnology,    // Design & Technology
    Subject.English,                // English Language
    Subject.HomeEconomics,          // Home Economics
    Subject.IntegratedScience,      // Integrated Science
    Subject.Mathematics,            // Mathematics
    Subject.SocialStudies,          // Social Studies
    Subject.SpecialPaper1,          // Special Paper 1
    Subject.SpecialPaper2,          // Special Paper 2
    Subject.ZambianLanguages        // Zambian Languages
  ],
  [EducationLevel.JuniorSecondary]: [
    Subject.AgriculturalScience,    // Agricultural Science
    Subject.ArtAndDesign,           // Art & Design
    Subject.BusinessStudies,        // Business Studies
    Subject.ComputerStudies,        // Computer Studies
    Subject.DesignAndTechnology,    // Design & Technology
    Subject.English,                // English Language
    Subject.French,                 // French
    Subject.HomeEconomics,          // Home Economics
    Subject.IntegratedScience,      // Integrated Science
    Subject.Mathematics,            // Mathematics
    Subject.Music,                  // Music
    Subject.PhysicalEducation,      // Physical Education
    Subject.ReligiousEducation,     // Religious Education
    Subject.SocialStudies,          // Social Studies
    Subject.ZambianLanguages        // Zambian Languages
  ],
  [EducationLevel.SeniorSecondary]: [
     Subject.AdditionalMathematics, // Additional Mathematics
     Subject.AgriculturalScience,   // Agricultural Science
     Subject.ArtAndDesign,          // Art & Design
     Subject.Biology,               // Biology
     Subject.Chemistry,             // Chemistry
     Subject.Chinese,               // Chinese
     Subject.Civics,                // Civic Education
     Subject.Commerce,              // Commerce
     Subject.ComputerStudies,       // Computer Studies
     Subject.DesignAndTechnology,   // Design & Technology
     Subject.English,               // English Language
     Subject.FoodAndNutrition,      // Food & Nutrition
     Subject.French,                // French
     Subject.Geography,             // Geography
     Subject.History,               // History
     Subject.Literature,            // Literature in English
     Subject.Mathematics,           // Mathematics
     Subject.MusicalArtsEducation,  // Musical Arts Education (Renamed from Music for Senior)
     Subject.Physics,               // Physics
     Subject.Accounts,              // Principles of Accounts
     Subject.ReligiousEducation,    // Religious Education
     Subject.ZambianLanguages       // Zambian Languages
  ]
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

  // Chatbot State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    localStorage.removeItem('zot_quiz_session');

    try {
      let finalTopic = selectedTopic;
      if (selectedLanguage) {
         finalTopic = finalTopic ? `${selectedLanguage} - ${finalTopic}` : selectedLanguage;
      }
      
      // Default to "General" if null
      if (!finalTopic) finalTopic = "General / All Topics";

      const generatedQuestions = await generateQuiz(selectedSubject, selectedLevel, questionCount, undefined, finalTopic, difficulty);
      
      setQuestions(generatedQuestions);
      setAppState('QUIZ');
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
          // ... (Existing SELECTION case content) ...
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
               <div className="inline-flex items-center justify-center p-3 bg-green-600 rounded-xl mb-4 shadow-lg shadow-green-200 dark:shadow-none">
                 <Zap className="w-8 h-8 text-white fill-current" />
               </div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">ZOT Dynamic Quizzes</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Master your ECZ exams with intelligent dynamic quizzes. 
                Choose your level and subject to get started.
              </p>
              
              <div className="mt-6 flex justify-center gap-4 flex-wrap">
                 <button 
                    onClick={() => setAppState('LIVE_TUTOR')}
                    className="inline-flex items-center px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-full hover:bg-gray-800 dark:hover:bg-gray-600 transition-all shadow-lg hover:shadow-xl group"
                 >
                    <BrainCircuit className="w-5 h-5 mr-2 text-green-400 group-hover:animate-pulse" />
                    Start Live Quiz Session
                 </button>

                 {resumeData && (
                     <button 
                        onClick={handleResumeQuiz}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl animate-bounce-subtle"
                     >
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Resume {resumeData.subject} Quiz
                     </button>
                 )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Oral exam practice with Virtual Quiz Master</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 max-w-3xl mx-auto">
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
                         >
                            <span>{lvl}</span>
                         </button>
                     ))}
                   </div>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableSubjects.map((subj) => (
                <SubjectCard 
                  key={subj} 
                  subject={subj} 
                  onClick={handleSubjectSelect} 
                />
              ))}
            </div>
            
            {availableSubjects.length === 0 && (
               <div className="text-center py-12 text-gray-500 dark:text-gray-400 col-span-full">
                  No subjects configured for this level yet.
               </div>
            )}
          </div>
        );
      
      case 'LIVE_TUTOR':
         return (
             <LiveTutor 
               onClose={resetApp} 
               selectedVoice={selectedVoice}
             />
         );
      
      case 'ABOUT':
        return (
          <div className="max-w-4xl mx-auto animate-fade-in p-4 sm:p-0">
            <button 
                onClick={() => setAppState('SELECTION')}
                className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
            </button>

            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">About Us</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Meet the dedicated team behind ZOT Dynamic Quizzes, committed to revolutionizing education in Zambia through technology.
                </p>
            </div>

            {/* Managing Brand Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md border border-gray-100 dark:border-gray-700 mb-8 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 animate-shimmer bg-[length:200%_auto]"></div>
                
                {/* DMW Logo Repositioned Here */}
                <div className="inline-flex items-center justify-center mb-4">
                     <div className="p-1 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 rounded-full shadow-lg">
                        <img src="https://iili.io/ff1WtJs.jpg" alt="DMW Logo" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800" />
                     </div>
                </div>

                <h3 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 dark:from-yellow-400 dark:via-amber-200 dark:to-yellow-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                    Digital Mastery Works
                </h3>
                
                <p className="text-sm font-bold uppercase tracking-widest mb-4 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 dark:from-yellow-400 dark:via-amber-200 dark:to-yellow-400 bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer">
                    Creation From Imagination - Managing Brands
                </p>

                <p className="text-gray-600 dark:text-gray-300 mt-4 text-sm max-w-2xl mx-auto leading-relaxed">
                    Digital Mastery Works manages the entire development of the ZOT Dynamic Quizzes platform. The individuals listed below are part of the dedicated DMW team.
                </p>
            </div>

            {/* Developers Grid */}
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">The Development Team</h3>
            <div className="grid md:grid-cols-2 gap-6">
                {/* KK Interz */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:border-green-400 dark:hover:border-green-600 transition-colors">
                    <div className="mb-4 w-40 h-40 rounded-full overflow-hidden border-4 border-purple-50 dark:border-purple-900/20 shadow-sm">
                         <img 
                            src="https://iili.io/ffNhkUG.jpg" 
                            alt="KK Interz" 
                            className="w-full h-full object-cover"
                         />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">KK Interz</h4>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Kennedy Rodney Kachingwe</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 italic">a.k.a Young Prof &bull; Kaey-Briezey</p>
                    <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded-full mt-1 mb-4">
                        Frontend & Backend Development
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        The architectural mind behind the code. Responsible for the full-stack implementation, AI integration, and core logic that powers the dynamic quiz generation engine.
                    </p>
                </div>

                {/* Athan Tembo */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:border-green-400 dark:hover:border-green-600 transition-colors">
                    <div className="mb-4 w-40 h-40 rounded-full overflow-hidden border-4 border-pink-50 dark:border-pink-900/20 shadow-sm">
                         <img 
                            src="https://iili.io/ffc8txj.jpg" 
                            alt="Athan Tembo" 
                            className="w-full h-full object-cover"
                         />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white">Athan Tembo</h4>
                    <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 rounded-full mt-2 mb-4">
                        Graphics & UI Assets
                    </span>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        The creative force behind the visuals. Designed the user interface assets, icons, and visual language to create an engaging and intuitive learning experience.
                    </p>
                </div>
            </div>
            
            <div className="mt-12 text-center text-gray-400 text-xs">
                 <p>&#169; 2025 ZOT Dynamic Quizzes-Zeddy Online Tuitions. All Rights Reserved.</p>
            </div>
          </div>
        );

      case 'HELP':
        return (
          <div className="max-w-4xl mx-auto animate-fade-in p-4 sm:p-0 pb-24">
            <button
              onClick={() => setAppState('SELECTION')}
              className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Home
            </button>

            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4 text-blue-600 dark:text-blue-400">
                 <HelpCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Help & User Guide</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                 Everything you need to know about using ZOT Dynamic Quizzes to ace your exams.
              </p>
            </div>

            <div className="grid gap-8">
               {/* Section 1: How to take a quiz */}
               <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                     <Sparkles className="w-5 h-5 text-green-500" />
                     How to Take a Quiz
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-300 ml-2">
                     <li><strong className="text-gray-900 dark:text-white">Select Level:</strong> Choose Primary, Junior Secondary, or Senior Secondary.</li>
                     <li><strong className="text-gray-900 dark:text-white">Choose Subject:</strong> Pick from the list of available subjects for your level.</li>
                     <li><strong className="text-gray-900 dark:text-white">Select Topic:</strong> Drill down into specific topics or choose "General / All Topics" for a mixed test.</li>
                     <li><strong className="text-gray-900 dark:text-white">Configure:</strong> Set the number of questions (or use Auto) and choose a difficulty level.</li>
                     <li><strong className="text-gray-900 dark:text-white">Start:</strong> The system generates a unique quiz instantly.</li>
                  </ol>
               </div>

               {/* Section 2: Features */}
               <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                     <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 text-blue-500" />
                        Live Tutor
                     </h4>
                     <p className="text-sm text-gray-600 dark:text-gray-400">
                        Practice oral exams with our AI voice tutor. Click "Start Live Quiz Session" on the home screen. Speak naturally to answer questions.
                     </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                     <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4 text-purple-500" />
                        Deep Explain
                     </h4>
                     <p className="text-sm text-gray-600 dark:text-gray-400">
                        Stuck on a question? In the Results view, click "Deep Explain" to get a detailed, step-by-step breakdown from the Virtual Tutor.
                     </p>
                  </div>
               </div>

               {/* Section 3: FAQ */}
               <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h3>
                  <div className="space-y-6">
                     <div>
                        <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Do I need an internet connection?</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Yes. The quizzes are generated dynamically using cloud intelligence, so an active connection is required.</p>
                     </div>
                     <div>
                        <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Are these real past papers?</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">The questions are modeled closely after ECZ past papers and syllabus requirements, but they are generated freshly each time to provide endless practice.</p>
                     </div>
                  </div>
               </div>
            </div>

             {/* Floating Chat Button */}
             <button
                 onClick={() => setIsChatOpen(true)}
                 className="fixed bottom-6 right-6 z-50 p-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-110 animate-bounce-subtle ring-4 ring-green-100 dark:ring-green-900/30"
                 title="Open Chatbot"
             >
                 <MessageCircle className="w-8 h-8" />
             </button>

             {/* Chat Overlay Modal */}
             {isChatOpen && (
                 <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                     <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[85vh] border border-gray-200 dark:border-gray-700">
                         {/* Chat Header */}
                         <div className="flex items-center justify-between p-4 bg-green-600 border-b border-green-700">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-white/20 rounded-lg">
                                     <MessageCircle className="w-6 h-6 text-white" />
                                 </div>
                                 <div>
                                     <h3 className="text-lg font-bold text-white">ZOT Assistant</h3>
                                     <p className="text-xs text-green-100">AI Support Chat</p>
                                 </div>
                             </div>
                             <button 
                                 onClick={() => setIsChatOpen(false)} 
                                 className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                             >
                                 <X className="w-6 h-6" />
                             </button>
                         </div>

                         {/* Chat Messages Area */}
                         <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-3">
                             {chatHistory.length === 0 && (
                                 <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
                                     <MessageCircle className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" />
                                     <p className="text-sm italic">
                                         Hello! I'm the ZOT Assistant. Ask me anything about the app features or how to get started.
                                     </p>
                                 </div>
                             )}
                             {chatHistory.map((msg, idx) => (
                                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                     <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                         msg.role === 'user' 
                                         ? 'bg-green-600 text-white rounded-tr-none' 
                                         : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-tl-none'
                                     }`}>
                                         <p className="whitespace-pre-wrap">{msg.text}</p>
                                     </div>
                                 </div>
                             ))}
                             {isChatLoading && (
                                 <div className="flex justify-start">
                                     <div className="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-2">
                                         <Loader2 className="w-4 h-4 animate-spin text-green-600 dark:text-green-400" />
                                         <span className="text-xs text-gray-500 dark:text-gray-400">Typing...</span>
                                     </div>
                                 </div>
                             )}
                             <div ref={chatEndRef} />
                         </div>

                         {/* Chat Input Area */}
                         <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                             <form onSubmit={handleChatSubmit} className="flex gap-2">
                                 <input 
                                     type="text" 
                                     value={chatInput}
                                     onChange={(e) => setChatInput(e.target.value)}
                                     placeholder="Type your question..."
                                     className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
                                     disabled={isChatLoading}
                                     autoFocus
                                 />
                                 <button 
                                     type="submit"
                                     disabled={!chatInput.trim() || isChatLoading}
                                     className="p-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                 >
                                     <Send className="w-5 h-5" />
                                 </button>
                             </form>
                         </div>
                     </div>
                 </div>
             )}
          </div>
        );
      
      case 'HISTORY':
        // ... (Existing HISTORY case content) ...
        return (
            <div className="max-w-4xl mx-auto animate-fade-in p-4 sm:p-0">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => setAppState('SELECTION')}
                        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Home
                    </button>
                    
                    {quizHistory.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="flex items-center text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Clear History
                        </button>
                    )}
                </div>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-4 text-purple-600 dark:text-purple-400">
                        <History className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Quiz History</h2>
                    <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Review your past performance and track your progress.
                    </p>
                </div>

                {quizHistory.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <History className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No quizzes taken yet.</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Complete a quiz to see it here.</p>
                        <button 
                            onClick={() => setAppState('SELECTION')}
                            className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Start a Quiz
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quizHistory.map((item) => {
                            const date = new Date(item.timestamp);
                            const percent = Math.round((item.score / item.totalQuestions) * 100);
                            let scoreColor = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                            if (percent >= 80) scoreColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                            else if (percent >= 50) scoreColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleLoadHistoryItem(item)}
                                    className="w-full text-left bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between group"
                                >
                                    <div className="mb-4 sm:mb-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {item.level}
                                            </span>
                                            <span className="text-xs text-gray-400 flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {date.toLocaleDateString()} &bull; {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                            {item.subject}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                                            {item.topic}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${scoreColor}`}>
                                                {percent}%
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {item.score}/{item.totalQuestions} Correct
                                            </p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );

      case 'CONFIG':
        return (
          // ... (Existing CONFIG case content) ...
            <div className="max-w-2xl mx-auto animate-fade-in">
                <button 
                    onClick={handleBackFromConfig}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Topics
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 dark:shadow-none">
                                <Settings className="w-8 h-8 animate-spin-slow" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz Configuration</h2>
                                <p className="text-gray-500 dark:text-gray-400">Customize your exam experience.</p>
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
                                >
                                    <span>Auto</span>
                                    <span className="text-[10px] font-normal opacity-70">Rand</span>
                                </button>
                                
                                {[60, 50, 40, 30, 20, 10].map(num => (
                                    <button 
                                        key={num}
                                        onClick={() => setQuestionCount(num)}
                                        className={`w-14 h-12 flex items-center justify-center text-sm font-bold rounded-lg transition-all border ${questionCount === num ? 'bg-green-600 text-white border-green-600 shadow-md scale-110' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-600'}`}
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
                                className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-500/40 flex items-center justify-center group"
                             >
                                <Sparkles className="w-6 h-6 mr-2 group-hover:animate-spin-slow" />
                                Start Quiz
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        );

      case 'TOPIC_SELECTION':
        // ... (Existing TOPIC_SELECTION case content) ...
        if (selectedSubject === Subject.ZambianLanguages && !selectedLanguage) {
            return (
              <div className="max-w-4xl mx-auto animate-fade-in">
                <button 
                    onClick={handleBackFromTopics}
                    className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
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
             >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {viewingLiteratureBooks ? 'Back to Literature Topics' : 
                 selectedLanguage ? 'Back to Languages' : 'Back to Subjects'}
             </button>

             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
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
                        >
                            {isLoadingTrends ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Check Exam Trends
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
              Generating {questionCount === 'Auto' ? 'Random' : questionCount} Questions...
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
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
            onHome={resetApp}
            level={selectedLevel}
            topic={getDisplayTopic()}
            difficulty={difficulty}
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
                 >
                   <RefreshCw className="w-5 h-5 mr-2" />
                   Try Again
                 </button>
                 
                 <button 
                  onClick={() => setAppState('CONFIG')}
                  className="flex-1 px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm"
                 >
                   Change Settings
                 </button>
             </div>
             
             <button 
              onClick={resetApp}
              className="mt-8 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline transition-colors"
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-200">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shrink-0">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <span className="text-sm sm:text-xl font-bold tracking-tight bg-gradient-to-r from-green-500 via-blue-600 via-red-500 to-yellow-500 bg-[length:300%_auto] bg-clip-text text-transparent animate-shimmer">
               ZOT DYNAMIC QUIZZES-ZEDDY ONLINE TUITIONS
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
             {/* Removed History, Help, About buttons from here */}
             
             <RealTimeClock />
             
             <button 
               onClick={toggleTheme} 
               className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
               title="Toggle Theme"
             >
               {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <div className="text-sm text-gray-500 dark:text-gray-400 hidden lg:block border-l border-gray-200 dark:border-gray-700 pl-4">
               Zambia ECZ Syllabus
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderContent()}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto">
         <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 dark:text-gray-400 text-sm">
           
           <div className="flex justify-center gap-6 mb-8 font-medium">
                <button onClick={() => setAppState('HISTORY')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">History</button>
                <button onClick={() => setAppState('HELP')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Help</button>
                <button onClick={() => setAppState('ABOUT')} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">About Us</button>
                <button onClick={resetApp} className="hover:text-green-600 dark:hover:text-green-400 transition-colors">Home</button>
           </div>

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
           
           <p className="mb-2 text-gray-500 dark:text-gray-400">Based on the Zambian latest O level Syllabus</p>
           <p className="font-semibold text-gray-700 dark:text-gray-300">&#169; 2025 ZOT Dynamic Quizzes-Zeddy Online Tuitions. All Rights Reserved.</p>
         </div>
      </footer>
    </div>
  );
};
