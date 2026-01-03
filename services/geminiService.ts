
import { GoogleGenAI, Modality, Type, LiveServerMessage, GenerateContentResponse } from "@google/genai";
import { TeachingMode, Unit, Lesson, TeachingStep, LessonSummary, ExamQuestion, SkillType, FeedbackResult } from "../types";

// Helper function to decode base64 to Uint8Array as per guidelines
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to encode Uint8Array to base64 as per guidelines
export function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to decode raw PCM audio data into an AudioBuffer as per guidelines
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class TeacherService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRateLimit = error?.status === 429 || 
                          error?.message?.includes('429') || 
                          error?.message?.includes('RESOURCE_EXHAUSTED') ||
                          error?.message?.includes('quota');
                          
        if (isRateLimit && i < maxRetries) {
          const delay = baseDelay * Math.pow(2, i);
          console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async generateLessonScript(unit: Unit, lesson: Lesson, mode: TeachingMode): Promise<TeachingStep[]> {
    const bilingualInstruction = mode === TeachingMode.ARABIC 
      ? "In this mode, teach using 'Sandwich Method': English first, then Arabic. Example: 'Today we learn about artifacts, يعني القطع الأثرية'."
      : "Speak exclusively in English.";

    const prompt = `You are Miss Nour teaching Egyptian Primary 6. 
    Topic: Unit ${unit.id} (${unit.title}), Lesson: ${lesson.title}. 
    Vocabulary: ${lesson.vocabulary.join(', ')}.
    ${bilingualInstruction}
    Generate 10 steps in JSON. 
    Steps 1-6: Teaching & vocabulary.
    Steps 7-10: MUST BE 'Book Exercises' (تدريبات الكتاب). These are questions for the student to answer out loud to you.
    For exercises, the student will read the question to you live.`;
    
    const response: GenerateContentResponse = await this.withRetry(() => this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              content: { type: Type.STRING },
              instruction: { type: Type.STRING },
              audioText: { type: Type.STRING },
              isQuestion: { type: Type.BOOLEAN },
              correctAnswer: { type: Type.STRING }
            },
            required: ["type", "content", "instruction", "audioText"]
          }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  }

  async generateSummary(lesson: Lesson): Promise<LessonSummary> {
    const prompt = `Generate a lesson summary for a Grade 6 student. Lesson: ${lesson.title}. 
    Return JSON.`;
    
    const response: GenerateContentResponse = await this.withRetry(() => this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vocabularyLearned: { type: Type.ARRAY, items: { type: Type.STRING } },
            homeActivity: { type: Type.STRING },
            encouragement: { type: Type.STRING }
          },
          required: ["vocabularyLearned", "homeActivity", "encouragement"]
        }
      }
    }));
    return JSON.parse(response.text || '{}');
  }

  async generateExam(unit: Unit): Promise<ExamQuestion[]> {
    const prompt = `Generate a skills exam for Grade 6 Egypt Unit: ${unit.title}. Return JSON array.`;
    const response: GenerateContentResponse = await this.withRetry(() => this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              skill: { type: Type.STRING },
              question: { type: Type.STRING },
              instruction: { type: Type.STRING },
              correctAnswer: { type: Type.STRING }
            },
            required: ["skill", "question", "instruction"]
          }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  }

  async connectLive(onMessage: (msg: LiveServerMessage) => void, onOpen: () => void) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: onOpen,
        onmessage: onMessage,
        onerror: (e) => console.error("Live Error", e),
        onclose: () => console.log("Live Closed"),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        systemInstruction: `You are Miss Nour, an interactive Egyptian English teacher. 
        Current Goal: Practice book exercises (تدريبات الكتاب). 
        Method: 
        1. Always speak English first. 
        2. Listen to the student reading the question from the screen.
        3. Correct their pronunciation or grammar kindly. 
        4. If they answer incorrectly, explain why using English first, then a short Arabic explanation.
        5. Be extremely encouraging and warm.`,
      }
    });
  }

  async speak(text: string): Promise<AudioBuffer | null> {
    try {
      const response: GenerateContentResponse = await this.withRetry(() => this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      }));
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return await decodeAudioData(decodeBase64(base64Audio), audioCtx, 24000, 1);
    } catch (e) {
      console.error("TTS failed:", e);
      return null;
    }
  }
}

export const teacherService = new TeacherService();
