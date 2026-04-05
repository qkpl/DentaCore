import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
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
import { Clinic } from "../../data/mockData";
import { getAllClinics } from "../../services/dataService";

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

  const getNearestClinicRecommendations = async (): Promise<
    ClinicRecommendation[]
  > => {
    const clinicsWithCoordinates = getAllClinics().filter(
      (clinic) =>
        Number.isFinite(clinic.location?.lat) &&
        Number.isFinite(clinic.location?.lng),
    );

    if (!clinicsWithCoordinates.length) {
      return [];
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return [];
      }

      const current = await Location.getCurrentPositionAsync({});
      const currentLat = current.coords.latitude;
      const currentLng = current.coords.longitude;

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
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);
    } catch (error) {
      return [];
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
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes("care") || lowerQuestion.includes("teeth")) {
      return {
        text: "Here are some important tips for dental care:\n\n1. Brush twice daily with fluoride toothpaste\n2. Floss daily to remove plaque between teeth\n3. Visit your dentist every 6 months\n4. Limit sugary foods and drinks\n5. Use mouthwash for extra protection\n\nWould you like more specific information?",
      };
    }

    if (lowerQuestion.includes("root canal")) {
      return {
        text: "A root canal is a treatment to repair and save a badly damaged or infected tooth. The procedure involves:\n\n• Removing the infected pulp\n• Cleaning the root canal\n• Filling and sealing the tooth\n\nIt's typically done under local anesthesia and most patients report minimal discomfort. Would you like to book a consultation?",
      };
    }

    if (lowerQuestion.includes("whitening")) {
      return {
        text: "Teeth whitening tips:\n\n1. Professional whitening is most effective\n2. Avoid staining foods (coffee, red wine)\n3. Use whitening toothpaste regularly\n4. Consider at-home whitening kits\n5. Maintain good oral hygiene\n\nI can help you find clinics that offer professional whitening services!",
      };
    }

    if (lowerQuestion.includes("extraction")) {
      return {
        text: "Post-extraction care guide:\n\n1. Bite on gauze for 30-45 minutes\n2. Avoid rinsing for 24 hours\n3. Apply ice pack to reduce swelling\n4. Take prescribed pain medication\n5. Eat soft foods for a few days\n6. Avoid smoking and straws\n\nContact your dentist if bleeding persists or you have severe pain.",
      };
    }

    if (
      lowerQuestion.includes("nearest") ||
      lowerQuestion.includes("near me") ||
      lowerQuestion.includes("nearby") ||
      lowerQuestion.includes("find clinic") ||
      lowerQuestion.includes("clinic")
    ) {
      const recommendations = await getNearestClinicRecommendations();

      if (!recommendations.length) {
        return {
          text: "I can recommend the nearest clinic, but I need your location permission first. Please allow location access, then ask me again to find the nearest clinics.",
        };
      }

      const topClinic = recommendations[0];
      return {
        text: `I found the nearest clinics based on your current location. The closest one is ${topClinic.clinic.name} (${topClinic.distanceKm.toFixed(1)} km away).\n\nTap any clinic card below to open full clinic details.`,
        recommendedClinics: recommendations,
      };
    }

    return {
      text: "Thank you for your question! While I can provide general information, I recommend consulting with a dental professional for personalized advice. Would you like me to help you find a clinic or book an appointment?",
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
