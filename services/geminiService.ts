
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Subject, Question, EducationLevel, Difficulty } from "../types";
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
  questionCount: number | 'Auto', 
  customContext?: string,
  topic?: string,
  difficulty: Difficulty = 'Auto'
): Promise<Question[]> => {
  
  // Determine if we are targeting a specific Literature Book
  // We need higher accuracy for specific book plots/characters to avoid hallucinations
  const isLiteratureBook = topic && LITERATURE_BOOKS.includes(topic);

  // Use gemini-3-pro-preview for literature books for maximum accuracy
  // Use gemini-2.5-flash for everything else for speed and stability
  const modelName = isLiteratureBook ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
  const eczContext = getECZGradeContext(level);

  let quantityInstruction = "";
  if (questionCount === 'Auto') {
      quantityInstruction = "consisting of a random but appropriate number of questions (between 15 and 50) to sufficiently test the topic";
  } else {
      quantityInstruction = `consisting of exactly ${questionCount} questions`;
  }

  let prompt = `You are an expert examiner for the Examinations Council of Zambia (ECZ). 
  Generate a multiple-choice quiz ${quantityInstruction} for the subject: ${subject}.
  The target audience is students at the ${eczContext}.
  The questions should accurately reflect the style, format, vocabulary, and difficulty of typical ECZ past papers for this specific grade level.

  FORMATTING INSTRUCTIONS:
  - For mathematical exponents or powers, use the caret symbol ^ (e.g., write 2 to the power of 3 as 2^3, x squared as x^2).
  - For chemical formulas or subscripts, use the underscore symbol _ (e.g., write H2O as H_2O, CO2 as CO_2).
  - Do not use LaTeX formatting like $x^2$. Use simple text with ^ and _ markers.
  `;

  // Difficulty Logic
  let difficultyInstruction = "";
  switch(difficulty) {
      case 'Simple':
          difficultyInstruction = "The questions should be relatively easy, focusing on basic definitions, recall, and fundamental concepts.";
          break;
      case 'Medium':
          difficultyInstruction = "The questions should be of moderate difficulty, requiring application of concepts and standard problem solving.";
          break;
      case 'Difficulty':
          difficultyInstruction = "The questions should be challenging, requiring critical thinking, complex problem solving, and deep understanding of the subject matter.";
          break;
      case 'Mixed':
          difficultyInstruction = "Create a balanced mix of questions: 30% Simple, 40% Medium, and 30% Difficult/Challenging.";
          break;
      case 'Auto':
      default:
          difficultyInstruction = "The difficulty should match the standard distribution found in actual ECZ final exams for this grade level.";
          break;
  }
  prompt += `\n\nDIFFICULTY SETTING: ${difficultyInstruction}`;

  // Add Specific Language Instruction for Chinese
  if (subject === Subject.Chinese) {
      prompt += `\n\nLANGUAGE INSTRUCTION: For EVERY Chinese character or phrase used in the questions, options, or explanations, you MUST provide the Pinyin pronunciation immediately following it in parentheses.
      Example Format: "你好 (Nǐ hǎo)" or "北京 (Běijīng)".
      Ensure the Pinyin includes correct tone marks.`;
  }

  if (customContext) {
    prompt += `\n\nUse the following provided text as the PRIMARY source material. 
    If the text appears to be a summary of a book (e.g., 'Quills of Desire'), digital notes, or a past paper, base ALL questions strictly on the information provided in this text and your internal knowledge of the specific subject context implied by it.
    
    --- CUSTOM CONTEXT START ---
    "${customContext}"
    --- CUSTOM CONTEXT END ---
    \n`;
  } else if (topic && topic !== "General / All Topics") {
    if (isLiteratureBook) {
        prompt += `\n\nCRITICAL INSTRUCTION: You are generating questions for the specific literary text: "${topic}". 
        
        DEEP RESEARCH & THINKING MODE ENGAGED:
        1. Access your comprehensive internal knowledge base regarding the book/play "${topic}".
        2. RECALL the exact plot, characters (protagonists, antagonists, minor characters), settings, and key themes.
        3. VERIFY every question and answer against the actual events of the book/play.
        4. Ensure character names are spelled correctly and their relationships are accurate.
        5. Avoid hallucinations. If a specific event did not happen in the book, do not include it.
        
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
export const generateTTS = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
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
                        prebuiltVoiceConfig: { voiceName: voiceName },
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
        
        let text = response.text || "No trends found.";
        // Clean up markdown characters (hashes and stars)
        return text.replace(/[#*]/g, '');
    } catch (e) {
        console.error("Search grounding error:", e);
        return "Could not retrieve exam trends at this moment.";
    }
};
