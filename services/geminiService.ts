import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Subject, Question, EducationLevel } from "../types";
import { LITERATURE_BOOKS } from "../data/subjectTopics";

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
 * Uses gemini-2.5-flash for standard quizzes, and gemini-3-pro-preview for high-accuracy literature books.
 */
export const generateQuiz = async (
  subject: Subject, 
  level: EducationLevel,
  questionCount: number, 
  customContext?: string,
  topic?: string
): Promise<Question[]> => {
  
  // Determine if we are targeting a specific Literature Book
  // We need higher accuracy for specific book plots/characters to avoid hallucinations
  const isLiteratureBook = topic && LITERATURE_BOOKS.includes(topic);

  // Use gemini-3-pro-preview for literature books for maximum accuracy
  // Use gemini-2.5-flash for everything else for speed and stability
  const modelName = isLiteratureBook ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
  const eczContext = getECZGradeContext(level);

  let prompt = `You are an expert examiner for the Examinations Council of Zambia (ECZ). 
  Generate a multiple-choice quiz consisting of exactly ${questionCount} questions for the subject: ${subject}.
  The target audience is students at the ${eczContext}.
  The questions should accurately reflect the style, format, vocabulary, and difficulty of typical ECZ past papers for this specific grade level.

  FORMATTING INSTRUCTIONS:
  - For mathematical exponents or powers, use the caret symbol ^ (e.g., write 2 to the power of 3 as 2^3, x squared as x^2).
  - For chemical formulas or subscripts, use the underscore symbol _ (e.g., write H2O as H_2O, CO2 as CO_2).
  - Do not use LaTeX formatting like $x^2$. Use simple text with ^ and _ markers.
  `;

  if (customContext) {
    prompt += `\n\nUse the following text from a study document or past paper as the PRIMARY source for these questions:\n"${customContext}"\n`;
  } else if (topic && topic !== "General / All Topics") {
    if (isLiteratureBook) {
        prompt += `\n\nCRITICAL INSTRUCTION: You are generating questions for the specific literary text: "${topic}". 
        
        DEEP RESEARCH & THINKING MODE ENGAGED:
        1. RECALL the exact plot, characters (protagonists, antagonists, minor characters), settings, and key themes of "${topic}".
        2. VERIFY every question and answer against the actual events of the book/play.
        3. Ensure character names are spelled correctly and their relationships are accurate.
        4. Avoid hallucinations. If a specific event did not happen in the book, do not include it.
        
        The questions should test specific knowledge of the text, not just general summaries.
        Focus strictly on: "${topic}".`;
    } else {
        prompt += `\n\nFocus the questions specifically on the topic: "${topic}". Ensure comprehensive coverage of sub-topics within this area suitable for ${eczContext}.`;
    }
  } else {
    prompt += `\n\nDraw upon your knowledge of the standard Zambian ECZ syllabus for ${eczContext}. Ensure questions cover a mixed range of key topics typically examined in the final exam.`;
  }

  prompt += `\n\nProvide a brief explanation for the correct answer.`;

  // Base config for JSON output
  const requestConfig: any = {
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
  };

  // Add Thinking Config for Literature Books to ensure reasoning accuracy
  if (isLiteratureBook) {
     // Maximize thinking budget (32k) for Literature to ensure deep verification of facts against the book content
     requestConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    // Using abbreviated keys (q, o, a, e) in the schema to minimize token usage 
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: requestConfig
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
    Use ^ for powers (e.g. 10^2) and _ for subscripts (e.g. H_2O). 
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
        // Strip formatting characters for TTS so it reads naturally
        const cleanText = text.replace(/[\^_]/g, " ");
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: cleanText }] }],
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