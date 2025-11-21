
import React, { useState, useCallback, useMemo } from 'react';
import { AppState, Subject, Question, QuizResult, EducationLevel } from './types';
import { generateQuiz, getSubjectTrends } from './services/geminiService';
import SubjectCard from './components/SubjectCard';
import QuizInterface from './components/QuizInterface';
import ResultsView from './components/ResultsView';
import LiveTutor from './components/LiveTutor';
import { SUBJECT_TOPICS, ZAMBIAN_LANGUAGES, LITERATURE_BOOKS } from './data/subjectTopics';
import { Sparkles, Zap, BookText, AlertCircle, Hash, ArrowLeft, Layers, GraduationCap, Radio, Search, Loader2, BrainCircuit, MessageCircle, Clock, FolderOpen, Book } from 'lucide-react';

// Define available subjects per level
// Subjects are sorted alphabetically by their Display Name (value in Subject enum)
const SUBJECTS_BY_LEVEL: Record<EducationLevel, Subject[]> = {
  [EducationLevel.Primary]: [
    Subject.CTS,                    // Creative & Technology Studies
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
     Subject.Physics,               // Physics
     Subject.Accounts,              // Principles of Accounts
     Subject.ReligiousEducation,    // Religious Education
     Subject.ZambianLanguages       // Zambian Languages
  ]
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('SELECTION');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null); // For Zambian Languages
  const [viewingLiteratureBooks, setViewingLiteratureBooks] = useState(false); // For Literature Folder
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<{ questionId: number; selectedIndex: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Configuration State
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>(EducationLevel.SeniorSecondary);
  const [customContext, setCustomContext] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Feature: Exam Trends (Search Grounding)
  const [trends, setTrends] = useState<string | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);

  // 1. User clicks subject
  const handleSubjectSelect = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setTrends(null); // Reset trends
    setSelectedLanguage(null); // Reset language selection
    setViewingLiteratureBooks(false); // Reset literature folder
    
    // If user wants to use custom context (past paper text), skip topic selection
    if (showCustomInput && customContext.trim().length > 10) {
      startQuizGeneration(subject, undefined);
    } else {
      // Otherwise go to topic selection
      setAppState('TOPIC_SELECTION');
      setSelectedTopic(null); // Reset topic
    }
  }, [showCustomInput, customContext]);

  // 2. User confirms topic (or auto-starts from step 1)
  const startQuizGeneration = async (subject: Subject, topic?: string) => {
    setAppState('LOADING');
    setErrorMsg(null);

    try {
      // Pass custom context if user provided it, otherwise undefined
      const contextToUse = showCustomInput && customContext.trim().length > 10 ? customContext : undefined;
      
      // If a language was selected (e.g. Bemba), prepend it to the topic or use it as main focus
      let finalTopic = topic;
      if (selectedLanguage) {
         finalTopic = finalTopic ? `${selectedLanguage} - ${finalTopic}` : selectedLanguage;
      }

      const generatedQuestions = await generateQuiz(subject, selectedLevel, questionCount, contextToUse, finalTopic);
      
      setQuestions(generatedQuestions);
      setAppState('QUIZ');
    } catch (err) {
      console.error(err);
      setErrorMsg("We couldn't generate the quiz at this moment. Please try again.");
      setAppState('ERROR');
    }
  };

  const handleTopicSelect = (topic: string) => {
    // Check if it's the Literature Folder
    if (selectedSubject === Subject.Literature && topic === "Set Books (Novels & Plays)") {
        setViewingLiteratureBooks(true);
        return;
    }
    setSelectedTopic(topic);
  };
  
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    setSelectedTopic(null); // Reset topic when language changes
  };

  const handleStartWithTopic = () => {
    if (selectedSubject) {
      startQuizGeneration(selectedSubject, selectedTopic || "General / All Topics");
    }
  };

  const handleBackFromTopics = () => {
      if (viewingLiteratureBooks) {
          setViewingLiteratureBooks(false);
          return;
      }

      if (selectedSubject === Subject.ZambianLanguages && selectedLanguage) {
          // If looking at topics for a specific language, go back to language list
          setSelectedLanguage(null);
          setSelectedTopic(null);
      } else {
          // Else go back to subject selection
          setAppState('SELECTION');
      }
  };
  
  // Feature: Check Exam Trends
  const handleCheckTrends = async () => {
     if (!selectedSubject) return;
     setIsLoadingTrends(true);
     // Incorporate language into search if selected
     const subjectTerm = selectedLanguage ? `${selectedSubject} (${selectedLanguage})` : selectedSubject;
     const trendData = await getSubjectTrends(subjectTerm);
     setTrends(trendData);
     setIsLoadingTrends(false);
  };

  const handleQuizComplete = (answers: { questionId: number; selectedIndex: number }[]) => {
    setQuizAnswers(answers);
    setAppState('RESULTS');
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
    setCustomContext('');
    setShowCustomInput(false);
  };

  const retryQuiz = () => {
    if (selectedSubject) {
      // If we had a topic selected, keep it.
      startQuizGeneration(selectedSubject, selectedTopic || undefined);
    } else {
      resetApp();
    }
  };

  const handleQuestionCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      // Clamp between 1 and 50 to prevent abuse/timeouts
      setQuestionCount(Math.min(50, Math.max(1, val)));
    }
  };

  const availableSubjects = useMemo(() => {
    return SUBJECTS_BY_LEVEL[selectedLevel] || [];
  }, [selectedLevel]);

  // Components based on state
  const renderContent = () => {
    switch (appState) {
      case 'SELECTION':
        return (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
               <div className="inline-flex items-center justify-center p-3 bg-green-600 rounded-xl mb-4 shadow-lg shadow-green-200">
                 <Zap className="w-8 h-8 text-white fill-current" />
               </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">ZOT Dynamic Quizzes</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Master your ECZ exams with AI-powered dynamic quizzes. 
                Configure your quiz below to generate a fresh set of questions instantly.
              </p>
              
              {/* Feature: Live Quiz Button */}
              <div className="mt-6">
                 <button 
                    onClick={() => setAppState('LIVE_TUTOR')}
                    className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl group"
                 >
                    <BrainCircuit className="w-5 h-5 mr-2 text-green-400 group-hover:animate-pulse" />
                    Start Live Quiz Session
                 </button>
                 <p className="text-xs text-gray-500 mt-2">Oral exam practice with AI Quiz Master</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-10">
               {/* Quiz Configuration Header */}
               <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quiz Configuration</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Level Selection */}
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-3">
                         <div className="p-1.5 bg-green-100 rounded-lg text-green-700">
                            <GraduationCap className="w-4 h-4" /> 
                         </div>
                         <label className="font-semibold text-gray-700 text-sm">Education Level</label>
                       </div>
                       
                       <div className="flex flex-col gap-2">
                         {[EducationLevel.Primary, EducationLevel.JuniorSecondary, EducationLevel.SeniorSecondary].map((lvl) => (
                             <button 
                                key={lvl}
                                onClick={() => setSelectedLevel(lvl)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border text-left flex items-center justify-between ${selectedLevel === lvl ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:bg-green-50'}`}
                             >
                                <span>{lvl}</span>
                                {selectedLevel === lvl && <div className="w-2 h-2 rounded-full bg-white"></div>}
                             </button>
                         ))}
                       </div>
                    </div>

                    {/* Question Count Selection */}
                    <div className="flex-1 border-t border-gray-100 pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8">
                       <div className="flex items-center gap-2 mb-3">
                         <div className="p-1.5 bg-green-100 rounded-lg text-green-700">
                            <Hash className="w-4 h-4" /> 
                         </div>
                         <label className="font-semibold text-gray-700 text-sm">Number of Questions</label>
                       </div>
                       
                       <div className="flex flex-wrap items-center gap-2">
                         {[10, 20, 30].map(num => (
                             <button 
                                key={num}
                                onClick={() => setQuestionCount(num)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${questionCount === num ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:bg-green-50'}`}
                             >
                                {num}
                             </button>
                         ))}
                         <div className="relative flex items-center">
                            <span className="text-xs text-gray-500 mr-2 font-medium">Custom:</span>
                            <input 
                                type="number"
                                min="1"
                                max="50"
                                value={questionCount}
                                onChange={handleQuestionCountChange}
                                className="w-20 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center"
                            />
                         </div>
                       </div>
                    </div>

                    {/* Material Source Selection */}
                    <div className="flex-1 border-t border-gray-100 pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="p-1.5 bg-green-100 rounded-lg text-green-700">
                              <BookText className="w-4 h-4" /> 
                           </div>
                           <label className="font-semibold text-gray-700 text-sm">Source Material</label>
                        </div>
                        
                        <div className="flex bg-gray-100 p-1 rounded-lg inline-flex w-full flex-col sm:flex-row">
                           <button 
                            onClick={() => setShowCustomInput(false)}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${!showCustomInput ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                           >
                             Standard Syllabus
                           </button>
                           <button 
                            onClick={() => setShowCustomInput(true)}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${showCustomInput ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                           >
                             Use Past Paper Text
                           </button>
                        </div>
                    </div>

                  </div>
               </div>
               
               {showCustomInput && (
                 <div className="animate-fade-in mt-6 p-8 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col items-center text-center">
                    <div className="p-3 bg-yellow-100 rounded-full mb-4">
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Feature Under Development</h4>
                    <p className="text-gray-600 max-w-md mx-auto">
                        The <strong>Past Paper Analysis</strong> module is currently being engineered. 
                        This advanced feature requires significant development time to ensure accuracy with ECZ standards.
                    </p>
                    <p className="text-sm text-yellow-700 mt-4 font-medium">
                        Please use "Standard Syllabus" mode for now.
                    </p>
                 </div>
               )}
            </div>

            {/* Subject Grid - Filtered by Level */}
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
               <div className="text-center py-12 text-gray-500">
                  No subjects configured for this level yet.
               </div>
            )}
          </div>
        );
      
      case 'LIVE_TUTOR':
         return (
             <LiveTutor onClose={resetApp} />
         );

      case 'TOPIC_SELECTION':
        // Special handling for Zambian Languages: Show Language Selection First
        if (selectedSubject === Subject.ZambianLanguages && !selectedLanguage) {
            return (
              <div className="max-w-4xl mx-auto animate-fade-in">
                <button 
                    onClick={handleBackFromTopics}
                    className="flex items-center text-gray-500 hover:text-green-600 font-medium mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Subjects
                </button>

                <div className="bg-white rounded-2xl shadow-md p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-amber-100 rounded-xl">
                            <MessageCircle className="w-8 h-8 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Select Zambian Language</h2>
                            <p className="text-gray-500">Choose a language to proceed to topics.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {ZAMBIAN_LANGUAGES.map((lang) => (
                            <button
                                key={lang}
                                onClick={() => handleLanguageSelect(lang)}
                                className="p-4 rounded-xl border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 text-gray-700 font-bold transition-all text-center shadow-sm hover:shadow-md"
                            >
                                {lang}
                            </button>
                        ))}
                    </div>
                </div>
              </div>
            );
        }

        // Default Topic Selection (or Topic Selection after Language chosen)
        return selectedSubject ? (
          <div className="max-w-4xl mx-auto animate-fade-in">
             <button 
                onClick={handleBackFromTopics}
                className="flex items-center text-gray-500 hover:text-green-600 font-medium mb-6 transition-colors"
             >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {viewingLiteratureBooks ? 'Back to Literature Topics' : 
                 selectedLanguage ? 'Back to Languages' : 'Back to Subjects'}
             </button>

             <div className="bg-white rounded-2xl shadow-md p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-green-100 rounded-xl">
                          {viewingLiteratureBooks ? <FolderOpen className="w-8 h-8 text-green-600" /> : <Layers className="w-8 h-8 text-green-600" />}
                       </div>
                       <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                              {viewingLiteratureBooks ? "Set Books Selection" : 
                               selectedLanguage ? `${selectedLanguage} Topics` : `${selectedSubject} Topics`}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {selectedLevel}
                              </span>
                              <p className="text-gray-500">
                                {viewingLiteratureBooks ? "Choose a specific book or play." : "Select a topic or choose 'General'."}
                              </p>
                          </div>
                       </div>
                    </div>
                    
                    {/* Feature: Search Grounding / Trends */}
                    {!viewingLiteratureBooks && (
                        <button 
                            onClick={handleCheckTrends}
                            disabled={isLoadingTrends}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                        >
                            {isLoadingTrends ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Check Exam Trends
                        </button>
                    )}
                </div>

                {/* Trends Display */}
                {trends && !viewingLiteratureBooks && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-gray-800 animate-fade-in">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center">
                           <Search className="w-3 h-3 mr-1" /> Recent Exam Trends (Web Source):
                        </h4>
                        <p className="whitespace-pre-line">{trends}</p>
                    </div>
                )}

                {/* Render Literature Books Grid if viewing folder */}
                {viewingLiteratureBooks ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {LITERATURE_BOOKS.map((book) => (
                             <button
                                key={book}
                                onClick={() => handleTopicSelect(book)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${selectedTopic === book ? 'border-green-600 bg-green-50 text-green-900 ring-1 ring-green-600' : 'border-gray-100 hover:border-green-300 hover:bg-gray-50 text-gray-700'}`}
                              >
                                <div className="flex items-start gap-3">
                                    <Book className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                                    <span className="block font-medium">{book}</span>
                                </div>
                              </button>
                        ))}
                    </div>
                ) : (
                    /* Normal Topic Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                       {/* General / All Option */}
                       <button
                          onClick={() => handleTopicSelect("General / All Topics")}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${selectedTopic === "General / All Topics" || selectedTopic === null ? 'border-green-600 bg-green-50 text-green-900 ring-1 ring-green-600' : 'border-gray-100 hover:border-green-300 hover:bg-gray-50 text-gray-700'}`}
                       >
                          <span className="block font-bold mb-1">General / All Topics</span>
                          <span className="text-xs opacity-75">Mixed questions from the entire syllabus</span>
                       </button>

                       {/* Specific Topics */}
                       {SUBJECT_TOPICS[selectedSubject]?.map((topic) => {
                           const isFolder = topic === "Set Books (Novels & Plays)";
                           return (
                              <button
                                key={topic}
                                onClick={() => handleTopicSelect(topic)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${selectedTopic === topic ? 'border-green-600 bg-green-50 text-green-900 ring-1 ring-green-600' : isFolder ? 'border-amber-200 bg-amber-50 hover:border-amber-400 hover:shadow-md' : 'border-gray-100 hover:border-green-300 hover:bg-gray-50 text-gray-700'}`}
                              >
                                {isFolder ? (
                                    <div className="flex items-center gap-2 text-amber-800">
                                        <FolderOpen className="w-5 h-5" />
                                        <span className="block font-bold">{topic}</span>
                                    </div>
                                ) : (
                                    <span className="block font-medium">{topic}</span>
                                )}
                              </button>
                           );
                       })}
                    </div>
                )}

                <div className="flex justify-end border-t border-gray-100 pt-6">
                   <button
                      onClick={handleStartWithTopic}
                      className="px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-green-200 flex items-center"
                   >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Quiz
                   </button>
                </div>
             </div>
          </div>
        ) : null;

      case 'LOADING':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="relative w-24 h-24 mb-8">
               <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
               <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-600 w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Generating {questionCount} Questions...</h3>
            <p className="text-gray-500 text-center max-w-md">
              <span className="block font-medium text-green-700 mb-1">{selectedLevel}</span>
              {selectedLanguage ? (
                 <span className="block font-medium text-amber-600 mb-1">{selectedLanguage}</span>
              ) : null}
              {selectedTopic ? `Focusing on: ${selectedTopic}` : `Creating a comprehensive ${selectedSubject} quiz.`}
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
          />
        ) : null;
      
      case 'ERROR':
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
             <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
             <p className="text-gray-600 mb-6 max-w-md">
               {errorMsg || "We encountered an error while generating the quiz."}
             </p>
             <button 
              onClick={resetApp}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
             >
               Return Home
             </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">ZOT<span className="text-green-600">Dynamic</span></span>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            Zambia ECZ Syllabus
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
         <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
           <p className="mb-2">&copy; {new Date().getFullYear()} ZOT Dynamic Quizzes. Educational Practice Tool.</p>
           <p>Based on the Zambian latest O level Syllabus</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
