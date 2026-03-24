import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Appointment } from "../../data/mockData";
import {
  cancelAppointment,
  getAppointmentsByPatient,
} from "../../services/dataService";
import RescheduleAppointmentScreen from "./RescheduleAppointmentScreen";

interface AppointmentsScreenProps {
  navigation: any;
}

const STATUS_COLORS = {
  pending: {
    icon: "time-outline" as const,
    color: "#FFB300",
    bg: "#FFF7E0",
  },
  confirmed: {
    icon: "checkmark-circle-outline" as const,
    color: "#00C853",
    bg: "#E8F5E9",
  },
  completed: {
    icon: "ribbon-outline" as const,
    color: "#00C853",
    bg: "#E8F5E9",
  },
  cancelled: {
    icon: "close-circle-outline" as const,
    color: "#F44336",
    bg: "#FFE8E6",
  },
};

export default function AppointmentsScreen({
  navigation,
}: AppointmentsScreenProps) {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadAppointments = useCallback(() => {
    if (!user) {
      setAppointments([]);
      return;
    }

    const patientAppointments = getAppointmentsByPatient(user.id);
    setAppointments(patientAppointments);
  }, [user]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments, refreshTrigger]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments]),
  );

  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {
      all: appointments.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    appointments.forEach((appt) => {
      counts[appt.status] = (counts[appt.status] || 0) + 1;
    });

    return counts;
  }, [appointments]);

  const formatDentistName = (name?: string) => {
    if (!name || !name.trim()) {
      return "Awaiting dentist assignment";
    }

    const trimmed = name.trim();
    return trimmed.toLowerCase().startsWith("dr.") ? trimmed : `Dr. ${trimmed}`;
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesTab =
      selectedTab === "all" ? true : apt.status === selectedTab;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return matchesTab;

    const haystack =
      `${apt.patientName} ${apt.clinicName} ${apt.type}`.toLowerCase();
    return matchesTab && haystack.includes(normalizedQuery);
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
    const reasonLine =
      appointment.status === "cancelled" && appointment.cancellationReason
        ? `\nReason: ${appointment.cancellationReason}`
        : "";
    Alert.alert(
      "Appointment Details",
      `Clinic: ${appointment.clinicName}\nDoctor: ${formatDentistName(appointment.dentistName)}\nType: ${appointment.type}\nDate: ${appointment.date}\nTime: ${appointment.time}\nStatus: ${appointment.status}${reasonLine}`,
      [{ text: "OK" }],
    );
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleModalVisible(true);
  };

  const handleCancelAppointment = (appointment: Appointment) => {
    if (appointment.status !== "pending") {
      Alert.alert(
        "Cannot Cancel",
        "Only pending appointments can be cancelled. Please contact the clinic to make further changes.",
      );
      return;
    }

    Alert.alert(
      "Cancel Appointment",
      `Are you sure you want to cancel your appointment with ${appointment.clinicName}?\n\nDate: ${appointment.date}\nTime: ${appointment.time}`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            const success = cancelAppointment(
              appointment.id,
              "Cancelled by patient",
            );
            if (success) {
              setFeedbackMessage("Appointment cancelled successfully.");
              setRefreshTrigger((prev) => prev + 1);
              setTimeout(() => setFeedbackMessage(""), 2400);
            } else {
              setFeedbackMessage("Failed to cancel appointment.");
              setTimeout(() => setFeedbackMessage(""), 2400);
            }
          },
        },
      ],
    );
  };

  const handleRescheduleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
    setFeedbackMessage(
      "Appointment rescheduled. Waiting for clinic confirmation.",
    );
    setTimeout(() => setFeedbackMessage(""), 2400);
  };

  const pendingCount = statusSummary.pending ?? 0;

  const renderStatusTabs = () => {
    const tabs = [
      {
        key: "all",
        label: "All",
        icon: "apps-outline" as const,
        color: "#004D40",
        bg: "#E0F2F1",
      },
      { key: "pending", label: "Pending", ...STATUS_COLORS.pending },
      { key: "confirmed", label: "Confirmed", ...STATUS_COLORS.confirmed },
      { key: "completed", label: "Completed", ...STATUS_COLORS.completed },
      { key: "cancelled", label: "Cancelled", ...STATUS_COLORS.cancelled },
    ] as const;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusTabs}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.statusChip,
              selectedTab === tab.key && [
                styles.statusChipActive,
                { backgroundColor: tab.bg || "#E0F7FA" },
              ],
            ]}
            onPress={() => setSelectedTab(tab.key)}
          >
            <View style={styles.statusChipTopRow}>
              <Ionicons
                name={tab.icon}
                size={16}
                color={selectedTab === tab.key ? tab.color : "#7A7A7A"}
              />
              {tab.key === "pending" && pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.statusChipLabel,
                selectedTab === tab.key && { color: tab.color },
              ]}
            >
              {tab.label}
            </Text>
            <Text style={styles.statusChipCount}>{statusSummary[tab.key]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
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
        <View style={styles.notificationContainer}>
          <Ionicons name="notifications-outline" size={24} color="#6B7280" />
          {pendingCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
      </View>

      {feedbackMessage ? (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{feedbackMessage}</Text>
        </View>
      ) : null}

      <View style={styles.topBlock}>
        {renderStatusTabs()}

        {/* Search & Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Search clinic, service or doctor"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#B0B0B0" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="funnel-outline" size={18} color="#00BFA6" />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          filteredAppointments.map((appointment) => {
            const statusMeta = STATUS_COLORS[appointment.status] ?? {
              color: "#7A7A7A",
              bg: "#EEE",
            };

            return (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.patientInfo}>
                    <Image
                      source={{
                        uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          appointment.patientName || "Patient",
                        )}&background=00BFA6&color=fff`,
                      }}
                      style={styles.avatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>
                        {appointment.patientName}
                      </Text>
                      <Text style={styles.clinicName}>
                        {appointment.clinicName}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusMeta.bg },
                    ]}
                  >
                    <Ionicons
                      name={
                        STATUS_COLORS[appointment.status]?.icon || "ellipse"
                      }
                      size={14}
                      color={statusMeta.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: statusMeta.color },
                      ]}
                    >
                      {appointment.status === "cancelled"
                        ? "Cancelled"
                        : appointment.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.serviceChip}>
                    <Ionicons name="medkit-outline" size={16} color="#00BFA6" />
                    <Text style={styles.serviceChipText}>
                      {appointment.type}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.infoText}>{appointment.date}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.infoText}>{appointment.time}</Text>
                    </View>
                  </View>
                  <View style={styles.infoItem}>
                    <Ionicons
                      name="person-circle-outline"
                      size={16}
                      color="#6B7280"
                    />
                    <Text style={styles.infoText}>
                      {formatDentistName(appointment.dentistName)}
                    </Text>
                  </View>
                  {appointment.status === "cancelled" &&
                    appointment.cancellationReason && (
                      <View style={styles.cancellationBanner}>
                        <Ionicons
                          name="alert-circle-outline"
                          size={16}
                          color="#B45309"
                        />
                        <Text style={styles.cancellationText}>
                          {appointment.cancellationReason}
                        </Text>
                      </View>
                    )}
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => handleViewDetails(appointment)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#00BFA6" />
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                  {(() => {
                    const canReschedule =
                      appointment.status === "pending" ||
                      appointment.status === "confirmed";
                    const canCancel = appointment.status === "pending";

                    if (!canReschedule && !canCancel) {
                      return null;
                    }

                    return (
                      <View style={styles.secondaryActions}>
                        {canReschedule && (
                          <TouchableOpacity
                            style={styles.secondaryActionButton}
                            onPress={() => handleReschedule(appointment)}
                          >
                            <Ionicons name="calendar" size={14} color="#FFF" />
                            <Text style={styles.secondaryActionText}>
                              Reschedule
                            </Text>
                          </TouchableOpacity>
                        )}
                        {canCancel && (
                          <TouchableOpacity
                            style={[
                              styles.secondaryActionButton,
                              styles.secondaryDanger,
                            ]}
                            onPress={() => handleCancelAppointment(appointment)}
                          >
                            <Ionicons name="close" size={14} color="#FFF" />
                            <Text style={styles.secondaryActionText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })()}
                </View>
              </View>
            );
          })
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
  topBlock: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  statusTabs: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  statusChip: {
    width: 88,
    height: 88,
    padding: 10,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: "#F6F8FA",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statusChipActive: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusChipTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChipLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusChipCount: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  badge: {
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#FF1744",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingBottom: 0,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00BFA6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  filterText: {
    color: "#00BFA6",
    fontWeight: "600",
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginTop: 0,
  },
  appointmentCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  clinicName: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  cardBody: {
    marginTop: 12,
    gap: 8,
  },
  cancellationBanner: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancellationText: {
    flex: 1,
    color: "#92400E",
    fontSize: 13,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E6FFFA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  serviceChipText: {
    fontSize: 12,
    color: "#047857",
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: "#111827",
  },
  cardActions: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    gap: 10,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewDetailsText: {
    color: "#0284C7",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00BFA6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryDanger: {
    backgroundColor: "#EF4444",
  },
  secondaryActionText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
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
  feedbackBanner: {
    backgroundColor: "#E0F2F1",
    borderLeftWidth: 4,
    borderLeftColor: "#00BFA6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  feedbackText: {
    color: "#00695C",
    fontSize: 13,
    fontWeight: "600",
  },
  notificationContainer: {
    width: 34,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF1744",
    minWidth: 16,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
