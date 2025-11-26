
import React, { useState, useEffect, useRef } from 'react';
import { Question, Subject } from '../types';
import { CheckCircle, XCircle, ArrowRight, Timer, Clock, ZoomIn, X } from 'lucide-react';

interface QuizInterfaceProps {
  subject: Subject;
  questions: Question[];
  onComplete: (answers: { questionId: number; selectedIndex: number }[]) => void;
  onCancel: () => void;
  initialProgress?: {
    currentQuestionIndex: number;
    answers: { questionId: number; selectedIndex: number }[];
    questionTimeLeft?: number;
  };
  isExamMode?: boolean;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ subject, questions, onComplete, onCancel, initialProgress, isExamMode = false }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialProgress?.currentQuestionIndex || 0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: number; selectedIndex: number }[]>(initialProgress?.answers || []);
  const [showFeedback, setShowFeedback] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  // Timer State
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [totalQuestionTime, setTotalQuestionTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // Audio Context for Ticking Sound
  const tickAudioCtxRef = useRef<AudioContext | null>(null);

  // Ref to track if this is the initial mount for resume logic
  const isFirstRender = useRef(true);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Calculate dynamic time based on question length
  const calculateTimeForQuestion = (question: Question) => {
    const wordCount = question.text.split(' ').length;
    
    // Increased base time to 60 seconds + 2.5 seconds per word
    // This provides significantly more time for reading and calculation
    let calculatedTime = 60 + Math.ceil(wordCount * 2.5);

    // Check for numbers in the question text (indicating potential calculations)
    // Add 30 seconds extra if digits are present
    if (/\d/.test(question.text)) {
        calculatedTime += 30;
    }

    // Adjust for options length too
    const optionsLength = question.options.join(' ').length;
    calculatedTime += Math.ceil(optionsLength / 8);

    // Minimum 60 seconds, Maximum 900 seconds (15 minutes)
    return Math.max(60, Math.min(900, calculatedTime));
  };

  // Helper for rendering math superscripts (e.g. 2^3 -> 2³) and subscripts (H_2O -> H₂O)
  const formatText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/([_^](?:\([^)]+\)|\{[^}]+\}|-?\d+|[a-zA-Z0-9]+))/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('^')) {
        let content = part.substring(1);
        if ((content.startsWith('(') && content.endsWith(')')) || 
            (content.startsWith('{') && content.endsWith('}'))) {
          content = content.substring(1, content.length - 1);
        }
        return <sup key={index} className="text-xs align-super font-semibold">{content}</sup>;
      }
      if (part.startsWith('_')) {
        let content = part.substring(1);
        if ((content.startsWith('(') && content.endsWith(')')) || 
            (content.startsWith('{') && content.endsWith('}'))) {
          content = content.substring(1, content.length - 1);
        }
        return <sub key={index} className="text-xs align-sub font-semibold">{content}</sub>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // --- LocalStorage Save Logic ---
  useEffect(() => {
    // Save current progress to localStorage whenever key state changes
    const sessionData = {
        subject,
        questions, // Saving questions ensures we resume the exact same quiz
        currentQuestionIndex,
        answers,
        questionTimeLeft,
        timestamp: Date.now()
    };
    localStorage.setItem('zot_quiz_session', JSON.stringify(sessionData));
  }, [subject, questions, currentQuestionIndex, answers, questionTimeLeft]);

  const clearSession = () => {
      localStorage.removeItem('zot_quiz_session');
  };

  // --- End LocalStorage Logic ---

  // Reset timer when question changes
  useEffect(() => {
    if (currentQuestion) {
      // If resuming and this is the first render, use the saved time
      if (isFirstRender.current && initialProgress && initialProgress.questionTimeLeft !== undefined) {
         const calculatedTotal = calculateTimeForQuestion(currentQuestion);
         setTotalQuestionTime(calculatedTotal);
         setQuestionTimeLeft(initialProgress.questionTimeLeft);
         setIsTimerActive(true);
         isFirstRender.current = false;
      } else {
         // Normal flow
         const time = calculateTimeForQuestion(currentQuestion);
         setTotalQuestionTime(time);
         setQuestionTimeLeft(time);
         setIsTimerActive(true);
      }
    }
  }, [currentQuestionIndex, currentQuestion, initialProgress]);

  // Cleanup Audio on unmount
  useEffect(() => {
    return () => {
      if (tickAudioCtxRef.current && tickAudioCtxRef.current.state !== 'closed') {
        tickAudioCtxRef.current.close();
      }
    };
  }, []);

  // Countdown logic
  useEffect(() => {
    if (!isTimerActive || showFeedback) return;

    const timerId = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isTimerActive, showFeedback, currentQuestionIndex]);

  // Ticking Sound Logic
  useEffect(() => {
    if (isTimerActive && !showFeedback && questionTimeLeft <= 10 && questionTimeLeft > 0) {
      if (!tickAudioCtxRef.current) {
        tickAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = tickAudioCtxRef.current;
      
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const isCritical = questionTimeLeft <= 5;
      
      if (isCritical) {
        osc.type = 'triangle'; 
        const pitch = 1000 + ((6 - questionTimeLeft) * 100); 
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        
        const volume = 0.2 + ((5 - questionTimeLeft) * 0.15);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      }

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }
  }, [questionTimeLeft, isTimerActive, showFeedback]);

  // Sound Effects for Answer Feedback
  useEffect(() => {
    if (showFeedback && !isExamMode) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
        
        if (isCorrect) {
            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(1500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05); 
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } else {
            osc.type = 'sawtooth'; 
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        }
        
        setTimeout(() => {
            if(ctx.state !== 'closed') ctx.close();
        }, 600);
    }
  }, [showFeedback, selectedOption, currentQuestion, isExamMode]);

  const playCompletionSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        // Subtle ascending chime
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + (i * 0.08));
            
            gain.gain.setValueAtTime(0, now + (i * 0.08));
            gain.gain.linearRampToValueAtTime(0.15, now + (i * 0.08) + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.6);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now + (i * 0.08));
            osc.stop(now + (i * 0.08) + 0.6);
        });
        
        setTimeout(() => {
           if(ctx.state !== 'closed') ctx.close();
        }, 1200);
    } catch (e) {
        console.error("Audio play failed", e);
    }
  };

  const handleTimeout = () => {
    setIsTimerActive(false);
    if (isExamMode) {
       // In exam mode, timeout implies a skipped answer or forced submission of what is selected
       handleExamModeSubmit();
    } else {
       if (selectedOption === null) {
          const newAnswers = [...answers, { questionId: currentQuestion.id, selectedIndex: -1 }];
          setAnswers(newAnswers);
          setShowFeedback(true);
       } else {
          handleSubmitAnswer();
       }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentage = questionTimeLeft / totalQuestionTime;
    if (percentage < 0.2) return "text-red-600 animate-pulse font-bold border-red-200 bg-red-50";
    if (percentage < 0.5) return "text-orange-600 font-semibold border-orange-200 bg-orange-50";
    return "text-green-700 font-medium border-green-200 bg-green-50";
  };

  const handleOptionSelect = (index: number) => {
    if (showFeedback && !isExamMode) return; 
    setSelectedOption(index);
  };

  const handleExamModeSubmit = () => {
    const finalSelection = selectedOption !== null ? selectedOption : -1;
    const newAnswers = [...answers, { questionId: currentQuestion.id, selectedIndex: finalSelection }];
    setAnswers(newAnswers);

    if (isLastQuestion) {
        playCompletionSound();
        clearSession();
        onComplete(newAnswers);
    } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
        // Timer resets in useEffect
    }
  };

  const handleSubmitAnswer = () => {
    if (isExamMode) {
        handleExamModeSubmit();
    } else {
        setShowFeedback(true);
        setIsTimerActive(false);
    }
  };

  const handleNext = () => {
    // This is primarily for "Feedback Mode" where user explicitly clicks "Next Question"
    // In Exam Mode, handleSubmitAnswer handles progression.
    if (!showFeedback) { 
        // Fallback safety if triggered weirdly
        handleSubmitAnswer();
    } else {
        const finalSelection = selectedOption !== null ? selectedOption : -1;
        const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuestion.id);
        let newAnswers = [...answers];
        
        if (existingAnswerIndex === -1) {
             newAnswers.push({ questionId: currentQuestion.id, selectedIndex: finalSelection });
        }
        
        setAnswers(newAnswers);

        if (isLastQuestion) {
          playCompletionSound();
          clearSession(); // Clear storage
          onComplete(newAnswers);
        } else {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setShowFeedback(false);
        }
    }
  };

  const handleQuit = () => {
      clearSession(); // Clear storage
      onCancel();
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Expanded Image Modal */}
      {expandedImage && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in" onClick={() => setExpandedImage(null)}>
             <button className="absolute top-4 right-4 text-white hover:text-red-400 p-2 rounded-full bg-white/10 backdrop-blur-sm">
                 <X className="w-8 h-8" />
             </button>
             <img src={expandedImage} alt="Expanded diagram" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" />
         </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 mb-1">{subject} Quiz</h2>
            {initialProgress && isFirstRender.current && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Resumed</span>}
            {isExamMode && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">Exam Mode</span>}
          </div>
          <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${getTimerColor()}`}
              role="timer"
              aria-live="polite"
              aria-label={`Time remaining: ${formatTime(questionTimeLeft)}`}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xl font-mono tabular-nums" aria-hidden="true">{formatTime(questionTimeLeft)}</span>
            </div>
          </div>
          
          <button 
            onClick={handleQuit} 
            className="text-xs text-gray-400 hover:text-red-500 underline pr-1"
            aria-label="Quit current quiz"
          >
            Quit Quiz
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div 
        className="w-full bg-gray-200 rounded-full h-2.5 mb-8"
        role="progressbar"
        aria-valuenow={Math.round(((currentQuestionIndex) / questions.length) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quiz progress: ${currentQuestionIndex} of ${questions.length} questions completed`}
      >
        <div 
          className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
          style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 relative overflow-hidden">
        {/* Timer bar at top of card */}
        <div 
           className={`absolute top-0 left-0 h-1 transition-all duration-1000 ease-linear ${questionTimeLeft < 10 ? 'bg-red-500' : 'bg-green-400'}`}
           style={{ width: `${(questionTimeLeft / totalQuestionTime) * 100}%` }}
        />

        {/* Generated Image/Illustration */}
        {currentQuestion.imageUrl && (
            <div className="mb-6 relative group">
                <div 
                    className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden cursor-zoom-in"
                    onClick={() => setExpandedImage(currentQuestion.imageUrl || null)}
                >
                    <img 
                        src={currentQuestion.imageUrl} 
                        alt="Question illustration" 
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
                <button 
                    onClick={() => setExpandedImage(currentQuestion.imageUrl || null)}
                    className="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm text-gray-600 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
            </div>
        )}

        <h3 className="text-xl font-medium text-gray-900 mb-6 leading-relaxed">
          {formatText(currentQuestion.text)}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            let buttonStyle = "border-gray-200 hover:border-green-400 hover:bg-green-50";
            let icon = null;

            if (showFeedback && !isExamMode) {
              if (idx === currentQuestion.correctAnswerIndex) {
                buttonStyle = "border-green-500 bg-green-50 text-green-900 font-medium";
                icon = <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />;
              } else if (idx === selectedOption) {
                buttonStyle = "border-red-500 bg-red-50 text-red-900";
                icon = <XCircle className="w-5 h-5 text-red-500 ml-auto" />;
              } else {
                buttonStyle = "border-gray-100 opacity-50";
              }
            } else if (selectedOption === idx) {
              buttonStyle = "border-green-600 bg-green-50 ring-1 ring-green-600";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={showFeedback && !isExamMode}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center ${buttonStyle}`}
                aria-label={`Option ${String.fromCharCode(65 + idx)}: ${option}`}
                aria-pressed={selectedOption === idx}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 mr-4">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-grow">{formatText(option)}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {showFeedback && !isExamMode && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100 animate-fade-in">
            <p className="text-sm font-semibold text-green-900 mb-1">Explanation:</p>
            <p className="text-sm text-green-800">
               {formatText(currentQuestion.explanation)}
            </p>
            {selectedOption === -1 && (
                <p className="text-sm text-red-600 mt-2 font-medium">Time expired for this question.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end">
        {isExamMode ? (
            <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md flex items-center gap-2"
                aria-label={isLastQuestion ? "Finish Exam" : "Next Question"}
            >
                {isLastQuestion ? 'Finish Exam' : 'Next Question'}
                {!isLastQuestion && <ArrowRight className="w-4 h-4" />}
            </button>
        ) : (
            !showFeedback ? (
            <button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                aria-label="Check your answer"
            >
                Check Answer
            </button>
            ) : (
            <button
                onClick={handleNext}
                className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 flex items-center gap-2 transition-colors shadow-md"
                aria-label={isLastQuestion ? "Finish Quiz" : "Go to next question"}
            >
                {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                <ArrowRight className="w-4 h-4" />
            </button>
            )
        )}
      </div>
    </div>
  );
};

export default QuizInterface;
