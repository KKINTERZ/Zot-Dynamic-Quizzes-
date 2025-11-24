import React, { useState, useRef, useEffect } from 'react';
import { getGenAIClient } from '../services/geminiService';
import { LiveServerMessage, Modality, Blob, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, Loader2, Volume2, BrainCircuit, AlertCircle, Clock } from 'lucide-react';

interface LiveTutorProps {
  onClose: () => void;
  selectedVoice: string;
}

const LiveTutor: React.FC<LiveTutorProps> = ({ onClose, selectedVoice }) => {
  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<string>('Initializing...');
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Idle Timer State
  const [idleWarning, setIdleWarning] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Audio Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Queue management for smooth playback
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session Promise Ref
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    startSession();

    return () => {
      disconnectSession();
    };
  }, []);

  // Idle Check Timer
  useEffect(() => {
    if (!connected) {
        lastActivityRef.current = Date.now(); // Reset activity if not connected
        return;
    }

    const timer = setInterval(() => {
        const now = Date.now();
        const elapsed = now - lastActivityRef.current;
        
        // 90 seconds timeout (disconnect)
        if (elapsed > 90000) {
             setDisconnectMessage("Session ended due to inactivity (90s).");
             disconnectSession();
        } 
        // 60 seconds warning
        else if (elapsed > 60000) {
             setIdleWarning(true);
        } else {
             setIdleWarning(false);
        }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [connected]);

  const startSession = async () => {
    try {
      setDisconnectMessage(null);
      setStatus('Requesting Microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      setStatus('Connecting to Live Tutor...');
      const ai = getGenAIClient();

      // Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const endSessionTool: FunctionDeclaration = {
        name: "endSession",
        description: "Ends the quiz session. Call this function immediately after providing the final summary and saying goodbye."
      };

      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          tools: [{ functionDeclarations: [endSessionTool] }],
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: `You are the ZOT Virtual Quiz Master, an oral examiner for the Zambian ECZ syllabus.
          
          Your goal is to conduct a short real-time oral quiz consisting of EXACTLY 5 QUESTIONS.
          
          PROTOCOL:
          1. Start by enthusiastically welcoming the user to the "ZOT Live Quiz".
          2. ASK the user for their Education Level (Primary, Junior Secondary, or Senior Secondary). Wait for their response.
          3. Once the level is established, ASK for the Subject they wish to attempt. Wait for response.
          4. ASK for a specific Topic (or they can choose 'General'). Wait for response.
          5. BEGIN THE QUIZ (Limit to 5 Questions):
             - Ask ONE multiple-choice question at a time based on the agreed Level, Subject, and Topic.
             - Read the Question and Options A, B, C, D clearly.
             - Wait for the user to speak their answer.
             - Evaluate the answer. Tell them if they are "Correct" or "Incorrect".
             - If incorrect, provide a very brief (1 sentence) explanation of the right answer.
             - Track the number of questions asked.
             - After the answer to question 5 is evaluated, DO NOT ask another question.
          
          6. END SESSION:
             - After the 5th question is completed, provide a summary of their performance (e.g., "You got 3 out of 5 correct").
             - Give a final encouraging remark and say "Goodbye".
             - IMMEDIATELY call the 'endSession' tool to close the connection.
          
          Keep the pace fast and energetic. Do not lecture. Focus on testing knowledge.`
        },
        callbacks: {
          onopen: () => {
            setStatus('Connected. Say "Hello"!');
            setConnected(true);
            lastActivityRef.current = Date.now(); // Reset activity timer on connect
            setupAudioInput(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              playAudioResponse(base64Audio);
            }

            // Handle Tool Calls (e.g., endSession)
            if (message.toolCall?.functionCalls?.some(fc => fc.name === 'endSession')) {
                setStatus('Quiz Complete. Ending session...');
                // Wait for the Goodbye audio to likely finish (e.g. 5 seconds) before closing
                setTimeout(() => {
                    onClose();
                }, 5000);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
               stopAllAudio();
            }
          },
          onclose: () => {
            setStatus('Disconnected');
            setConnected(false);
          },
          onerror: (e) => {
            console.error("Live Service Error", e);
            setStatus('Connection Error');
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error('Failed to start live session', err);
      setStatus('Failed to connect. Please check permissions.');
    }
  };

  const setupAudioInput = (stream: MediaStream, sessionPromise: Promise<any>) => {
     if (!inputAudioContextRef.current) return;
     
     const ctx = inputAudioContextRef.current;
     const source = ctx.createMediaStreamSource(stream);
     const processor = ctx.createScriptProcessor(4096, 1, 1);
     
     processor.onaudioprocess = (e) => {
        if (isMuted) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for visualizer
        let sum = 0;
        for(let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        const avg = sum / inputData.length;
        setAudioLevel(avg);

        // Activity Detection
        // Threshold of 0.01 ensures background noise doesn't count as activity
        if (avg > 0.01) {
            lastActivityRef.current = Date.now();
        }

        const pcmBlob = createBlob(inputData);
        
        sessionPromise.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
        });
     };

     source.connect(processor);
     processor.connect(ctx.destination); // Needed for script processor to run
     
     inputSourceRef.current = source;
     processorRef.current = processor;
  };

  // --- Audio Helpers ---

  function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    
    // Encode raw PCM to base64
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
      data: b64,
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  function decodeBase64(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function playAudioResponse(base64Audio: string) {
     if (!outputAudioContextRef.current) return;
     const ctx = outputAudioContextRef.current;
     
     // Time tracking for gapless playback
     nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

     try {
        const audioBytes = decodeBase64(base64Audio);
        
        // Manually decode PCM 24kHz (from model) to AudioBuffer
        // Data is Int16
        const dataInt16 = new Int16Array(audioBytes.buffer);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for(let i=0; i<dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        source.onended = () => {
            sourcesRef.current.delete(source);
        };
        
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += buffer.duration;
        sourcesRef.current.add(source);

     } catch (e) {
         console.error("Audio decode error", e);
     }
  }

  function stopAllAudio() {
      sourcesRef.current.forEach(source => {
          try { source.stop(); } catch(e) {}
      });
      sourcesRef.current.clear();
      if (outputAudioContextRef.current) {
          nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
      }
  }

  const disconnectSession = () => {
     if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            // session.close() is not strictly available on the type but generally handled by closing WS
        });
     }

     if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
     }
     if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
     }
     if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
     }
     
     setConnected(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
       
       {/* Session Timeout Overlay */}
       {!connected && disconnectMessage && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="bg-gray-800 rounded-2xl p-8 border border-red-500/30 shadow-2xl max-w-md text-center">
                <div className="mx-auto w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                   <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Session Ended</h3>
                <p className="text-gray-300 mb-8">{disconnectMessage}</p>
                <button 
                  onClick={onClose}
                  className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
                >
                  Return to Menu
                </button>
            </div>
         </div>
       )}

       <button 
         onClick={onClose}
         className="absolute top-6 right-6 text-white opacity-70 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
       >
         <X className="w-8 h-8" />
       </button>

       <div className="text-center mb-8 relative">
           <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <BrainCircuit className={`w-8 h-8 ${connected ? 'text-green-500' : 'text-gray-400'}`} />
              Live Quiz Mode
           </h2>
           <p className="text-gray-300 text-lg">Real-time Oral Examination</p>
           
           {/* Idle Warning Banner */}
           {connected && idleWarning && (
             <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-yellow-600/90 text-white px-6 py-2 rounded-full flex items-center gap-2 animate-bounce whitespace-nowrap">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold">Are you still there? Quiz ending soon...</span>
             </div>
           )}
       </div>

       {/* Enhanced Visualizer */}
       <div className="relative w-80 h-80 flex items-center justify-center">
           {/* Multiple pulsating rings */}
           {connected ? (
              <>
               {/* Ring 3 (Outer) */}
               <div className="absolute w-full h-full rounded-full border border-green-500/20 bg-green-500/5 transition-transform duration-100 ease-out"
                    style={{ transform: `scale(${1 + audioLevel * 4})`, opacity: 0.3 + audioLevel }} />
               
               {/* Ring 2 (Middle) */}
               <div className="absolute w-3/4 h-3/4 rounded-full border-2 border-green-400/30 bg-green-400/10 transition-transform duration-75 ease-out"
                    style={{ transform: `scale(${1 + audioLevel * 2.5})`, opacity: 0.5 + audioLevel }} />
               
               {/* Ring 1 (Inner) */}
               <div className="absolute w-1/2 h-1/2 rounded-full bg-green-500/20 transition-transform duration-75 ease-out shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                    style={{ transform: `scale(${1 + audioLevel * 1.5})` }} />
              </>
           ) : (
               // Loading State Ring
               <div className="absolute w-full h-full rounded-full border-4 border-gray-800 border-t-green-600 animate-spin" />
           )}

           {/* Center Icon */}
           <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-colors duration-500 ${connected ? 'bg-gray-800 border-4 border-green-500/50' : 'bg-gray-900 border-4 border-gray-700'}`}>
               {connected ? (
                 <Volume2 className={`w-12 h-12 text-white ${audioLevel > 0.01 ? 'animate-pulse' : ''}`} />
               ) : (
                 <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
               )}
           </div>
       </div>

       <div className="mt-12 font-mono text-green-400 h-8 text-lg font-medium">
           {status}
       </div>

       <div className="mt-8 flex gap-8">
           <button 
             onClick={() => setIsMuted(!isMuted)}
             className={`p-6 rounded-full transition-all transform hover:scale-105 shadow-lg ${isMuted ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-900/50' : 'bg-gray-700 hover:bg-gray-600 ring-4 ring-gray-800'}`}
             title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
           >
               {isMuted ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
           </button>
           
           <button 
             onClick={onClose}
             className="p-6 rounded-full bg-gray-800 hover:bg-red-900/80 group transition-all transform hover:scale-105 shadow-lg ring-4 ring-gray-800 hover:ring-red-900/50"
             title="End Session"
           >
               <X className="w-8 h-8 text-white group-hover:text-red-400" />
           </button>
       </div>
       
       <div className="mt-10 text-gray-400 text-sm max-w-lg text-center space-y-2 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
           <p>1. Say "Hello" to start the session.</p>
           <p>2. Tell the Tutor your <span className="text-green-400 font-bold">Level</span>, <span className="text-green-400 font-bold">Subject</span>, and <span className="text-green-400 font-bold">Topic</span>.</p>
           <p>3. Speak your answers clearly! (5 Questions total)</p>
       </div>
    </div>
  );
};

export default LiveTutor;