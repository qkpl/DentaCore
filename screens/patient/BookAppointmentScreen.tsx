import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Clinic, PaymentMethod } from "../../data/mockData";
import { createAppointment } from "../../services/dataService";

interface BookAppointmentScreenProps {
  route: any;
  navigation: any;
}

const jsDayToOperatingDay: (keyof Clinic["operatingHours"])[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const formatSlot = (hours: number): string => {
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = ((hours + 11) % 12) + 1;
  return `${hour12}:00 ${suffix}`;
};

const parseTimeToHour = (timeLabel: string): number | null => {
  const match = timeLabel.trim().match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/i);
  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const period = match[2].toUpperCase();
  if (Number.isNaN(rawHour) || rawHour < 1 || rawHour > 12) {
    return null;
  }

  if (period === "AM") {
    return rawHour === 12 ? 0 : rawHour;
  }

  return rawHour === 12 ? 12 : rawHour + 12;
};

const buildTimeSlots = (operatingHours: string): string[] => {
  const [startRaw, endRaw] = operatingHours
    .split("-")
    .map((value) => value.trim());
  if (!startRaw || !endRaw) {
    return [];
  }

  const startHour = parseTimeToHour(startRaw);
  const endHour = parseTimeToHour(endRaw);
  if (startHour === null || endHour === null || endHour <= startHour) {
    return [];
  }

  const slots: string[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push(formatSlot(hour));
  }

  return slots;
};

const PAYMENT_OPTIONS: {
  key: PaymentMethod;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  helper: string;
}[] = [
  {
    key: "card",
    label: "Credit / Debit Card",
    description: "Visa, Mastercard, AMEX",
    icon: "card-outline",
    accent: "#2563EB",
    helper: "Instant confirmation",
  },
  {
    key: "gcash",
    label: "GCash",
    description: "Pay directly from your wallet",
    icon: "wallet-outline",
    accent: "#0EA5E9",
    helper: "No extra fees",
  },
  {
    key: "paypal",
    label: "PayPal",
    description: "Secure global checkout",
    icon: "logo-paypal",
    accent: "#0D9488",
    helper: "Buyer protection",
  },
];

const generateTransactionReference = (method: PaymentMethod): string => {
  const prefix = method.slice(0, 2).toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
};

export default function BookAppointmentScreen({
  route,
  navigation,
}: BookAppointmentScreenProps) {
  const { clinic }: { clinic: Clinic } = route.params;
  const { user } = useAuth();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const selectedPaymentOption = useMemo(
    () =>
      PAYMENT_OPTIONS.find((option) => option.key === selectedPaymentMethod) ||
      null,
    [selectedPaymentMethod],
  );

  const availableDates = useMemo(() => {
    const dates: string[] = [];

    for (let offset = 1; offset <= 14; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + offset);

      const dayKey = jsDayToOperatingDay[date.getDay()];
      const schedule = clinic.operatingHours[dayKey];
      if (schedule !== "Closed") {
        dates.push(date.toISOString().split("T")[0]);
      }
    }

    return dates;
  }, [clinic.operatingHours]);

  const availableTimes = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const dayKey =
      jsDayToOperatingDay[new Date(`${selectedDate}T00:00:00`).getDay()];
    const schedule = clinic.operatingHours[dayKey];
    if (schedule === "Closed") {
      return [];
    }

    return buildTimeSlots(schedule);
  }, [clinic.operatingHours, selectedDate]);

  useEffect(() => {
    if (selectedTime && !availableTimes.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [availableTimes, selectedTime]);

  const handleBookAppointment = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      Alert.alert("Incomplete", "Please select service, date, and time");
      return;
    }

    if (!selectedPaymentMethod) {
      Alert.alert("Payment Required", "Please choose how you'd like to pay.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not found");
      return;
    }

    const transactionId = generateTransactionReference(selectedPaymentMethod);
    const paymentLabel = selectedPaymentOption?.label || "your selected method";

    setIsProcessingPayment(true);
    try {
      createAppointment({
        patientId: user.id,
        patientName: user.name,
        clinicId: clinic.id,
        clinicName: clinic.name,
        dentistName: "Assigned Dentist",
        date: selectedDate,
        time: selectedTime,
        type: selectedService,
        status: "pending",
        paymentMethod: selectedPaymentMethod,
        paymentStatus: "paid",
        transactionId,
      });

      Alert.alert(
        "Payment Received",
        `Your ${paymentLabel} payment was recorded (Ref: ${transactionId}). The clinic will confirm shortly.`,
        [
          {
            text: "OK",
            onPress: () => navigation.navigate("PatientHome"),
          },
        ],
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
    };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Clinic Info */}
        <View style={styles.clinicInfo}>
          <View style={styles.clinicIcon}>
            <Ionicons name="business" size={24} color="#00BFA6" />
          </View>
          <View style={styles.clinicDetails}>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            <Text style={styles.clinicAddress}>{clinic.address}</Text>
          </View>
        </View>

        {/* Select Service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Service</Text>
          <View style={styles.servicesGrid}>
            {clinic.servicesOffered.map((service, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.serviceCard,
                  selectedService === service && styles.serviceCardSelected,
                ]}
                onPress={() => setSelectedService(service)}
              >
                <Ionicons
                  name={
                    selectedService === service ? "checkmark-circle" : "medical"
                  }
                  size={24}
                  color={selectedService === service ? "#00BFA6" : "#666"}
                />
                <Text
                  style={[
                    styles.serviceText,
                    selectedService === service && styles.serviceTextSelected,
                  ]}
                >
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Select Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          {availableDates.length === 0 ? (
            <View style={styles.inlineMessageCard}>
              <Text style={styles.inlineMessageText}>
                This clinic has no available appointment days right now.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.datesScroll}
            >
              {availableDates.map((date, index) => {
                const formattedDate = formatDate(date);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateCard,
                      selectedDate === date && styles.dateCardSelected,
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      style={[
                        styles.dateDay,
                        selectedDate === date && styles.dateTextSelected,
                      ]}
                    >
                      {formattedDate.day}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        selectedDate === date && styles.dateTextSelected,
                      ]}
                    >
                      {formattedDate.date}
                    </Text>
                    <Text
                      style={[
                        styles.dateMonth,
                        selectedDate === date && styles.dateTextSelected,
                      ]}
                    >
                      {formattedDate.month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Select Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
          {!selectedDate ? (
            <View style={styles.inlineMessageCard}>
              <Text style={styles.inlineMessageText}>
                Select an available day first.
              </Text>
            </View>
          ) : availableTimes.length === 0 ? (
            <View style={styles.inlineMessageCard}>
              <Text style={styles.inlineMessageText}>
                No available time slots for this day.
              </Text>
            </View>
          ) : (
            <View style={styles.timesGrid}>
              {availableTimes.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeCard,
                    selectedTime === time && styles.timeCardSelected,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Ionicons
                    name="time"
                    size={18}
                    color={selectedTime === time ? "#FFF" : "#666"}
                  />
                  <Text
                    style={[
                      styles.timeText,
                      selectedTime === time && styles.timeTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_OPTIONS.map((option) => {
              const isSelected = selectedPaymentMethod === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.paymentCard,
                    isSelected && styles.paymentCardSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(option.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Pay with ${option.label}`}
                >
                  <View
                    style={[
                      styles.paymentIconBadge,
                      { borderColor: option.accent },
                      isSelected && { backgroundColor: option.accent },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? "#FFF" : option.accent}
                    />
                  </View>
                  <View style={styles.paymentCardBody}>
                    <Text
                      style={[
                        styles.paymentTitle,
                        isSelected && styles.paymentTitleSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.paymentSubtitle}>
                      {option.description}
                    </Text>
                    <Text style={styles.paymentHelper}>{option.helper}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#00BFA6"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.paymentHint}>
            <Ionicons name="shield-checkmark" size={16} color="#10B981" />
            <Text style={styles.paymentHintText}>
              Secure payments. Your transaction will be saved with the
              appointment record.
            </Text>
          </View>
        </View>

        {/* Summary */}
        {selectedService && selectedDate && selectedTime && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Appointment Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{selectedService}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date:</Text>
              <Text style={styles.summaryValue}>{selectedDate}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time:</Text>
              <Text style={styles.summaryValue}>{selectedTime}</Text>
            </View>
            {selectedPaymentOption ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment:</Text>
                <View style={styles.paymentSummaryBadge}>
                  <Ionicons
                    name={selectedPaymentOption.icon}
                    size={16}
                    color={selectedPaymentOption.accent}
                  />
                  <Text style={styles.paymentSummaryText}>
                    {selectedPaymentOption.label}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedService ||
              !selectedDate ||
              !selectedTime ||
              !selectedPaymentMethod ||
              isProcessingPayment) &&
              styles.bookButtonDisabled,
          ]}
          onPress={handleBookAppointment}
          disabled={
            !selectedService ||
            !selectedDate ||
            !selectedTime ||
            !selectedPaymentMethod ||
            isProcessingPayment
          }
        >
          <Text style={styles.bookButtonText}>
            {isProcessingPayment ? "Processing..." : "Confirm & Pay"}
          </Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  clinicInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  clinicIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F7F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  clinicDetails: {
    flex: 1,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  clinicAddress: {
    fontSize: 13,
    color: "#666",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  inlineMessageCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inlineMessageText: {
    color: "#666",
    fontSize: 14,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    marginRight: 8,
    marginBottom: 8,
  },
  serviceCardSelected: {
    backgroundColor: "#E0F7F4",
    borderColor: "#00BFA6",
  },
  serviceText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  serviceTextSelected: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  datesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dateCard: {
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    minWidth: 70,
  },
  dateCardSelected: {
    backgroundColor: "#00BFA6",
    borderColor: "#00BFA6",
  },
  dateDay: {
    fontSize: 12,
    color: "#999",
    marginBottom: 5,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  dateMonth: {
    fontSize: 12,
    color: "#999",
  },
  dateTextSelected: {
    color: "#FFF",
  },
  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paymentGrid: {
    gap: 12,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 14,
  },
  paymentCardSelected: {
    borderColor: "#00BFA6",
    backgroundColor: "#ECFDF5",
  },
  paymentIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  paymentCardBody: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  paymentTitleSelected: {
    color: "#065F46",
  },
  paymentSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  paymentHelper: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 4,
    fontWeight: "500",
  },
  paymentHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  paymentHintText: {
    flex: 1,
    color: "#047857",
    fontSize: 13,
    lineHeight: 18,
  },
  timeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    marginRight: 8,
    marginBottom: 8,
  },
  timeCardSelected: {
    backgroundColor: "#00BFA6",
    borderColor: "#00BFA6",
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  timeTextSelected: {
    color: "#FFF",
    fontWeight: "600",
  },
  summary: {
    backgroundColor: "#E3F2FD",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentSummaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 6,
  },
  paymentSummaryText: {
    fontSize: 13,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  bookButton: {
    backgroundColor: "#00BFA6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  bookButtonDisabled: {
    backgroundColor: "#CCC",
  },
  bookButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
