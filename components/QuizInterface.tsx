import React, { useState, useEffect, useRef } from 'react';
import { Question, Subject } from '../types';
import { generateTTS } from '../services/geminiService';
import { CheckCircle, XCircle, ArrowRight, Timer, Clock, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface QuizInterfaceProps {
  subject: Subject;
  questions: Question[];
  onComplete: (answers: { questionId: number; selectedIndex: number }[]) => void;
  onCancel: () => void;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ subject, questions, onComplete, onCancel }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<{ questionId: number; selectedIndex: number }[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Timer State
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [totalQuestionTime, setTotalQuestionTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);

  // TTS State
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Audio Context for Ticking Sound
  const tickAudioCtxRef = useRef<AudioContext | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Calculate dynamic time based on question length
  const calculateTimeForQuestion = (question: Question) => {
    const textLength = question.text.length;
    const wordCount = question.text.split(' ').length;
    
    // Base time of 30 seconds + 1.5 second per word
    // Math subjects usually need more calculation time
    let calculatedTime = 30 + Math.ceil(wordCount * 1.5);

    // Adjust for options length too
    const optionsLength = question.options.join(' ').length;
    calculatedTime += Math.ceil(optionsLength / 10);

    // Minimum 45 seconds, Maximum 300 seconds (5 minutes)
    return Math.max(45, Math.min(300, calculatedTime));
  };

  // Helper for rendering math superscripts (e.g. 2^3 -> 2³) and subscripts (H_2O -> H₂O)
  const formatText = (text: string) => {
    if (!text) return "";
    // Regex matches ^ or _ followed by:
    // 1. (parentheses group)
    // 2. {curly braces group}
    // 3. or alphanumeric sequence (including negative numbers like -5)
    const parts = text.split(/([_^](?:\([^)]+\)|\{[^}]+\}|-?\d+|[a-zA-Z0-9]+))/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('^')) {
        let content = part.substring(1);
        // Strip outer parens/braces if present
        if ((content.startsWith('(') && content.endsWith(')')) || 
            (content.startsWith('{') && content.endsWith('}'))) {
          content = content.substring(1, content.length - 1);
        }
        return <sup key={index} className="text-xs align-super font-semibold">{content}</sup>;
      }
      if (part.startsWith('_')) {
        let content = part.substring(1);
        // Strip outer parens/braces if present
        if ((content.startsWith('(') && content.endsWith(')')) || 
            (content.startsWith('{') && content.endsWith('}'))) {
          content = content.substring(1, content.length - 1);
        }
        return <sub key={index} className="text-xs align-sub font-semibold">{content}</sub>;
      }
      // Render normal text
      return <span key={index}>{part}</span>;
    });
  };

  // Reset timer when question changes
  useEffect(() => {
    if (currentQuestion) {
      const time = calculateTimeForQuestion(currentQuestion);
      setTotalQuestionTime(time);
      setQuestionTimeLeft(time);
      setIsTimerActive(true);
    }
  }, [currentQuestionIndex, currentQuestion]);

  // Cleanup TTS audio on unmount
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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
        // Critical Phase (5s - 1s): Sharper tone, rising pitch, louder volume
        osc.type = 'triangle'; // Sharper than sine
        // Pitch rises as time decreases: 1000Hz -> 1400Hz
        const pitch = 1000 + ((6 - questionTimeLeft) * 100); 
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        
        // Volume ramps up significantly: 0.2 -> 0.8
        const volume = 0.2 + ((5 - questionTimeLeft) * 0.15);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      } else {
        // Warning Phase (10s - 6s): Softer "woodblock" click
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
    if (showFeedback) {
        // Use a temporary context for immediate feedback sound
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const isCorrect = selectedOption === currentQuestion.correctAnswerIndex;
        
        if (isCorrect) {
            // CORRECT: Loud High Pitch Chime
            osc.type = 'sine'; 
            // Start high (1500Hz) and go higher (2500Hz) to sound like a "ding!"
            osc.frequency.setValueAtTime(1500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.1);
            
            // High Volume (0.8)
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05); 
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } else {
            // WRONG: Loud Distinct Buzzer
            osc.type = 'sawtooth'; // Sawtooth cuts through mix better
            // Start mid-low (400Hz) and drop (150Hz)
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
            
            // High Volume (0.8)
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.4);
        }
        
        // Cleanup context shortly after
        setTimeout(() => {
            if(ctx.state !== 'closed') ctx.close();
        }, 600);
    }
  }, [showFeedback, selectedOption, currentQuestion]);

  // Helper to decode base64 audio
  const decodeAudio = (base64String: string): Uint8Array => {
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
  };

  // TTS Logic using Gemini API
  useEffect(() => {
    const playTTS = async () => {
       if (!ttsEnabled || showFeedback || !isTimerActive || !currentQuestion) {
           // Stop any playing audio
           if (audioSourceRef.current) {
               try { audioSourceRef.current.stop(); } catch (e) {}
           }
           setIsPlayingAudio(false);
           return;
       }

       setIsLoadingAudio(true);
       // TTS text should be plain for better reading
       const textToRead = `Question ${currentQuestionIndex + 1}. ${currentQuestion.text}. Option A. ${currentQuestion.options[0]}. Option B. ${currentQuestion.options[1]}. Option C. ${currentQuestion.options[2]}. Option D. ${currentQuestion.options[3]}.`;

       const base64Audio = await generateTTS(textToRead);
       setIsLoadingAudio(false);

       if (base64Audio) {
           if (!audioContextRef.current) {
               audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
           }
           const ctx = audioContextRef.current;
           
           const audioBytes = decodeAudio(base64Audio);
           
           try {
               const dataInt16 = new Int16Array(audioBytes.buffer);
               const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
               const channelData = buffer.getChannelData(0);
               for(let i=0; i<dataInt16.length; i++) {
                   channelData[i] = dataInt16[i] / 32768.0;
               }

               const source = ctx.createBufferSource();
               source.buffer = buffer;
               source.connect(ctx.destination);
               source.onended = () => setIsPlayingAudio(false);
               
               audioSourceRef.current = source;
               source.start();
               setIsPlayingAudio(true);

           } catch (e) {
               console.error("Audio playback failed", e);
           }
       }
    };

    playTTS();

    return () => {
        if (audioSourceRef.current) {
            try { audioSourceRef.current.stop(); } catch (e) {}
        }
    };
  }, [currentQuestionIndex, ttsEnabled, currentQuestion]); // Re-run when question changes

  const toggleTts = () => {
    setTtsEnabled(!ttsEnabled);
  };

  const handleTimeout = () => {
    setIsTimerActive(false);
    if (selectedOption === null) {
       const newAnswers = [...answers, { questionId: currentQuestion.id, selectedIndex: -1 }];
       setAnswers(newAnswers);
       setShowFeedback(true);
    } else {
       handleSubmitAnswer();
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
    if (showFeedback) return; 
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    setShowFeedback(true);
    setIsTimerActive(false);
  };

  const handleNext = () => {
    if (!showFeedback) { 
        const finalSelection = selectedOption !== null ? selectedOption : -1;
        const newAnswers = [...answers, { questionId: currentQuestion.id, selectedIndex: finalSelection }];
        setAnswers(newAnswers);
        if (isLastQuestion) {
             onComplete(newAnswers);
             return;
        }
    } else {
        const finalSelection = selectedOption !== null ? selectedOption : -1;
        const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuestion.id);
        let newAnswers = [...answers];
        
        if (existingAnswerIndex === -1) {
             newAnswers.push({ questionId: currentQuestion.id, selectedIndex: finalSelection });
        }
        
        setAnswers(newAnswers);

        if (isLastQuestion) {
          onComplete(newAnswers);
        } else {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setShowFeedback(false);
        }
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">{subject} Quiz</h2>
          <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {/* TTS Toggle */}
            <button 
              onClick={toggleTts}
              className={`p-2 rounded-lg border transition-all duration-200 flex items-center gap-2 ${ttsEnabled ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}
              title={ttsEnabled ? "Turn off AI Reader" : "Turn on AI Reader"}
            >
              {isLoadingAudio ? <Loader2 className="w-5 h-5 animate-spin" /> : 
               ttsEnabled ? <Volume2 className={`w-5 h-5 ${isPlayingAudio ? 'animate-pulse' : ''}`} /> : <VolumeX className="w-5 h-5" />
              }
              <span className="text-xs font-semibold hidden sm:inline">{ttsEnabled ? 'Reader ON' : 'Reader OFF'}</span>
            </button>

            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${getTimerColor()}`}>
              <Clock className="w-5 h-5" />
              <span className="text-xl font-mono tabular-nums">{formatTime(questionTimeLeft)}</span>
            </div>
          </div>
          
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-red-500 underline pr-1">
            Quit Quiz
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
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

        <h3 className="text-xl font-medium text-gray-900 mb-6 leading-relaxed">
          {formatText(currentQuestion.text)}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            let buttonStyle = "border-gray-200 hover:border-green-400 hover:bg-green-50";
            let icon = null;

            if (showFeedback) {
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
                disabled={showFeedback}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center ${buttonStyle}`}
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

        {showFeedback && (
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
        {!showFeedback ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 flex items-center gap-2 transition-colors shadow-md"
          >
            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizInterface;