import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  COMPLAINT_CATEGORIES,
  PRIORITY_LEVELS,
  SENTIMENT_TYPES,
  type ComplaintCategory,
  type ComplaintRecord,
  type PriorityLevel,
  type SentimentType,
} from '../src/types/complaint.ts';

export interface GeminiComplaintAnalysis {
  detectedLanguage: 'English' | 'Kannada' | 'Hindi' | 'Other';
  englishTranslation: string;
  category: ComplaintCategory;
  priority: PriorityLevel;
  urgencyScore: number;
  sentiment: SentimentType;
  sentimentReason: string;
  priorityReason: string;
  suggestedResolution: string;
  possibleDuplicateOf: string | null;
  duplicateReason: string | null;
  aiAnalysisStatus: 'gemini' | 'fallback';
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
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

function normalizeCategory(val: unknown): ComplaintCategory {
  if (typeof val === 'string') {
    const match = COMPLAINT_CATEGORIES.find(
      (c) => c.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) return match;
  }
  return 'Other Complaints';
}

function normalizePriority(val: unknown): PriorityLevel {
  if (typeof val === 'string') {
    const match = PRIORITY_LEVELS.find(
      (p) => p.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) return match;
  }
  return 'Medium';
}

function normalizeSentiment(val: unknown): SentimentType {
  if (typeof val === 'string') {
    const match = SENTIMENT_TYPES.find(
      (s) => s.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) return match;
  }
  return 'Concerned';
}

function normalizeLanguage(val: unknown): 'English' | 'Kannada' | 'Hindi' | 'Other' {
  if (val === 'English' || val === 'Kannada' || val === 'Hindi' || val === 'Other') {
    return val;
  }
  return 'English';
}

function deterministicFallbackAnalysis(
  title: string,
  description: string,
  location: string,
  recentOpen: ComplaintRecord[]
): GeminiComplaintAnalysis {
  const combined = `${title} ${description} ${location}`.toLowerCase();

  let category: ComplaintCategory = 'Other Complaints';
  if (/wi-?fi|network|internet|projector|computer|laptop|portal|server|printer|software/.test(combined)) {
    category = 'Technical Issues';
  } else if (/short circuit|spark|electric|power|switchboard|wiring|voltage|shock|transformer|streetlight/.test(combined)) {
    category = 'Electrical Issues';
  } else if (/water|pipe|leak|plumbing|tap|washroom|drain|sewage|toilet/.test(combined)) {
    category = 'Water and Plumbing';
  } else if (/safety|harass|security|gate|cctv|theft|guard|dark|intruder|threat/.test(combined)) {
    category = 'Security and Safety';
  } else if (/hostel|mess|dorm|roommate|warden|bed|canteen|accommodation/.test(combined)) {
    category = 'Hostel and Accommodation';
  } else if (/exam|grade|marks|syllabus|faculty|class|lecture|lab|academic|timetable/.test(combined)) {
    category = 'Academic Issues';
  } else if (/fee|certificate|id card|scholarship|office|admin|transcript|admission/.test(combined)) {
    category = 'Administration';
  }

  let priority: PriorityLevel = 'Medium';
  let urgencyScore = 5;
  let priorityReason = 'Standard operational issue queued for departmental review.';

  if (/fire|spark|short circuit|electrocution|safety|assault|emergency|gas leak|smoke|danger|threat/.test(combined)) {
    priority = 'Critical';
    urgencyScore = 10;
    priorityReason = 'Contains acute safety, electrical, or emergency hazard keywords requiring immediate human intervention.';
  } else if (/outage|not working|burst|flood|leak|broken|urgent|days|blocked/.test(combined)) {
    priority = 'High';
    urgencyScore = 7;
    priorityReason = 'Indicates service disruption affecting daily campus or hostel operations.';
  } else if (/request|suggestion|minor|slow|cosmetic/.test(combined)) {
    priority = 'Low';
    urgencyScore = 3;
    priorityReason = 'Non-blocking request with minimal immediate operational impact.';
  }

  let sentiment: SentimentType = 'Concerned';
  let sentimentReason = 'Reporter describes an operational issue seeking timely resolution.';
  if (priority === 'Critical' || /scared|unsafe|danger|unacceptable|horrible|emergency/.test(combined)) {
    sentiment = 'Distressed';
    sentimentReason = 'Urgent distress indicators detected in the complaint text.';
  } else if (/again|still|frustrated|days|nobody|worst|useless/.test(combined)) {
    sentiment = 'Frustrated';
    sentimentReason = 'Repeated or prolonged dissatisfaction expressed by the reporter.';
  }

  const hasKannada = /[\u0C80-\u0CFF]/.test(description + title);
  const hasHindi = /[\u0900-\u097F]/.test(description + title);
  const detectedLanguage = hasKannada ? 'Kannada' : hasHindi ? 'Hindi' : 'English';

  // Simple token overlap duplicate check
  const words = new Set(combined.split(/\W+/).filter((w) => w.length > 3));
  let possibleDuplicateOf: string | null = null;
  let duplicateReason: string | null = null;
  for (const existing of recentOpen) {
    const existingWords = `${existing.title} ${existing.location}`.toLowerCase().split(/\W+/);
    let overlap = 0;
    for (const w of existingWords) {
      if (w.length > 3 && words.has(w)) overlap++;
    }
    if (overlap >= 3) {
      possibleDuplicateOf = existing.id;
      duplicateReason = `Shares location/subject keywords with open ticket ${existing.id}.`;
      break;
    }
  }

  return {
    detectedLanguage,
    englishTranslation: description,
    category,
    priority,
    urgencyScore,
    sentiment,
    sentimentReason,
    priorityReason,
    suggestedResolution: `Assign a technician from the responsible department to inspect "${location}" and verify the reported issue: "${title}".`,
    possibleDuplicateOf,
    duplicateReason,
    aiAnalysisStatus: 'fallback',
  };
}

export async function analyzeComplaintWithGemini(input: {
  title: string;
  description: string;
  location: string;
  recentOpenComplaints: ComplaintRecord[];
}): Promise<GeminiComplaintAnalysis> {
  const ai = getGeminiClient();
  if (!ai) {
    return deterministicFallbackAnalysis(
      input.title,
      input.description,
      input.location,
      input.recentOpenComplaints
    );
  }

  const openSummaries = input.recentOpenComplaints.slice(0, 12).map((c) => ({
    id: c.id,
    title: c.title,
    location: c.location,
    summary: c.englishTranslation.slice(0, 220),
    category: c.category,
  }));

  const prompt = `Analyze the following campus/institutional user complaint and return strictly validated JSON.

Complaint Title: ${input.title}
Location: ${input.location}
Complaint Description: ${input.description}

Recent Open Complaints (for duplicate detection only — match ONLY if it clearly describes the same incident/location):
${JSON.stringify(openSummaries, null, 2)}

Instructions:
1. Understand complaints written in English, Kannada, Hindi, or mixed text. Detect the primary language and provide a clear English translation/summary in englishTranslation.
2. Choose the single best category from: ${COMPLAINT_CATEGORIES.join(', ')}.
3. Classify priority from: Low, Medium, High, Critical. Use Critical ONLY for active safety hazards, electrical short circuits/fire risks, personal safety threats, severe infrastructure failures, or urgent security incidents.
4. Provide urgencyScore from 1 (lowest) to 10 (highest).
5. Classify user sentiment from: Calm, Concerned, Frustrated, Distressed, and briefly explain why in sentimentReason.
6. Explain clearly why the assigned priority was chosen in priorityReason.
7. Provide a practical, actionable suggestedResolution for the departmental staff. Never claim an action has already been taken.
8. If this complaint closely duplicates one of the Recent Open Complaints above, set possibleDuplicateOf to its exact id (e.g. "CMP-2026-1006") and explain in duplicateReason; otherwise set both to null.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are ResolveAI, a precise institutional complaint triage analyst. Only report observations grounded in the user complaint. Never invent actions that have not occurred.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: 'Must be one of: English, Kannada, Hindi, Other',
            },
            englishTranslation: {
              type: Type.STRING,
              description: 'Clear English translation or concise summary of the complaint.',
            },
            category: {
              type: Type.STRING,
              description: `Must be one of: ${COMPLAINT_CATEGORIES.join(', ')}`,
            },
            priority: {
              type: Type.STRING,
              description: 'Must be one of: Low, Medium, High, Critical',
            },
            urgencyScore: {
              type: Type.INTEGER,
              description: 'Integer urgency score between 1 and 10.',
            },
            sentiment: {
              type: Type.STRING,
              description: 'Must be one of: Calm, Concerned, Frustrated, Distressed',
            },
            sentimentReason: {
              type: Type.STRING,
              description: 'One-sentence explanation of the detected user sentiment.',
            },
            priorityReason: {
              type: Type.STRING,
              description: 'Clear explanation of why this priority level was assigned.',
            },
            suggestedResolution: {
              type: Type.STRING,
              description: 'Recommended concrete action steps for the assigned department.',
            },
            possibleDuplicateOf: {
              type: Type.STRING,
              nullable: true,
              description: 'Matching open complaint ID if duplicate, otherwise null.',
            },
            duplicateReason: {
              type: Type.STRING,
              nullable: true,
              description: 'Why it matches the open complaint, otherwise null.',
            },
          },
          required: [
            'detectedLanguage',
            'englishTranslation',
            'category',
            'priority',
            'urgencyScore',
            'sentiment',
            'sentimentReason',
            'priorityReason',
            'suggestedResolution',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      throw new Error('Empty response from Gemini');
    }
    const parsed = JSON.parse(rawText) as Record<string, unknown>;

    const matchedDuplicateId =
      typeof parsed.possibleDuplicateOf === 'string' &&
      input.recentOpenComplaints.some((c) => c.id === parsed.possibleDuplicateOf)
        ? parsed.possibleDuplicateOf
        : null;

    const urgencyRaw = Number(parsed.urgencyScore);
    const urgencyScore = Number.isFinite(urgencyRaw)
      ? Math.max(1, Math.min(10, Math.round(urgencyRaw)))
      : 5;

    return {
      detectedLanguage: normalizeLanguage(parsed.detectedLanguage),
      englishTranslation:
        typeof parsed.englishTranslation === 'string' && parsed.englishTranslation.trim()
          ? parsed.englishTranslation.trim().slice(0, 1200)
          : input.description,
      category: normalizeCategory(parsed.category),
      priority: normalizePriority(parsed.priority),
      urgencyScore,
      sentiment: normalizeSentiment(parsed.sentiment),
      sentimentReason:
        typeof parsed.sentimentReason === 'string' && parsed.sentimentReason.trim()
          ? parsed.sentimentReason.trim().slice(0, 400)
          : 'Analyzed from complaint tone and urgency.',
      priorityReason:
        typeof parsed.priorityReason === 'string' && parsed.priorityReason.trim()
          ? parsed.priorityReason.trim().slice(0, 500)
          : 'Assigned based on severity and operational impact.',
      suggestedResolution:
        typeof parsed.suggestedResolution === 'string' && parsed.suggestedResolution.trim()
          ? parsed.suggestedResolution.trim().slice(0, 800)
          : `Inspect "${input.location}" and resolve the reported issue.`,
      possibleDuplicateOf: matchedDuplicateId,
      duplicateReason:
        matchedDuplicateId && typeof parsed.duplicateReason === 'string'
          ? parsed.duplicateReason.trim().slice(0, 300)
          : null,
      aiAnalysisStatus: 'gemini',
    };
  } catch (err) {
    console.warn('Gemini complaint analysis fallback triggered:', err instanceof Error ? err.message : err);
    return deterministicFallbackAnalysis(
      input.title,
      input.description,
      input.location,
      input.recentOpenComplaints
    );
  }
}

export async function generateResolutionSummaryWithGemini(input: {
  complaint: ComplaintRecord;
  resolutionComments: string;
  resolvedBy: string;
}): Promise<string> {
  const ai = getGeminiClient();
  const fallbackSummary = `Reported issue: ${input.complaint.title} at ${input.complaint.location}. Resolution confirmed by ${input.resolvedBy}: ${input.resolutionComments}`;

  if (!ai) {
    return fallbackSummary;
  }

  const prompt = `Write a short, clear, factual 2-to-3 sentence closure summary for the user who submitted this complaint.

Original Complaint ID: ${input.complaint.id}
Title: ${input.complaint.title}
Location: ${input.complaint.location}
Description: ${input.complaint.englishTranslation}
Assigned Department: ${input.complaint.assignedDepartment}
Confirmed By: ${input.resolvedBy}
Administrator Resolution Notes: ${input.resolutionComments}

Rules:
- Explain clearly what problem was reported and how it was resolved based ONLY on the Administrator Resolution Notes above.
- Do NOT invent any inspections, parts, or actions not mentioned in the resolution notes.
- Keep tone professional, empathetic, and concise (under 75 words).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You write factual complaint closure summaries. Never fabricate actions outside the provided administrator resolution notes.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    const text = (response.text ?? '').trim();
    return text || fallbackSummary;
  } catch (err) {
    console.warn('Gemini closure summary fallback triggered:', err instanceof Error ? err.message : err);
    return fallbackSummary;
  }
}
