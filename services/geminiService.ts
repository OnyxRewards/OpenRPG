import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const examineObject = async (objectName: string, context: string): Promise<string> => {
  if (!process.env.API_KEY) {
    return "The gods (API Key) are silent.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a witty, single-sentence "Examine" text for a ${objectName} in an Old School RuneScape style game. 
      Context: ${context}. 
      Keep it under 15 words. 
      Do not include quotes.
      Examples: 
      - "It's a tree."
      - "A sturdy looking obstacle."
      - "I wonder what's growing in here?"`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for speed
      }
    });

    return response.text || `It is a ${objectName}.`;
  } catch (error) {
    console.error("Gemini Examine Error:", error);
    return `It appears to be a ${objectName}.`;
  }
};
