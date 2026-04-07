const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

interface GeminiResponse {
  text: string;
  shouldShowClinics?: boolean;
}

// Response cache to reduce API calls
const responseCache = new Map<string, GeminiResponse>();

// Rate limiting
let lastRequestTime = 0;
const RATE_LIMIT_MS = 2000; // 2 seconds between requests
let isQuotaExceeded = false;
let quotaResetTime = 0;
let isApiDisabledForSession = false;

interface GroqMessage {
  role: "system" | "user";
  content: string;
}

interface GroqChoice {
  message?: {
    content?: string;
  };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

// Fallback responses for common dental questions
const fallbackResponses: { [key: string]: GeminiResponse } = {
  teeth_care: {
    text: "Here are important tips for dental care:\n\n1. Brush twice daily with fluoride toothpaste\n2. Floss daily to remove plaque between teeth\n3. Visit your dentist every 6 months\n4. Limit sugary foods and drinks\n5. Use mouthwash for extra protection\n\nWould you like more specific information?",
    shouldShowClinics: false,
  },
  root_canal: {
    text: "A root canal is a treatment to repair and save a badly damaged or infected tooth. The procedure involves:\n\n• Removing the infected pulp\n• Cleaning the root canal\n• Filling and sealing the tooth\n\nIt's typically done under local anesthesia and most patients report minimal discomfort. Would you like to book a consultation?",
    shouldShowClinics: false,
  },
  whitening: {
    text: "Teeth whitening tips:\n\n1. Professional whitening is most effective\n2. Avoid staining foods (coffee, red wine)\n3. Use whitening toothpaste regularly\n4. Consider at-home whitening kits\n5. Maintain good oral hygiene\n\nI can help you find clinics that offer professional whitening services!",
    shouldShowClinics: false,
  },
  extraction: {
    text: "Post-extraction care guide:\n\n1. Bite on gauze for 30-45 minutes\n2. Avoid rinsing for 24 hours\n3. Apply ice pack to reduce swelling\n4. Take prescribed pain medication\n5. Eat soft foods for a few days\n6. Avoid smoking and straws\n\nContact your dentist if bleeding persists or you have severe pain.",
    shouldShowClinics: false,
  },
  nearest_clinic: {
    text: "I can help you find the nearest clinics based on your current location. Let me show you the available clinics near you sorted by distance.",
    shouldShowClinics: true,
  },
};

/**
 * Get fallback response for common questions
 */
const getFallbackResponse = (question: string): GeminiResponse | null => {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("care") && lowerQuestion.includes("teeth")) {
    return fallbackResponses.teeth_care;
  }
  if (lowerQuestion.includes("root canal")) {
    return fallbackResponses.root_canal;
  }
  if (lowerQuestion.includes("whitening")) {
    return fallbackResponses.whitening;
  }
  if (lowerQuestion.includes("extraction") || lowerQuestion.includes("extract")) {
    return fallbackResponses.extraction;
  }
  if (
    lowerQuestion.includes("nearest") ||
    lowerQuestion.includes("near me") ||
    lowerQuestion.includes("nearby") ||
    lowerQuestion.includes("find clinic")
  ) {
    return fallbackResponses.nearest_clinic;
  }

  return null;
};

const getOfflineResponse = (question: string): GeminiResponse => {
  const fallback = getFallbackResponse(question);
  if (fallback) {
    return fallback;
  }

  return {
    text: "I can still help with dental basics while AI is limited. Ask me about dental care, root canals, whitening, post-extraction care, or finding nearby clinics.",
    shouldShowClinics: false,
  };
};

/**
 * Check if quota is exceeded and if we need to wait
 */
const checkQuotaStatus = (): boolean => {
  if (isQuotaExceeded && Date.now() < quotaResetTime) {
    const waitTime = Math.ceil((quotaResetTime - Date.now()) / 1000);
    console.warn(`Quota exceeded. Please wait ${waitTime} seconds before trying again.`);
    return true;
  }
  if (isQuotaExceeded && Date.now() >= quotaResetTime) {
    isQuotaExceeded = false;
    console.log("Quota reset, resuming API calls");
  }
  return false;
};

const askGroq = async (messages: GroqMessage[]): Promise<string> => {
  if (!GROQ_API_KEY) {
    throw new Error("Missing EXPO_PUBLIC_GROQ_API_KEY");
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 220,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText);
    (error as any).status = response.status;
    throw error;
  }

  const payload = (await response.json()) as GroqResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return content;
};

/**
 * Get AI response via Groq API for dental queries with caching and fallback
 */
export const getGeminiResponse = async (
  userMessage: string,
): Promise<GeminiResponse> => {
  try {
    // Check cache first
    if (responseCache.has(userMessage)) {
      console.log("Using cached response");
      return responseCache.get(userMessage)!;
    }

    if (isApiDisabledForSession) {
      const offlineResponse = getOfflineResponse(userMessage);
      responseCache.set(userMessage, offlineResponse);
      return offlineResponse;
    }

    // Check if quota is exceeded
    if (checkQuotaStatus()) {
      const offlineResponse = getOfflineResponse(userMessage);
      responseCache.set(userMessage, offlineResponse);
      return offlineResponse;
    }

    // Try fallback response first to reduce API calls
    const fallbackResponse = getFallbackResponse(userMessage);
    if (fallbackResponse) {
      console.log("Using fallback response for known question");
      responseCache.set(userMessage, fallbackResponse);
      return fallbackResponse;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastRequestTime < RATE_LIMIT_MS) {
      const waitTime = RATE_LIMIT_MS - (now - lastRequestTime);
      console.log(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();

    const systemPrompt =
      'You are DentaCare AI, a helpful dental assistant chatbot. Keep responses concise (under 150 characters). If user asks about nearest clinics, near me, nearby clinic, or find clinic, include "SHOW_NEAREST_CLINICS" at the end.';

    const text = await askGroq([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userMessage,
      },
    ]);

    const shouldShowClinics = text.includes("SHOW_NEAREST_CLINICS");
    const cleanedText = text.replace(/SHOW_NEAREST_CLINICS/g, "").trim();

    const response: GeminiResponse = {
      text: cleanedText,
      shouldShowClinics,
    };

    // Cache the response
    responseCache.set(userMessage, response);

    return response;
  } catch (error: any) {
    const status = error?.status;
    const message = error?.message || "";

    // Handle rate-limit / quota exceeded
    if (status === 429) {
      isQuotaExceeded = true;
      quotaResetTime = Date.now() + 60000; // Reset after 1 minute
      isApiDisabledForSession = true;
      console.warn("Groq quota/rate limit exceeded. Switching to local fallback responses for this app session.");

      const offlineResponse = getOfflineResponse(userMessage);
      responseCache.set(userMessage, offlineResponse);
      return offlineResponse;
    }

    if (message.includes("Missing EXPO_PUBLIC_GROQ_API_KEY")) {
      console.warn("Groq API key is missing. Add EXPO_PUBLIC_GROQ_API_KEY to your environment.");
      const offlineResponse = getOfflineResponse(userMessage);
      responseCache.set(userMessage, offlineResponse);
      return offlineResponse;
    }

    console.warn("Groq API warning:", {
      status,
      message,
      hasCache: responseCache.size > 0,
    });

    const offlineResponse = getOfflineResponse(userMessage);
    responseCache.set(userMessage, offlineResponse);
    return offlineResponse;
  }
};

/**
 * Clear response cache (useful for testing)
 */
export const clearResponseCache = () => {
  responseCache.clear();
  isApiDisabledForSession = false;
  isQuotaExceeded = false;
  quotaResetTime = 0;
  console.log("Response cache cleared");
};

/**
 * Get cache size for monitoring
 */
export const getCacheSize = () => {
  return responseCache.size;
};
