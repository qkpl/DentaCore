import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Clinic } from "../../data/mockData";
import { createAppointment } from "../../services/dataService";

interface BookAppointmentScreenProps {
  route: any;
  navigation: any;
}

export default function BookAppointmentScreen({
  route,
  navigation,
}: BookAppointmentScreenProps) {
  const { clinic }: { clinic: Clinic } = route.params;
  const { user } = useAuth();

  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Mock available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date.toISOString().split("T")[0];
  });

  // Mock available times
  const availableTimes = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
  ];

  const handleBookAppointment = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      Alert.alert("Incomplete", "Please select service, date, and time");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not found");
      return;
    }

    const newAppointment = createAppointment({
      patientId: user.id,
      patientName: user.name,
      clinicId: clinic.id,
      clinicName: clinic.name,
      dentistName: "Smith",
      date: selectedDate,
      time: selectedTime,
      type: selectedService,
      status: "pending",
    });

    Alert.alert(
      "Success",
      "Your appointment request has been submitted. The clinic will confirm shortly.",
      [
        {
          text: "OK",
          onPress: () => navigation.navigate("PatientHome"),
        },
      ],
    );
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
        </View>

        {/* Select Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time</Text>
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
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (!selectedService || !selectedDate || !selectedTime) &&
              styles.bookButtonDisabled,
          ]}
          onPress={handleBookAppointment}
          disabled={!selectedService || !selectedDate || !selectedTime}
        >
          <Text style={styles.bookButtonText}>Confirm Booking</Text>
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
