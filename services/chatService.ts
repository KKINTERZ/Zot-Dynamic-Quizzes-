import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are the ZOT Assistant, a helpful AI support agent for the 'ZOT Dynamic Quizzes' application.

APP INFORMATION:
- Name: ZOT Dynamic Quizzes
- Purpose: To help Zambian students (Primary, Junior Secondary, Senior Secondary) prepare for ECZ exams.
- Managed By: Digital Mastery Works.
- Developers: KK Interz (Frontend/Backend) and Athan Tembo (Graphics/UI).

KEY FEATURES TO EXPLAIN:
1. Dynamic Quizzes: Generates unique questions using AI based on the Zambian syllabus.
2. Live Tutor: An interactive oral exam mode where students speak to an AI examiner.
3. Deep Explain: A feature in the Results view that provides detailed, step-by-step explanations for answers using a Virtual Tutor.
4. Quiz History: Tracks past performance so students can review their progress.
5. PDF Reports: Users can download comprehensive performance reports.
6. Real-time Clock: A millisecond-accurate clock to help students manage time.
7. Dark Mode: Support for light and dark themes.

TONE:
- Friendly, encouraging, and professional.
- Keep answers concise and easy to read.
- If asked about non-app topics, politely steer back to the app or education.
- Use formatting (bullet points, bold text) to make answers clear.
`;

export const getChatResponse = async (history: ChatMessage[], userMessage: string): Promise<string> => {
  try {
    // Construct the conversation history for the model
    const pastContent = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...pastContent,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text || "I didn't get a response. Please try again.";
  } catch (error) {
    console.error("ZOT Assistant Error:", error);
    return "I'm having trouble connecting to the server. Please check your internet connection and try again.";
  }
};