import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Appointment } from "../../data/mockData";
import {
    deleteAppointment,
    getAppointmentsByPatient,
} from "../../services/dataService";
import RescheduleAppointmentScreen from "./RescheduleAppointmentScreen";

interface AppointmentsScreenProps {
  navigation: any;
}

export default function AppointmentsScreen({
  navigation,
}: AppointmentsScreenProps) {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<
    "all" | "pending" | "confirmed" | "completed"
  >("all");
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const appointments = user ? getAppointmentsByPatient(user.id) : [];

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedTab === "all") return true;
    return apt.status === selectedTab;
  });

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "#4CAF50";
      case "pending":
        return "#FFB300";
      case "completed":
        return "#666";
      case "cancelled":
        return "#F44336";
      default:
        return "#999";
    }
  };

  const getStatusBgColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "#E8F5E9";
      case "pending":
        return "#FFF3E0";
      case "completed":
        return "#F5F5F5";
      case "cancelled":
        return "#FFEBEE";
      default:
        return "#F5F5F5";
    }
  };

  const handleViewDetails = (appointment: Appointment) => {
    Alert.alert(
      "Appointment Details",
      `Clinic: ${appointment.clinicName}\nDoctor: ${appointment.dentistName}\nType: ${appointment.type}\nDate: ${appointment.date}\nTime: ${appointment.time}\nStatus: ${appointment.status}`,
      [{ text: "OK" }],
    );
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleModalVisible(true);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment with ${appointment.clinicName}?\n\nDate: ${appointment.date}\nTime: ${appointment.time}`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            const success = deleteAppointment(appointment.id);
            if (success) {
              Alert.alert("Cancelled", "Appointment cancelled successfully");
              setRefreshTrigger((prev) => prev + 1);
            } else {
              Alert.alert("Error", "Failed to cancel appointment");
            }
          },
        },
      ],
    );
  };

  const handleRescheduleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
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
          <Text style={styles.navTitle}>My Appointments</Text>
          <Text style={styles.headerSubtitle}>Manage your dental visits</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity
          style={[styles.tab, selectedTab === "all" && styles.tabActive]}
          onPress={() => setSelectedTab("all")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "all" && styles.tabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "confirmed" && styles.tabActive]}
          onPress={() => setSelectedTab("confirmed")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "confirmed" && styles.tabTextActive,
            ]}
          >
            Confirmed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "pending" && styles.tabActive]}
          onPress={() => setSelectedTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "pending" && styles.tabTextActive,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "completed" && styles.tabActive]}
          onPress={() => setSelectedTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "completed" && styles.tabTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Appointments List */}
      <ScrollView style={styles.content}>
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No appointments found</Text>
            <Text style={styles.emptySubtext}>
              {selectedTab === "all"
                ? "Book your first appointment"
                : `No ${selectedTab} appointments`}
            </Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <View key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.clinicInfo}>
                  <Text style={styles.clinicName}>
                    {appointment.clinicName}
                  </Text>
                  <Text style={styles.doctorName}>
                    Dr. {appointment.dentistName}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusBgColor(appointment.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(appointment.status) },
                    ]}
                  >
                    {appointment.status.charAt(0).toUpperCase() +
                      appointment.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="medical" size={16} color="#666" />
                  <Text style={styles.detailText}>{appointment.type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.detailText}>{appointment.date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.detailText}>{appointment.time}</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewDetails(appointment)}
                >
                  <Text style={styles.actionButtonText}>View Details</Text>
                </TouchableOpacity>
                {appointment.status !== "completed" &&
                  appointment.status !== "cancelled" && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.actionButtonPrimary,
                        ]}
                        onPress={() => handleReschedule(appointment)}
                      >
                        <Text style={styles.actionButtonTextPrimary}>
                          Reschedule
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonDanger]}
                        onPress={() => handleCancelAppointment(appointment)}
                      >
                        <Text style={styles.actionButtonTextDanger}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <RescheduleAppointmentScreen
        visible={rescheduleModalVisible}
        appointment={selectedAppointment}
        onClose={() => setRescheduleModalVisible(false)}
        onSuccess={handleRescheduleSuccess}
      />
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  homeButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  navTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 34,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  tabsContainer: {
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  tabActive: {
    backgroundColor: "#00BFA6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#FFF",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#00BFA6",
    alignItems: "center",
  },
  actionButtonPrimary: {
    backgroundColor: "#00BFA6",
    borderColor: "#00BFA6",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00BFA6",
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  actionButtonDanger: {
    backgroundColor: "#FFF",
    borderColor: "#F44336",
  },
  actionButtonTextDanger: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#999",
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 5,
  },
});
