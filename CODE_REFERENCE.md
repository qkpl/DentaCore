# Code Reference & Implementation Details

## Architecture Overview

```
┌─────────────────────────────────────┐
│   AIAssistantScreen.tsx             │  User Interface
│   - Chat messages                   │
│   - Input field                     │
│   - Clinic cards                    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   getAIResponse()                   │  Business Logic
│   - Calls Gemini API                │
│   - Detects clinic queries          │
│   - Gets clinic recommendations     │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────────┐ ┌──────────────────────────┐
│geminiService │ │dataService               │
│.ts           │ │.ts                       │
│              │ │getNearestClinicRecoms()  │
│- getGemini   │ │getAllClinics()           │
│  Response()  │ │                          │
└──────┬───────┘ └──────┬───────────────────┘
       │                │
       ▼                ▼
┌──────────────────┐ ┌──────────────────┐
│Gemini API        │ │expo-location     │
│(Cloud)           │ │(Device Location) │
└──────────────────┘ └──────────────────┘
```

---

## Gemini Service Implementation

### File: `services/geminiService.ts`

#### Function: `getGeminiResponse(userMessage: string)`

```typescript
export const getGeminiResponse = async (
  userMessage: string,
): Promise<GeminiResponse> => {
  try {
    // System prompt instructs Gemini how to behave
    const systemPrompt = `You are DentaCare AI...`;
    
    // Combine system prompt with user message
    const prompt = `${systemPrompt}\n\nUser question: ${userMessage}\n\nProvide a helpful response:`;
    
    // Call Gemini API
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Check if we should show clinic recommendations
    const shouldShowClinics = text.includes("SHOW_NEAREST_CLINICS");
    
    // Clean the response
    const cleanedText = text.replace(/SHOW_NEAREST_CLINICS/g, "").trim();
    
    return {
      text: cleanedText,
      shouldShowClinics,
    };
  } catch (error) {
    // Graceful error handling
    console.error("Gemini API Error:", error);
    return {
      text: "I'm having trouble connecting right now. Please try again in a moment.",
      shouldShowClinics: false,
    };
  }
};
```

#### System Prompt Engineering:

The system prompt is critical for Gemini's behavior:

```typescript
const systemPrompt = `You are DentaCare AI, a helpful dental assistant chatbot integrated into a dental clinic booking application. Your role is to:

1. Provide helpful information about dental procedures, care tips, and dental health
2. Answer general dental questions in a friendly and professional manner
3. When a user asks about finding clinics, nearest clinics, or clinic recommendations, respond with encouragement and indicate this feature is available
4. Keep responses concise and practical (under 300 characters preferably)
5. Always be professional and empathetic
6. Recommend consulting a dentist for specific medical advice
7. If the question is not related to dental health, politely redirect to dental topics

Important: If the user asks about nearest clinics, nearby clinics, or finding clinics near their area/address, include the phrase "SHOW_NEAREST_CLINICS" at the end of your response so the app can display clinic recommendations.`;
```

---

## AIAssistantScreen Implementation

### File: `screens/patient/AIAssistantScreen.tsx`

#### Integration Flow:

```typescript
const handleSend = (text?: string) => {
  // 1. Extract message text
  const messageText = text || inputText.trim();
  if (!messageText) return;

  // 2. Add user message to chat
  const userMessage: Message = {
    id: Date.now().toString(),
    text: messageText,
    isUser: true,
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, userMessage]);
  setInputText("");

  // 3. Get AI response (with 1 second delay for UX)
  setTimeout(() => {
    void (async () => {
      const aiResponse = await getAIResponse(messageText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text,
        isUser: false,
        timestamp: new Date(),
        recommendedClinics: aiResponse.recommendedClinics,
      };
      setMessages((prev) => [...prev, aiMessage]);
    })();
  }, 1000);
};
```

#### New `getAIResponse` Implementation:

```typescript
const getAIResponse = async (
  question: string,
): Promise<{ text: string; recommendedClinics?: ClinicRecommendation[] }> => {
  // 1. Get response from Gemini API
  const geminiResponse = await getGeminiResponse(question);

  // 2. Check if user is asking for nearest clinics
  if (geminiResponse.shouldShowClinics) {
    // 3. Get clinic recommendations if needed
    const recommendations = await getNearestClinicRecommendations();

    // 4. Handle no location permission
    if (!recommendations.length) {
      return {
        text: geminiResponse.text + "\n\nI can recommend the nearest clinics, but I need your location permission first. Please allow location access, then ask me again to find the nearest clinics.",
      };
    }

    // 5. Return response with clinic cards
    return {
      text: geminiResponse.text,
      recommendedClinics: recommendations,
    };
  }

  // 6. Return Gemini response without clinic cards
  return {
    text: geminiResponse.text,
  };
};
```

#### Distance Calculation:

```typescript
const getNearestClinicRecommendations = async (): Promise<
  ClinicRecommendation[]
> => {
  // Get clinics with valid coordinates
  const clinicsWithCoordinates = getAllClinics().filter(
    (clinic) =>
      Number.isFinite(clinic.location?.lat) &&
      Number.isFinite(clinic.location?.lng),
  );

  if (!clinicsWithCoordinates.length) {
    return [];
  }

  try {
    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return [];
    }

    // Get current position
    const current = await Location.getCurrentPositionAsync({});
    const currentLat = current.coords.latitude;
    const currentLng = current.coords.longitude;

    // Calculate distances and sort
    return clinicsWithCoordinates
      .map((clinic) => ({
        clinic,
        distanceKm: calculateDistanceKm(
          currentLat,
          currentLng,
          clinic.location.lat,
          clinic.location.lng,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm) // Sort by distance
      .slice(0, 3); // Top 3 clinics
  } catch (error) {
    return [];
  }
};
```

#### Haversine Formula:

```typescript
const toRadians = (value: number): number => (value * Math.PI) / 180;

const calculateDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number => {
  const earthRadiusKm = 6371;
  
  // Convert to radians
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadiusKm * c;
};
```

---

## Type Definitions

### In `AIAssistantScreen.tsx`:

```typescript
interface ClinicRecommendation {
  clinic: Clinic;
  distanceKm: number;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendedClinics?: ClinicRecommendation[];
}

interface GeminiResponse {
  text: string;
  shouldShowClinics?: boolean;
}
```

---

## UI Components

### Clinic Recommendation Card:

```typescript
{!message.isUser &&
  message.recommendedClinics?.map((recommendation) => (
    <TouchableOpacity
      key={recommendation.clinic.id}
      style={styles.recommendationCard}
      onPress={() =>
        handleClinicRecommendationPress(recommendation.clinic)
      }
      activeOpacity={0.85}
    >
      <View style={styles.recommendationHeader}>
        <Ionicons name="business" size={16} color="#00BFA6" />
        <Text style={styles.recommendationName}>
          {recommendation.clinic.name}
        </Text>
      </View>
      <Text style={styles.recommendationAddress}>
        {recommendation.clinic.address || "No address provided"}
      </Text>
      <View style={styles.recommendationFooter}>
        <Text style={styles.recommendationDistance}>
          {recommendation.distanceKm.toFixed(1)} km away
        </Text>
        <Text style={styles.recommendationLink}>
          View details
        </Text>
      </View>
    </TouchableOpacity>
  ))}
```

---

## Data Model in mockData.ts

### Clinic Interface:

```typescript
export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  servicesOffered: string[];
  operatingHours: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  rating: number;
  totalPatients: number;
  todaysAppointments: number;
  revenue: number;
  location: {
    lat: number;  // ← Required for distance calculation
    lng: number;  // ← Required for distance calculation
  };
  isActive: boolean;
  lastLoginDate?: string;
}
```

### Sample Clinic with Coordinates:

```typescript
{
  id: "clinic_001",
  name: "SmileCare Dental Clinic",
  address: "123 Main Street, Manila",
  phone: "(02) 8827-1234",
  email: "hello@smilecare.ph",
  description: "Modern dental clinic with latest technology",
  servicesOffered: ["Teeth Cleaning", "Root Canal", "Whitening"],
  location: {
    lat: 14.5995,      // Manila coordinates
    lng: 120.9842,
  },
  // ... other fields
}
```

---

## Environment Setup

### Required Packages:

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.x.x",
    "expo-location": "~55.1.7",
    "react-native": "0.83.4",
    "expo": "^55.0.12"
  }
}
```

### Installation:

```bash
# Gemini API
npm install @google/generative-ai

# Already installed in your project:
npm install expo-location
```

---

## Error Handling

### Gemini API Errors:

```typescript
try {
  const result = await model.generateContent(prompt);
  // Success
} catch (error) {
  console.error("Gemini API Error:", error);
  return {
    text: "I'm having trouble connecting right now.",
    shouldShowClinics: false,
  };
}
```

### Location Permission Errors:

```typescript
try {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return [];  // Return empty to trigger "permission denied" message
  }
  // Proceed with location
} catch (error) {
  return [];  // Graceful fallback
}
```

---

## Performance Optimizations

### 1. Response Caching (Optional):

```typescript
const responseCache = new Map<string, GeminiResponse>();

export const getGeminiResponseCached = async (
  userMessage: string,
): Promise<GeminiResponse> => {
  if (responseCache.has(userMessage)) {
    return responseCache.get(userMessage)!;
  }
  const response = await getGeminiResponse(userMessage);
  responseCache.set(userMessage, response);
  return response;
};
```

### 2. Debounced Location Requests:

```typescript
const memoizedLocation = useRef<Location.LocationObject | null>(null);

const getLocationOnce = async () => {
  if (memoizedLocation.current) {
    return memoizedLocation.current;
  }
  const location = await Location.getCurrentPositionAsync({});
  memoizedLocation.current = location;
  return location;
};
```

---

## Testing Examples

### Unit Test Template (Jest):

```typescript
describe("getGeminiResponse", () => {
  test("should return text and shouldShowClinics flag", async () => {
    const response = await getGeminiResponse("Find nearest clinic");
    expect(response).toHaveProperty("text");
    expect(response).toHaveProperty("shouldShowClinics");
  });

  test("should handle API errors gracefully", async () => {
    // Mock failed API call
    jest.spyOn(genAI, "getGenerativeModel").mockRejectedValue(new Error("API Error"));
    const response = await getGeminiResponse("test");
    expect(response.text).toContain("trouble connecting");
  });
});
```

---

## Common Integration Points

### 1. Clinic Details Navigation:

```typescript
const handleClinicRecommendationPress = (clinic: Clinic) => {
  navigation.navigate("Home", {
    screen: "ClinicDetails",
    params: { clinic },
  });
};
```

### 2. Firebase Firestore Integration (Future):

```typescript
// Log chat history
await addDoc(collection(db, "chatHistory"), {
  userId: authContext.user.id,
  message: userMessage,
  response: aiResponse.text,
  timestamp: new Date(),
  clinicsShown: aiResponse.recommendedClinics?.length || 0,
});
```

---

**Last Updated**: April 7, 2026
**Version**: 1.0
**Status**: Production Ready
