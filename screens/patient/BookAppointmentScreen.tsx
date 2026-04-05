import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Clinic, PaymentMethod } from "../../data/mockData";
import { createAppointment, getServicePrice } from "../../services/dataService";
import { createPayPalOrder } from "../../services/paypalService";

WebBrowser.maybeCompleteAuthSession();

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

const buildTimeSlots = (operatingHours: string): TimeSlot[] => {
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

  const slots: TimeSlot[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    slots.push({
      id: `${hour}`,
      label: formatSlot(hour),
    });
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

interface TimeSlot {
  id: string;
  label: string;
}

interface PaymentSuccessState {
  title: string;
  message: string;
  transactionId: string;
  paymentLabel: string;
  amountLabel: string;
}

const CURRENCY_CODE = "PHP";

const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return "₱0";
  }

  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: CURRENCY_CODE,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    return `₱${Math.round(amount).toLocaleString("en-PH")}`;
  }
};

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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessState, setPaymentSuccessState] =
    useState<PaymentSuccessState | null>(null);

  const handleDismissPaymentSuccess = () => {
    setPaymentSuccessState(null);
    navigation.reset({ index: 0, routes: [{ name: "PatientHome" }] });
  };

  const showPaymentSuccessModal = (
    title: string,
    message: string,
    transactionId: string,
    paymentLabel: string,
    amount: number,
  ) => {
    setPaymentSuccessState({
      title,
      message,
      transactionId,
      paymentLabel,
      amountLabel: formatCurrency(amount),
    });
  };

  const clinicDescriptionCopy =
    clinic.description || "Trusted neighborhood dental care.";
  const clinicRatingCopy =
    typeof clinic.rating === "number"
      ? `${clinic.rating.toFixed(1)} rating`
      : "Verified partner";
  const clinicPatientsCopy =
    typeof clinic.totalPatients === "number"
      ? `${clinic.totalPatients}+ patients cared for`
      : "Neighborhood favorite";

  const selectedServicePrice = useMemo(() => {
    if (!selectedService) {
      return null;
    }
    return getServicePrice(selectedService);
  }, [selectedService]);

  const formattedSelectedServicePrice = useMemo(() => {
    if (selectedServicePrice === null) {
      return null;
    }
    return formatCurrency(selectedServicePrice);
  }, [selectedServicePrice]);

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

  const availableTimeSlots = useMemo(() => {
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
    if (
      selectedTimeSlot &&
      !availableTimeSlots.some((slot) => slot.id === selectedTimeSlot.id)
    ) {
      setSelectedTimeSlot(null);
    }
  }, [availableTimeSlots, selectedTimeSlot]);

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTimeSlot) {
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

    const paymentLabel = selectedPaymentOption?.label || "your selected method";
    const paymentAmount =
      selectedServicePrice ?? getServicePrice(selectedService);

    setIsProcessingPayment(true);
    try {
      const baseAppointmentPayload = {
        patientId: user.id,
        patientName: user.name,
        clinicId: clinic.id,
        clinicName: clinic.name,
        dentistName: "Assigned Dentist",
        date: selectedDate,
        time: selectedTimeSlot.label,
        type: selectedService,
        status: "pending" as const,
        paymentMethod: selectedPaymentMethod,
        amount: paymentAmount,
        currency: CURRENCY_CODE,
      };

      if (selectedPaymentMethod === "paypal") {
        const callbackUrl = Linking.createURL("paypal-success");
        const cancelUrl = Linking.createURL("paypal-cancel");

        const paypalOrder = await createPayPalOrder({
          amount: paymentAmount,
          currencyCode: CURRENCY_CODE,
          description: `${selectedService} • ${clinic.name}`,
          brandName: clinic.name,
          returnUrl: callbackUrl,
          cancelUrl,
        });

        const browserResult = await WebBrowser.openAuthSessionAsync(
          paypalOrder.approvalUrl,
          callbackUrl,
        );

        if (browserResult.type === "success" && browserResult.url) {
          const parsed = Linking.parse(browserResult.url);
          const tokenParam = parsed.queryParams?.token;
          const transactionId =
            typeof tokenParam === "string" && tokenParam.length > 0
              ? tokenParam
              : paypalOrder.orderId;

          createAppointment({
            ...baseAppointmentPayload,
            paymentStatus: "paid",
            transactionId,
          });
          showPaymentSuccessModal(
            "Payment Successful",
            "Your PayPal payment was confirmed and your slot is now secured.",
            transactionId,
            "PayPal",
            paymentAmount,
          );
        } else {
          Alert.alert(
            "Payment Cancelled",
            "You closed PayPal before finishing the payment. No appointment was created.",
          );
        }
      } else {
        const transactionId = generateTransactionReference(
          selectedPaymentMethod,
        );

        createAppointment({
          ...baseAppointmentPayload,
          paymentStatus: "paid",
          transactionId,
        });
        showPaymentSuccessModal(
          "Payment Received",
          `Your ${paymentLabel} payment was recorded and your appointment is confirmed.`,
          transactionId,
          paymentLabel,
          paymentAmount,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while processing your payment.";
      Alert.alert("Payment Error", message);
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
        <View>
          <Text style={styles.headerTitle}>Book Appointment</Text>
          <Text style={styles.headerSubtitle}>Plan your next visit</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Clinic Info */}
        <View style={styles.clinicInfo}>
          <View style={styles.clinicIcon}>
            <Ionicons name="business" size={24} color="#0F766E" />
          </View>
          <View style={styles.clinicDetails}>
            <Text style={styles.clinicName}>{clinic.name}</Text>
            <Text style={styles.clinicAddress}>{clinic.address}</Text>
            {clinicDescriptionCopy ? (
              <Text style={styles.clinicDescription} numberOfLines={2}>
                {clinicDescriptionCopy}
              </Text>
            ) : null}
            <View style={styles.clinicMetaRow}>
              <View style={styles.clinicMetaPill}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={styles.clinicMetaText}>{clinicRatingCopy}</Text>
              </View>
              <View style={styles.clinicMetaPill}>
                <Ionicons name="people" size={14} color="#0EA5E9" />
                <Text style={styles.clinicMetaText}>{clinicPatientsCopy}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Select Service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Service</Text>
          <Text style={styles.sectionHelper}>
            Choose the treatment you want to book.
          </Text>
          <View style={styles.servicesGrid}>
            {clinic.servicesOffered.map((service, index) => {
              const price = getServicePrice(service);
              const formattedPrice = formatCurrency(price);
              const isSelected = selectedService === service;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.serviceCard,
                    isSelected && styles.serviceCardSelected,
                  ]}
                  onPress={() => setSelectedService(service)}
                >
                  <View style={styles.serviceCardHeader}>
                    <View
                      style={[
                        styles.serviceIconBadge,
                        isSelected && styles.serviceIconBadgeSelected,
                      ]}
                    >
                      <Ionicons
                        name="medical"
                        size={20}
                        color={isSelected ? "#0F766E" : "#6B7280"}
                      />
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#0EA5E9"
                      />
                    )}
                  </View>
                  <View style={styles.serviceCopyGroup}>
                    <Text
                      style={[
                        styles.serviceText,
                        isSelected && styles.serviceTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {service}
                    </Text>
                    <Text style={styles.servicePrice}>{formattedPrice}</Text>
                    <Text style={styles.serviceHelperText}>
                      {isSelected ? "Selected" : "Tap to choose"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Select Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Text style={styles.sectionHelper}>
            Available within the next two weeks.
          </Text>
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
          <Text style={styles.sectionHelper}>
            Times adjust automatically based on your chosen day.
          </Text>
          {!selectedDate ? (
            <View style={styles.inlineMessageCard}>
              <Text style={styles.inlineMessageText}>
                Select an available day first.
              </Text>
            </View>
          ) : availableTimeSlots.length === 0 ? (
            <View style={styles.inlineMessageCard}>
              <Text style={styles.inlineMessageText}>
                No available time slots for this day.
              </Text>
            </View>
          ) : (
            <View style={styles.timesGrid}>
              {availableTimeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.timeCard,
                    selectedTimeSlot?.id === slot.id && styles.timeCardSelected,
                  ]}
                  onPress={() => setSelectedTimeSlot(slot)}
                >
                  <Ionicons
                    name="time"
                    size={18}
                    color={selectedTimeSlot?.id === slot.id ? "#FFF" : "#666"}
                  />
                  <Text
                    style={[
                      styles.timeText,
                      selectedTimeSlot?.id === slot.id &&
                        styles.timeTextSelected,
                    ]}
                  >
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text style={styles.sectionHelper}>
            Pay now to secure your slot instantly.
          </Text>
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
            <Ionicons
              name="shield-checkmark"
              size={16}
              color="#10B981"
              style={styles.paymentHintIcon}
            />
            <Text style={styles.paymentHintText}>
              Secure payments. Your transaction will be saved with the
              appointment record.
            </Text>
          </View>
        </View>

        {/* Summary */}
        {selectedService && selectedDate && selectedTimeSlot && (
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
              <Text style={styles.summaryValue}>{selectedTimeSlot.label}</Text>
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
            {formattedSelectedServicePrice ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price:</Text>
                <Text style={styles.summaryValue}>
                  {formattedSelectedServicePrice}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(paymentSuccessState)}
        transparent
        animationType="fade"
        onRequestClose={handleDismissPaymentSuccess}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={54} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>
              {paymentSuccessState?.title ?? "Payment Successful"}
            </Text>
            <Text style={styles.successMessage}>
              {paymentSuccessState?.message ??
                "Payment confirmed. Your appointment has been created."}
            </Text>

            <View style={styles.successMetaCard}>
              <View style={styles.successMetaRow}>
                <Text style={styles.successMetaLabel}>Reference</Text>
                <Text style={styles.successMetaValue}>
                  {paymentSuccessState?.transactionId}
                </Text>
              </View>
              <View style={styles.successMetaRow}>
                <Text style={styles.successMetaLabel}>Method</Text>
                <Text style={styles.successMetaValue}>
                  {paymentSuccessState?.paymentLabel}
                </Text>
              </View>
              <View style={[styles.successMetaRow, styles.successMetaRowLast]}>
                <Text style={styles.successMetaLabel}>Paid</Text>
                <Text style={styles.successAmount}>
                  {paymentSuccessState?.amountLabel}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successPrimaryButton}
              onPress={handleDismissPaymentSuccess}
            >
              <Text style={styles.successPrimaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Book Button */}
      <View style={styles.footer}>
        <View style={styles.footerSummaryRow}>
          <View>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalHelper}>
              {selectedPaymentMethod === "paypal"
                ? "Redirects to PayPal Sandbox"
                : "Payment recorded instantly"}
            </Text>
          </View>
          <Text style={styles.totalValue}>
            {formattedSelectedServicePrice ?? "—"}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedService ||
              !selectedDate ||
              !selectedTimeSlot ||
              !selectedPaymentMethod ||
              isProcessingPayment) &&
              styles.bookButtonDisabled,
          ]}
          onPress={handleBookAppointment}
          disabled={
            !selectedService ||
            !selectedDate ||
            !selectedTimeSlot ||
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0EB8A4",
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
  headerSubtitle: {
    fontSize: 13,
    color: "#ECFEFF",
    marginTop: 4,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  clinicInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E0F2F1",
    shadowColor: "#0F766E",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  clinicDescription: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 6,
  },
  clinicMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  clinicMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    marginBottom: 8,
  },
  clinicMetaText: {
    fontSize: 12,
    color: "#1F2937",
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
  sectionHelper: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: -10,
    marginBottom: 16,
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
    justifyContent: "space-between",
  },
  serviceCard: {
    width: "48%",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  serviceCardSelected: {
    borderColor: "#0EB8A4",
    shadowColor: "#0EB8A4",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  serviceCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  serviceIconBadgeSelected: {
    backgroundColor: "#CCFBF1",
  },
  serviceCopyGroup: {
    minHeight: 60,
  },
  serviceText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  serviceTextSelected: {
    color: "#0F766E",
  },
  servicePrice: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "500",
  },
  serviceHelperText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 6,
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
  },
  paymentGrid: {
    marginTop: 4,
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 12,
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
    marginRight: 12,
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
  },
  paymentHintIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  paymentHintText: {
    flex: 1,
    color: "#047857",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  footerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  totalHelper: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#00BFA6",
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
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#312E81",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D4ED8",
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
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0,
    marginLeft: 8,
  },
  paymentSummaryText: {
    fontSize: 13,
    color: "#312E81",
    fontWeight: "600",
    marginLeft: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
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
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.48)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  successModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
    elevation: 12,
  },
  successIconWrap: {
    alignItems: "center",
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "800",
    color: "#052E2B",
    textAlign: "center",
  },
  successMessage: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#334155",
    textAlign: "center",
  },
  successMetaCard: {
    marginTop: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  successMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  successMetaRowLast: {
    borderBottomWidth: 0,
  },
  successMetaLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  successMetaValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
    maxWidth: "62%",
  },
  successAmount: {
    fontSize: 16,
    color: "#047857",
    fontWeight: "800",
  },
  successPrimaryButton: {
    marginTop: 18,
    backgroundColor: "#0EA5A4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  successPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
