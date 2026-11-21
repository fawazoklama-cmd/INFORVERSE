import { GoogleGenAI, Type } from '@google/genai';
import { dbStore } from '../db/store';
import type { Language } from '../../src/types/inforverse';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment variables.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface AiAnalysisResult {
  aiTitle: string;
  summary: string;
  detectedLanguage: Language;
  categorySlug: string;
  countryCode: string;
  keywords: string[];
  containsUnverifiedClaims: boolean;
  sensitiveTopicFlag: boolean;
  translatedTitle: string;
  translatedSummary: string;
  translatedContent: string;
  tokensUsed: number;
}

export async function analyzeAndSummarizeSource(input: {
  rawTitle: string;
  rawText: string;
  sourceName: string;
  sourceUrl: string;
  targetSummaryLength?: 'short' | 'medium' | 'detailed';
}): Promise<AiAnalysisResult> {
  const ai = getGeminiClient();
  const settings = dbStore.getAutomationSettings();
  const categories = dbStore.getCategories().map((c) => c.slug).join(', ');
  const countries = dbStore.getCountries().map((c) => `${c.code} (${c.name_en})`).join(', ');
  const lengthHint =
    (input.targetSummaryLength || settings.summary_length) === 'short'
      ? '2 concise sentences'
      : (input.targetSummaryLength || settings.summary_length) === 'detailed'
        ? '4 to 5 well-structured sentences'
        : '3 clear factual sentences';

  const systemInstruction = `${settings.ai_system_prompt}
Rules:
- Never fabricate facts, quotes, statistics, or locations not explicitly present in the provided source text.
- Clearly distinguish claims or allegations from verified facts.
- Produce both the primary summary in the detected language ('en' or 'id') AND an accurate translation into the opposite language ('id' if source is 'en', or 'en' if source is 'id').
- Choose categorySlug strictly from: [${categories}].
- Choose countryCode strictly from: [${countries}] or 'US' / 'ID' / 'GB' if clearly applicable, otherwise 'US'.
- Flag sensitiveTopicFlag=true if topic involves conflict, disaster, health emergency, or national security.`;

  const prompt = `Source Name: ${input.sourceName}
Source URL: ${input.sourceUrl}
Original Title: ${input.rawTitle}
Source Content:
${input.rawText.slice(0, 6000)}

Summarize in ${lengthHint} and return structured metadata.`;

  const response = await ai.models.generateContent({
    model: settings.ai_model || 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          aiTitle: { type: Type.STRING, description: 'Clear, factual, non-sensational headline.' },
          summary: { type: Type.STRING, description: 'Factual summary in detected source language.' },
          detectedLanguage: { type: Type.STRING, description: "Either 'en' or 'id'." },
          categorySlug: { type: Type.STRING, description: 'Best matching category slug.' },
          countryCode: { type: Type.STRING, description: 'Two-letter ISO country code.' },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3 to 6 SEO keywords.' },
          containsUnverifiedClaims: { type: Type.BOOLEAN },
          sensitiveTopicFlag: { type: Type.BOOLEAN },
          translatedTitle: { type: Type.STRING, description: 'Accurate translation of aiTitle into the paired language.' },
          translatedSummary: { type: Type.STRING, description: 'Accurate translation of summary into the paired language.' },
          translatedContent: { type: Type.STRING, description: 'Accurate multi-paragraph summary expansion in the paired language based strictly on source text.' },
        },
        required: [
          'aiTitle',
          'summary',
          'detectedLanguage',
          'categorySlug',
          'countryCode',
          'keywords',
          'containsUnverifiedClaims',
          'sensitiveTopicFlag',
          'translatedTitle',
          'translatedSummary',
          'translatedContent',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim()) as Omit<AiAnalysisResult, 'tokensUsed'>;
  const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
  dbStore.addTokenUsage(tokensUsed);

  return {
    ...parsed,
    detectedLanguage: parsed.detectedLanguage === 'id' ? 'id' : 'en',
    tokensUsed,
  };
}

export async function translateTextWithGemini(input: {
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  targetLanguage: Language;
}): Promise<{
  title: string;
  subtitle: string;
  summary: string;
  content: string;
  tokensUsed: number;
}> {
  const ai = getGeminiClient();
  const settings = dbStore.getAutomationSettings();
  const targetLangName = input.targetLanguage === 'id' ? 'Indonesian (Bahasa Indonesia)' : 'English';

  const response = await ai.models.generateContent({
    model: settings.ai_model || 'gemini-4-hydrogen',
    contents: `Translate the following editorial article accurately into ${targetLangName}. Preserve all facts, names, dates, and cautious qualifiers without adding or removing information.\n\nTitle: ${input.title}\nSubtitle: ${input.subtitle}\nSummary: ${input.summary}\nContent:\n${input.content}`,
    config: {
      systemInstruction:
        'You are a professional newsroom translator. Preserve factual accuracy, dates, numbers, and source attributions exactly.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          content: { type: Type.STRING },
        },
        required: ['title', 'subtitle', 'summary', 'content'],
      },
    },
  });

  const parsed = JSON.parse((response.text || '{}').trim()) as {
    title: string;
    subtitle: string;
    summary: string;
    content: string;
  };
  const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
  dbStore.addTokenUsage(tokensUsed);

  return { ...parsed, tokensUsed };
}
