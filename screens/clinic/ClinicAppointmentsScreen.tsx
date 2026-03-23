import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Appointment, StaffMember } from "../../data/mockData";
import {
    assignDentistToAppointment,
    getAppointmentsByClinic,
    getStaffByClinic,
    updateAppointmentStatus,
} from "../../services/dataService";
import { db } from "../../services/firebase";

interface ClinicAppointmentsScreenProps {
  navigation: any;
}

export default function ClinicAppointmentsScreen({
  navigation,
}: ClinicAppointmentsScreenProps) {
  const { clinic } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<StaffMember[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [appointmentToAssign, setAppointmentToAssign] =
    useState<Appointment | null>(null);
  const [customDentistName, setCustomDentistName] = useState("");

  useEffect(() => {
    if (!clinic) {
      setAppointments([]);
      return;
    }

    const fetchedAppointments = getAppointmentsByClinic(clinic.id);
    setAppointments(fetchedAppointments);
  }, [clinic, refreshTrigger]);

  useEffect(() => {
    let isMounted = true;

    const loadDentists = async () => {
      if (!clinic) {
        if (isMounted) {
          setDentists([]);
        }
        return;
      }

      try {
        const staffQuery = query(
          collection(db, "staffMembers"),
          where("clinicId", "==", clinic.id),
        );
        const snapshot = await getDocs(staffQuery);
        const fetchedStaff: StaffMember[] = snapshot.docs.map((staffDoc) => {
          const staffData = staffDoc.data() as Omit<StaffMember, "id">;
          return {
            id: staffDoc.id,
            ...staffData,
          };
        });

        if (isMounted) {
          setDentists(fetchedStaff);
        }
      } catch (error) {
        if (isMounted) {
          setDentists(getStaffByClinic(clinic.id));
        }
      }
    };

    void loadDentists();

    return () => {
      isMounted = false;
    };
  }, [clinic, refreshTrigger]);

  const availableDentists = useMemo(
    () =>
      dentists.filter(
        (staff) =>
          staff.role.toLowerCase().includes("dentist") &&
          staff.status?.toLowerCase() === "active",
      ),
    [dentists],
  );

  if (!clinic) {
    return null;
  }

  const openAssignModal = (appointment: Appointment) => {
    setAppointmentToAssign(appointment);
    setAssignModalVisible(true);
  };

  const closeAssignModal = () => {
    setAssignModalVisible(false);
    setAppointmentToAssign(null);
    setCustomDentistName("");
  };

  const handleDentistSelection = (dentist: StaffMember) => {
    if (!appointmentToAssign) {
      return;
    }

    const success = assignDentistToAppointment(
      appointmentToAssign.id,
      dentist.name,
    );

    if (success) {
      Alert.alert(
        "Dentist Assigned",
        `${dentist.name} is now assigned to ${appointmentToAssign.patientName}.`,
      );
      closeAssignModal();
      setRefreshTrigger((prev) => prev + 1);
    } else {
      Alert.alert("Error", "Failed to assign dentist");
    }
  };

  const handleManualDentistAssign = () => {
    if (!appointmentToAssign) {
      return;
    }

    const trimmedName = customDentistName.trim();
    if (!trimmedName) {
      Alert.alert("Missing Name", "Please enter a dentist name first.");
      return;
    }

    const success = assignDentistToAppointment(
      appointmentToAssign.id,
      trimmedName,
    );
    if (success) {
      Alert.alert(
        "Dentist Assigned",
        `${trimmedName} is now assigned to ${appointmentToAssign.patientName}.`,
      );
      setCustomDentistName("");
      closeAssignModal();
      setRefreshTrigger((prev) => prev + 1);
    } else {
      Alert.alert("Error", "Failed to assign dentist");
    }
  };

  const formatDentistName = (name?: string) => {
    if (!name || !name.trim()) {
      return "Dentist not assigned";
    }

    const trimmed = name.trim();
    return trimmed.toLowerCase().startsWith("dr.") ? trimmed : `Dr. ${trimmed}`;
  };

  const filteredAppointments = appointments.filter((apt) =>
    selectedFilter === "all" ? true : apt.status === selectedFilter,
  );

  const statusTabs: Array<{
    key: typeof selectedFilter;
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All", count: appointments.length },
    {
      key: "pending",
      label: "Pending",
      count: appointments.filter((a) => a.status === "pending").length,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      count: appointments.filter((a) => a.status === "confirmed").length,
    },
    {
      key: "completed",
      label: "Completed",
      count: appointments.filter((a) => a.status === "completed").length,
    },
    {
      key: "cancelled",
      label: "Rejected",
      count: appointments.filter((a) => a.status === "cancelled").length,
    },
  ];

  const handleUpdateStatus = async (
    appointmentId: string,
    newStatus: Appointment["status"],
  ) => {
    if (
      newStatus === "confirmed" &&
      !appointments.find((apt) => apt.id === appointmentId)?.dentistName
    ) {
      Alert.alert(
        "Assign Dentist",
        "Please assign a dentist before accepting this appointment.",
      );
      return;
    }

    try {
      const success = await updateAppointmentStatus(appointmentId, newStatus);
      if (success) {
        Alert.alert("Success", `Appointment ${newStatus}`);
        setRefreshTrigger((prev) => prev + 1);
      } else {
        Alert.alert("Error", "Failed to update appointment");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update appointment");
    }
  };

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

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Ionicons name="grid-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Appointments</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <Text style={styles.headerSubtitle}>
          Review patient appointment requests
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsContent}>
          {statusTabs.map((tabItem) => {
            const isActive = selectedFilter === tabItem.key;
            return (
              <TouchableOpacity
                key={tabItem.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setSelectedFilter(tabItem.key)}
              >
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tabItem.label}
                </Text>
                <Text
                  style={[styles.tabCount, isActive && styles.tabCountActive]}
                >
                  {tabItem.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Appointments List */}
      <ScrollView style={styles.content}>
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No appointments found</Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => {
            const hasDentistAssigned =
              typeof appointment.dentistName === "string" &&
              appointment.dentistName.trim().length > 0;

            return (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.patientInfo}>
                    <View style={styles.patientAvatar}>
                      <Text style={styles.avatarText}>
                        {appointment.patientName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </Text>
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>
                        {appointment.patientName}
                      </Text>
                      <Text style={styles.appointmentType}>
                        {appointment.type}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {appointment.status.charAt(0).toUpperCase() +
                        appointment.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      {formatDentistName(appointment.dentistName)}
                    </Text>
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

                {(appointment.status === "pending" ||
                  appointment.status === "confirmed") && (
                  <View style={styles.assignRow}>
                    <View style={styles.assignTextGroup}>
                      <Text style={styles.assignLabel}>
                        {hasDentistAssigned
                          ? `Assigned Dentist: ${formatDentistName(appointment.dentistName)}`
                          : "No dentist assigned yet"}
                      </Text>
                      {!hasDentistAssigned && (
                        <Text style={styles.assignHint}>
                          Assign a dentist before approving this request.
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.assignButton,
                        hasDentistAssigned
                          ? styles.assignButtonSecondary
                          : styles.assignButtonPrimary,
                      ]}
                      onPress={() => openAssignModal(appointment)}
                    >
                      <Text
                        style={
                          hasDentistAssigned
                            ? styles.assignButtonSecondaryText
                            : styles.assignButtonPrimaryText
                        }
                      >
                        {hasDentistAssigned ? "Change" : "Assign"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {appointment.status === "pending" && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={() =>
                        void handleUpdateStatus(appointment.id, "confirmed")
                      }
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFF"
                      />
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() =>
                        void handleUpdateStatus(appointment.id, "cancelled")
                      }
                    >
                      <Ionicons name="close-circle" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {appointment.status === "confirmed" && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() =>
                        void handleUpdateStatus(appointment.id, "completed")
                      }
                    >
                      <Text style={styles.actionButtonText}>
                        Mark as Completed
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={assignModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Dentist</Text>
            {availableDentists.length === 0 ? (
              <View style={styles.noDentistState}>
                <Ionicons name="warning-outline" size={36} color="#FFB300" />
                <Text style={styles.noDentistText}>
                  No active dentists found for this clinic.
                </Text>
                <Text style={styles.noDentistSubtext}>
                  Activate a dentist from Staff Management or assign one
                  manually below.
                </Text>
                <TextInput
                  style={styles.manualInput}
                  placeholder="Enter dentist name"
                  placeholderTextColor="#AAA"
                  value={customDentistName}
                  onChangeText={setCustomDentistName}
                />
                <TouchableOpacity
                  style={[
                    styles.manualAssignButton,
                    !customDentistName.trim() &&
                      styles.manualAssignButtonDisabled,
                  ]}
                  onPress={handleManualDentistAssign}
                  disabled={!customDentistName.trim()}
                >
                  <Text style={styles.manualAssignButtonText}>
                    Assign Dentist
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.dentistList}>
                {availableDentists.map((dentist) => (
                  <TouchableOpacity
                    key={dentist.id}
                    style={styles.dentistCard}
                    onPress={() => handleDentistSelection(dentist)}
                  >
                    <Text style={styles.dentistName}>{dentist.name}</Text>
                    <Text style={styles.dentistRole}>{dentist.role}</Text>
                    <Text style={styles.dentistAvailability}>
                      {dentist.status?.toLowerCase() === "active"
                        ? "Available"
                        : "Unavailable"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeAssignModal}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dashboardButton: {
    padding: 5,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 34,
  },
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: "column",
    rowGap: 8,
  },
  tab: {
    width: "84%",
    alignSelf: "center",
    height: 55,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActive: {
    backgroundColor: "#00BFA6",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#E3FFF9",
  },
  tabCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  tabCountActive: {
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
    marginBottom: 12,
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
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  appointmentType: {
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
    color: "#FFF",
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
  assignRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#F0F0F0",
    gap: 12,
  },
  assignTextGroup: {
    flex: 1,
  },
  assignLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  assignHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  assignButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
  },
  assignButtonPrimary: {
    backgroundColor: "#00BFA6",
  },
  assignButtonSecondary: {
    backgroundColor: "#E0F2F0",
  },
  assignButtonPrimaryText: {
    color: "#FFF",
    fontWeight: "600",
  },
  assignButtonSecondaryText: {
    color: "#007F6D",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#F44336",
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#00BFA6",
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  dentistList: {
    maxHeight: 280,
  },
  dentistCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dentistName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  dentistRole: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  dentistAvailability: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  noDentistState: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  noDentistText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  noDentistSubtext: {
    textAlign: "center",
    color: "#888",
    fontSize: 13,
    marginHorizontal: 10,
  },
  manualInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    color: "#111",
  },
  manualAssignButton: {
    width: "100%",
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#00BFA6",
    alignItems: "center",
  },
  manualAssignButtonDisabled: {
    backgroundColor: "#A0DAD1",
  },
  manualAssignButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
