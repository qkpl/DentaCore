/**
 * Reschedule Appointment Screen
 * Allows patients to reschedule existing appointments
 */

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Appointment } from "../../data/mockData";
import {
    getBlockingAppointmentForDentist,
    updateAppointment,
} from "../../services/dataService";

interface RescheduleAppointmentScreenProps {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RescheduleAppointmentScreen({
  visible,
  appointment,
  onClose,
  onSuccess,
}: RescheduleAppointmentScreenProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date.toISOString().split("T")[0];
  });

  // Available time slots
  const availableTimes = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
  ];

  const unavailableTimes = useMemo(() => {
    if (!appointment?.dentistName || !selectedDate) {
      return new Set<string>();
    }

    const blocked = new Set<string>();
    availableTimes.forEach((time) => {
      const conflict = getBlockingAppointmentForDentist(
        appointment.dentistName,
        selectedDate,
        time,
        appointment.id,
      );
      if (conflict) {
        blocked.add(time);
      }
    });

    return blocked;
  }, [appointment?.dentistName, appointment?.id, selectedDate]);

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

  const handleConfirmReschedule = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert("Incomplete", "Please select both date and time");
      return;
    }

    if (!appointment) return;

    const conflict = getBlockingAppointmentForDentist(
      appointment.dentistName,
      selectedDate,
      selectedTime,
      appointment.id,
    );
    if (conflict) {
      Alert.alert(
        "Doctor Not Available",
        `${appointment.dentistName} already has another patient on ${conflict.date} at ${conflict.time}. Please choose another slot.`,
      );
      return;
    }

    const success = updateAppointment(appointment.id, {
      date: selectedDate,
      time: selectedTime,
      status: "pending",
    });

    if (success) {
      Alert.alert(
        "Success",
        "Appointment rescheduled successfully. The clinic will confirm your new schedule.",
        [
          {
            text: "OK",
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ],
      );
    } else {
      Alert.alert("Error", "Failed to reschedule appointment");
    }
  };

  if (!appointment) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule Appointment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Current Appointment Info */}
          <View style={styles.currentAppointment}>
            <Text style={styles.sectionTitle}>Current Appointment</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="business" size={20} color="#00BFA6" />
                <Text style={styles.infoText}>{appointment.clinicName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#00BFA6" />
                <Text style={styles.infoText}>{appointment.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={20} color="#00BFA6" />
                <Text style={styles.infoText}>{appointment.time}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="medkit" size={20} color="#00BFA6" />
                <Text style={styles.infoText}>{appointment.type}</Text>
              </View>
            </View>
          </View>

          {/* Select New Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select New Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dateScroll}
            >
              {availableDates.map((date) => {
                const formatted = formatDate(date);
                const isSelected = selectedDate === date;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardSelected,
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      style={[
                        styles.dateDay,
                        isSelected && styles.dateTextSelected,
                      ]}
                    >
                      {formatted.day}
                    </Text>
                    <Text
                      style={[
                        styles.dateNumber,
                        isSelected && styles.dateTextSelected,
                      ]}
                    >
                      {formatted.date}
                    </Text>
                    <Text
                      style={[
                        styles.dateMonth,
                        isSelected && styles.dateTextSelected,
                      ]}
                    >
                      {formatted.month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Select New Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select New Time</Text>
            <View style={styles.timeGrid}>
              {availableTimes.map((time) => {
                const isSelected = selectedTime === time;
                const isUnavailable = unavailableTimes.has(time);
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotSelected,
                      isUnavailable && styles.timeSlotUnavailable,
                    ]}
                    onPress={() => setSelectedTime(time)}
                    disabled={isUnavailable}
                  >
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={
                        isUnavailable
                          ? "#9CA3AF"
                          : isSelected
                            ? "#FFF"
                            : "#00BFA6"
                      }
                    />
                    <Text
                      style={[
                        styles.timeText,
                        isSelected && styles.timeTextSelected,
                        isUnavailable && styles.timeTextUnavailable,
                      ]}
                    >
                      {isUnavailable ? `${time} (Not available)` : time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedDate || !selectedTime) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmReschedule}
            disabled={!selectedDate || !selectedTime}
          >
            <Text style={styles.confirmButtonText}>Confirm Reschedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 38,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentAppointment: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  section: {
    marginBottom: 30,
  },
  dateScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dateCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginRight: 12,
    minWidth: 80,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F0F0F0",
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
    color: "#666",
  },
  dateTextSelected: {
    color: "#FFF",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#F0F0F0",
    gap: 8,
  },
  timeSlotSelected: {
    backgroundColor: "#00BFA6",
    borderColor: "#00BFA6",
  },
  timeSlotUnavailable: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timeTextSelected: {
    color: "#FFF",
  },
  timeTextUnavailable: {
    color: "#9CA3AF",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  confirmButton: {
    backgroundColor: "#00BFA6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#CCC",
  },
  confirmButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
