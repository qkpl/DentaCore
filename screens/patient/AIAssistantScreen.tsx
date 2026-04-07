import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useAuth } from "../../context/AuthContext";
import { Clinic } from "../../data/mockData";
import { getAllClinics } from "../../services/dataService";
import { getGeminiResponse } from "../../services/geminiService";

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

interface AIAssistantScreenProps {
  navigation: any;
}

export default function AIAssistantScreen({
  navigation,
}: AIAssistantScreenProps) {
  const { user } = useAuth();
  const clinicGeocodeCache = useRef<Record<string, { lat: number; lng: number }>>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm DentaCare AI, your dental assistant. I can help you with:\n\n• Understanding dental procedures\n• Post-treatment care tips\n• Finding the right dental service\n• Answering general dental questions\n\nHow can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");

  const quickQuestions = [
    "How do I care for my teeth?",
    "What is a root canal?",
    "Tips for teeth whitening?",
    "Post-extraction care?",
    "Find nearest clinic near me",
  ];

  const toRadians = (value: number): number => (value * Math.PI) / 180;

  const hasStructuredAddressFormat = (address: string): boolean => {
    const segments = address
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length < 4) {
      return false;
    }

    const postalCode = segments[segments.length - 1];
    return /^\d{4}$/.test(postalCode);
  };

  const normalizeAddressForGeocoding = (address: string): string => {
    if (/philippines/i.test(address)) {
      return address;
    }

    return `${address}, Philippines`;
  };

  const calculateDistanceKm = (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): number => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(toLat - fromLat);
    const dLng = toRadians(toLng - fromLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(fromLat)) *
        Math.cos(toRadians(toLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const getNearestClinicRecommendations = async (): Promise<{
    recommendations: ClinicRecommendation[];
    reason?: "missing_address" | "invalid_format" | "address_not_found";
    addressUsed?: string;
  }> => {
    const registeredAddress = user?.address?.trim();
    if (!registeredAddress) {
      return { recommendations: [], reason: "missing_address" };
    }

    if (!hasStructuredAddressFormat(registeredAddress)) {
      return {
        recommendations: [],
        reason: "invalid_format",
        addressUsed: registeredAddress,
      };
    }

    const clinicsWithCoordinates = getAllClinics().filter(
      (clinic) => Boolean(clinic.address?.trim()),
    );

    if (!clinicsWithCoordinates.length) {
      return { recommendations: [] };
    }

    try {
      const geocoded = await Location.geocodeAsync(
        normalizeAddressForGeocoding(registeredAddress),
      );
      const locationPoint = geocoded[0];
      if (!locationPoint) {
        return {
          recommendations: [],
          reason: "address_not_found",
          addressUsed: registeredAddress,
        };
      }

      const baseLat = locationPoint.latitude;
      const baseLng = locationPoint.longitude;

      const COORDINATE_MISMATCH_KM = 50;

      const clinicPoints = await Promise.all(
        clinicsWithCoordinates.map(async (clinic) => {
          const hasValidStoredCoordinates =
            Number.isFinite(clinic.location?.lat) &&
            Number.isFinite(clinic.location?.lng) &&
            Math.abs(clinic.location.lat) > 0.0001 &&
            Math.abs(clinic.location.lng) > 0.0001;

          const storedPoint = hasValidStoredCoordinates
            ? {
                lat: clinic.location.lat,
                lng: clinic.location.lng,
              }
            : null;

          const cached = clinicGeocodeCache.current[clinic.id];

          let geocodedPoint: { lat: number; lng: number } | null =
            cached ?? null;

          if (!geocodedPoint) {
            try {
              const clinicGeocoded = await Location.geocodeAsync(
                normalizeAddressForGeocoding(clinic.address),
              );
              const point = clinicGeocoded[0];
              if (point) {
                geocodedPoint = {
                  lat: point.latitude,
                  lng: point.longitude,
                };
                clinicGeocodeCache.current[clinic.id] = geocodedPoint;
              }
            } catch (error) {
              geocodedPoint = null;
            }
          }

          if (storedPoint && geocodedPoint) {
            const mismatchKm = calculateDistanceKm(
              storedPoint.lat,
              storedPoint.lng,
              geocodedPoint.lat,
              geocodedPoint.lng,
            );

            if (mismatchKm > COORDINATE_MISMATCH_KM) {
              return {
                clinic,
                lat: geocodedPoint.lat,
                lng: geocodedPoint.lng,
              };
            }

            return {
              clinic,
              lat: storedPoint.lat,
              lng: storedPoint.lng,
            };
          }

          if (geocodedPoint) {
            return {
              clinic,
              lat: geocodedPoint.lat,
              lng: geocodedPoint.lng,
            };
          }

          if (storedPoint) {
            return {
              clinic,
              lat: storedPoint.lat,
              lng: storedPoint.lng,
            };
          }

          return null;
        }),
      );

      const candidates = clinicPoints.filter(
        (
          item,
        ): item is {
          clinic: Clinic;
          lat: number;
          lng: number;
        } => item !== null,
      );

      return {
        recommendations: candidates
          .map((item) => ({
            clinic: item.clinic,
            distanceKm: calculateDistanceKm(
              baseLat,
              baseLng,
              item.lat,
              item.lng,
            ),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 3),
        addressUsed: registeredAddress,
      };
    } catch (error) {
      return {
        recommendations: [],
        reason: "address_not_found",
        addressUsed: registeredAddress,
      };
    }
  };

  const handleClinicRecommendationPress = (clinic: Clinic) => {
    navigation.navigate("Home", {
      screen: "ClinicDetails",
      params: { clinic },
    });
  };

  const handleSend = (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Simulate AI response
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

  const getAIResponse = async (
    question: string,
  ): Promise<{ text: string; recommendedClinics?: ClinicRecommendation[] }> => {
    // Get response from Gemini API
    const geminiResponse = await getGeminiResponse(question);

    // Check if user is asking for nearest clinics
    if (geminiResponse.shouldShowClinics) {
      const { recommendations, reason, addressUsed } =
        await getNearestClinicRecommendations();

      if (!recommendations.length) {
        if (reason === "missing_address") {
          return {
            text: "I can find the nearest clinics based on your registered address, but your profile address is empty. Please update your address in Profile first, then ask me again.",
          };
        }

        if (reason === "invalid_format") {
          return {
            text: "Please update your address in Profile using this format: House/Street, Barangay, City/Municipality, Province (optional), 4-digit Postal Code.",
          };
        }

        if (reason === "address_not_found") {
          return {
            text: `I couldn't locate your registered address${addressUsed ? ` (${addressUsed})` : ""}. Please update it in Profile with a more specific format (street, city, province), then ask me again.`,
          };
        }

        return {
          text: "I couldn't fetch nearby clinics right now. Please try again in a moment.",
        };
      }

      return {
        text: `${geminiResponse.text}\n\nBased on your registered address${addressUsed ? `: ${addressUsed}` : ""}.`,
        recommendedClinics: recommendations,
      };
    }

    return {
      text: geminiResponse.text,
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Ionicons name="home-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.aiAvatar}>
            <Ionicons name="chatbubbles" size={24} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>DentaCare AI</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser && styles.userMessageText,
                ]}
              >
                {message.text}
              </Text>
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
                    {Platform.OS !== "web" &&
                      Number.isFinite(recommendation.clinic.location?.lat) &&
                      Number.isFinite(recommendation.clinic.location?.lng) && (
                        <MapView
                          style={styles.recommendationMiniMap}
                          provider={PROVIDER_GOOGLE as any}
                          region={{
                            latitude: recommendation.clinic.location.lat,
                            longitude: recommendation.clinic.location.lng,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                          }}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          rotateEnabled={false}
                          pitchEnabled={false}
                        >
                          <Marker
                            coordinate={{
                              latitude: recommendation.clinic.location.lat,
                              longitude: recommendation.clinic.location.lng,
                            }}
                          />
                        </MapView>
                      )}
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
              <Text
                style={[
                  styles.timestamp,
                  message.isUser && styles.userTimestamp,
                ]}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}

          {/* Quick Questions */}
          {messages.length <= 2 && (
            <View style={styles.quickQuestionsContainer}>
              <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickQuestionButton}
                  onPress={() => handleSend(question)}
                >
                  <Text style={styles.quickQuestionText}>{question}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#00BFA6" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything about dental care..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "#FFF" : "#CCC"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#00BFA6",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  homeButton: {
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
  },
  placeholder: {
    width: 34,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: "#FFF",
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#00BFA6",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  userMessageText: {
    color: "#FFF",
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginTop: 5,
    textAlign: "right",
  },
  userTimestamp: {
    color: "rgba(255,255,255,0.8)",
  },
  recommendationCard: {
    marginTop: 10,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: "#DDEAF9",
    borderRadius: 10,
    padding: 10,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationName: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  recommendationAddress: {
    fontSize: 12,
    color: "#4B5563",
    marginBottom: 6,
  },
  recommendationMiniMap: {
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendationDistance: {
    fontSize: 12,
    color: "#0F766E",
    fontWeight: "600",
  },
  recommendationLink: {
    fontSize: 12,
    color: "#00BFA6",
    fontWeight: "700",
  },
  quickQuestionsContainer: {
    marginTop: 10,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  quickQuestionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  quickQuestionText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 15,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E0E0E0",
  },
});
