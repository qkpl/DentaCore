# DentaCare AI Chatbot - Gemini API Integration Guide

## Overview
The DentaCare AI Assistant now uses Google's Gemini API for intelligent, context-aware responses about dental health and clinic recommendations.

## Implementation Details

### 1. **API Key Configuration**
- **API Key**: `AIzaSyA5gqswEcWg1pf8vTTgtUQHBR7P-qRZluA`
- **Model**: Gemini Pro (`gemini-pro`)
- **Location**: `services/geminiService.ts`

> ⚠️ **Security Note**: The API key is currently hardcoded. For production, move it to environment variables:
> ```typescript
> import { API_KEY } from '@env';
> const GEMINI_API_KEY = API_KEY;
> ```

### 2. **Gemini Service (`services/geminiService.ts`)**

#### `getGeminiResponse(userMessage: string)`
**Purpose**: Get AI response from Gemini API for dental queries

**Parameters**:
- `userMessage`: User's question or query

**Return Value**:
```typescript
{
  text: string;           // The AI response
  shouldShowClinics?: boolean;  // If true, show nearest clinic recommendations
}
```

**System Prompt**: 
The service uses a specialized system prompt that instructs Gemini to:
- Provide helpful information about dental procedures and care
- Answer general dental questions professionally
- Detect when users ask about finding clinics (and mark with `shouldShowClinics: true`)
- Keep responses concise and practical
- Recommend consulting dentists for medical advice
- Redirect non-dental questions to dental topics

**Error Handling**:
- If Gemini API fails, returns a fallback response
- Errors are logged to console

### 3. **AIAssistantScreen Integration (`screens/patient/AIAssistantScreen.tsx`)**

#### Key Changes:
1. **Import**: Added `import { getGeminiResponse } from "../../services/geminiService";`

2. **Updated Flow**:
   ```
   User sends message
      ↓
   Call getGeminiResponse() → Gemini API
      ↓
   Check if shouldShowClinics = true
      ↓
   If YES → Get nearest clinics via getNearestClinicRecommendations()
   If NO → Display only AI response
      ↓
   Render message + optional clinic cards
   ```

#### Location-Based Clinic Finding:
The chatbot automatically detects clinic-related queries and:
1. Calls Gemini for conversational response
2. Requests user's location permission (if not already granted)
3. Uses Haversine formula to calculate distances
4. Sorts clinics by distance (nearest first)
5. Shows top 3 clinics with:
   - Clinic name
   - Address
   - Distance in kilometers
   - "View details" link to clinic page

#### Sample User Queries That Trigger Clinic Recommendations:
- "What is the nearest dental clinic?"
- "Find me a clinic near my area"
- "Show me clinics near my registered address"
- "I need a dental clinic close to me"
- "Where can I find a clinic nearby?"

### 4. **Clinic Recommendation Feature**

#### Distance Calculation:
Uses **Haversine Formula** to calculate great-circle distance between two points:
```
distance = 2 * R * arcsin(sqrt(sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)))
```
Where:
- R = Earth's radius (6371 km)
- φ = latitude, λ = longitude

#### Location Permissions:
- Requests `ForegroundLocationPermission` from `expo-location`
- Shows error message if permission denied
- Gracefully handles location unavailability

#### Clinic Filtering:
- Only clinics with valid coordinates (lat/lng) are considered
- Sorted by distance (ascending)
- Top 3 clinics displayed

### 5. **Quick Questions**
**Default suggestions** shown on first load:
- "How do I care for my teeth?"
- "What is a root canal?"
- "Tips for teeth whitening?"
- "Post-extraction care?"
- "Find nearest clinic near me" ← Triggers clinic search

## Testing the Implementation

### Test Case 1: General Dental Question
**User**: "What is a root canal?"
**Expected**: Gemini responds with detailed explanation

### Test Case 2: Clinic Search
**User**: "Find nearest clinic near me"
**Expected**: 
1. Gemini responds affirmatively
2. Location permission requested (if not granted)
3. Top 3 nearest clinics shown as cards

### Test Case 3: Non-Dental Question
**User**: "What's the weather like?"
**Expected**: Gemini redirects to dental topics

### Test Case 4: Permission Denied
**User**: Denies location permission, then asks "Show me clinics near me"
**Expected**: Error message suggesting to enable location

## Required Dependencies

```json
{
  "@google/generative-ai": "^0.x.x",  // Installed via npm
  "expo-location": "~55.1.7",          // Already installed
  "firebase": "^12.11.0"               // For future persistence
}
```

## API Response Format

### Gemini Response Examples:

**Question**: "How do I brush my teeth properly?"
```json
{
  "text": "Here are essential tips for proper tooth brushing...",
  "shouldShowClinics": false
}
```

**Question**: "Where can I find a dental clinic?"
```json
{
  "text": "I'd be happy to help you find nearby dental clinics...",
  "shouldShowClinics": true
}
```

## Limitations & Considerations

1. **API Rate Limits**: Gemini API has usage limits. Monitor API quota
2. **Response Time**: Network latency affects UX (~1-3 seconds typical)
3. **Accuracy**: Gemini may sometimes provide generic responses for specific queries
4. **Location Accuracy**: Depends on device GPS accuracy (~10-50m typical)
5. **Offline**: Requires internet connection; add offline mode if needed

## Future Enhancements

1. **Environment Variables**: Move API key to `.env` file
2. **Caching**: Cache Gemini responses for identical queries
3. **User History**: Store conversation history for context
4. **Multi-language**: Support multiple languages via Gemini
5. **Appointment Integration**: Allow users to book directly from chatbot
6. **Clinic Reviews**: Show clinic ratings in recommendations
7. **Conversation Persistence**: Save chat history to Firestore

## Troubleshooting

### Issue: "API Key not valid" error
**Solution**: Verify API key in `geminiService.ts`

### Issue: Clinics not showing distances
**Solution**: Ensure clinics in `mockData.ts` have valid `location.lat` and `location.lng`

### Issue: Location permission keeps being requested
**Solution**: Grant location permission in app settings

### Issue: Slow responses
**Solution**: 
- Check internet connection
- Reduce query complexity
- Check Gemini API quota

## Technical Stack

| Component | Technology |
|-----------|-----------|
| AI Model | Google Gemini Pro |
| Location | expo-location |
| Distance Calculation | Haversine Formula |
| State Management | React Hooks (useState) |
| Backend | Firebase Firestore |
| Framework | Expo React Native |

## Files Modified

1. `services/geminiService.ts` - New file
2. `screens/patient/AIAssistantScreen.tsx` - Updated with Gemini integration

## Support

For issues or questions:
1. Check the Gemini API documentation: https://ai.google.dev/
2. Check expo-location docs: https://docs.expo.dev/modules/expo-location/
3. Review error logs in console
