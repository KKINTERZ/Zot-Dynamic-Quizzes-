import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Subject, Question, EducationLevel } from "../types";

// Initialize the client. API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGenAIClient = () => ai;

/**
 * Maps the generic EducationLevel to specific ECZ Grade levels for better prompt context.
 */
const getECZGradeContext = (level: EducationLevel): string => {
  switch (level) {
    case EducationLevel.Primary: return "Grade 7 (Primary Level)";
    case EducationLevel.JuniorSecondary: return "Grade 9 (Junior Secondary Level)";
    case EducationLevel.SeniorSecondary: return "Grade 12 (Senior Secondary O-Level)";
    default: return "Grade 12";
  }
};

/**
 * Generates a quiz based on the subject, level, question count, optional custom context, and specific topic.
 * Uses gemini-2.5-flash for stable responses.
 */
export const generateQuiz = async (
  subject: Subject, 
  level: EducationLevel,
  questionCount: number, 
  customContext?: string,
  topic?: string
): Promise<Question[]> => {
  // Switched to gemini-2.5-flash as flash-lite caused 404 errors
  const modelName = 'gemini-2.5-flash';
  const eczContext = getECZGradeContext(level);

  let prompt = `You are an expert examiner for the Examinations Council of Zambia (ECZ). 
  Generate a multiple-choice quiz consisting of exactly ${questionCount} questions for the subject: ${subject}.
  The target audience is students at the ${eczContext}.
  The questions should accurately reflect the style, format, vocabulary, and difficulty of typical ECZ past papers for this specific grade level.
  `;

  if (customContext) {
    prompt += `\n\nUse the following text from a study document or past paper as the PRIMARY source for these questions:\n"${customContext}"\n`;
  } else if (topic && topic !== "General / All Topics") {
    prompt += `\n\nFocus the questions specifically on the topic: "${topic}". Ensure comprehensive coverage of sub-topics within this area suitable for ${eczContext}.`;
  } else {
    prompt += `\n\nDraw upon your knowledge of the standard Zambian ECZ syllabus for ${eczContext}. Ensure questions cover a mixed range of key topics typically examined in the final exam.`;
  }

  prompt += `\n\nProvide a brief explanation for the correct answer.`;

  try {
    // Using abbreviated keys (q, o, a, e) in the schema to minimize token usage 
    // and reduce the likelihood of RPC errors when generating a large number of questions.
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quiz_questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  q: { type: Type.STRING },
                  o: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }
                  },
                  a: { 
                    type: Type.INTEGER, 
                  },
                  e: { type: Type.STRING }
                },
                required: ["q", "o", "a", "e"]
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      const questionsRaw = data.quiz_questions || [];
      
      // Map the abbreviated schema back to our internal Question interface
      return questionsRaw.map((q: any, idx: number) => ({
        id: idx,
        text: q.q,
        options: q.o,
        correctAnswerIndex: q.a,
        explanation: q.e
      }));
    }
    
    throw new Error("No content generated");

  } catch (error) {
    console.error("Failed to generate quiz:", error);
    throw error;
  }
};

/**
 * FEATURE: Think more when needed.
 * Uses gemini-3-pro-preview with thinking budget to provide deep explanations.
 */
export const getDeepExplanation = async (
    subject: string,
    question: string,
    correctOption: string
): Promise<string> => {
  const modelName = 'gemini-3-pro-preview';
  
  const prompt = `
    Context: I am a Zambian student studying ${subject}.
    Question: ${question}
    Correct Answer: ${correctOption}
    
    Please provide a deep, step-by-step explanation of why this is the correct answer. 
    Break down the concept logic clearly. If it involves calculations, show every step. 
    Explain why other potential answers might be wrong if applicable. 
    Act like a senior tutor.
  `;

  try {
    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 } 
            // Do not set maxOutputTokens as per guidelines
        }
    });
    
    return response.text || "Could not generate detailed explanation.";
  } catch (e) {
    console.error("Thinking mode error:", e);
    return "Sorry, I couldn't generate a deep explanation at this time.";
  }
};

/**
 * FEATURE: Generate speech (TTS)
 * Uses gemini-2.5-flash-preview-tts
 */
export const generateTTS = async (text: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (e) {
        console.error("TTS Generation error:", e);
        return null;
    }
};

/**
 * FEATURE: Use Google Search data
 * Uses gemini-2.5-flash with googleSearch tool
 */
export const getSubjectTrends = async (subject: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `What are the most common topics and recent trends in the Zambian ECZ ${subject} exams for Grade 12 (O Level) based on recent years (2023-2024)? Summarize key areas to focus on.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        return response.text || "No trends found.";
    } catch (e) {
        console.error("Search grounding error:", e);
        return "Could not retrieve exam trends at this moment.";
    }
};