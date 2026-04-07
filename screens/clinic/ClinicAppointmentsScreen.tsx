import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import type {
    Appointment,
    PaymentMethod,
    StaffMember,
} from "../../data/mockData";
import {
    assignDentistToAppointment,
    getAppointmentsByClinic,
    getBlockingAppointmentForDentist,
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
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsAppointment, setDetailsAppointment] =
    useState<Appointment | null>(null);
  const [appointmentToAssign, setAppointmentToAssign] =
    useState<Appointment | null>(null);
  const [customDentistName, setCustomDentistName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadAssignableTeamMembers = useCallback(async () => {
    if (!clinic) {
      setDentists([]);
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

      setDentists(fetchedStaff);
    } catch (error) {
      setDentists(getStaffByClinic(clinic.id));
    }
  }, [clinic]);

  useEffect(() => {
    if (!clinic) {
      setAppointments([]);
      return;
    }

    const fetchedAppointments = getAppointmentsByClinic(clinic.id);
    setAppointments(fetchedAppointments);
  }, [clinic, refreshTrigger]);

  useEffect(() => {
    void loadAssignableTeamMembers();
  }, [loadAssignableTeamMembers, refreshTrigger]);

  useFocusEffect(
    useCallback(() => {
      void loadAssignableTeamMembers();
    }, [loadAssignableTeamMembers]),
  );

  const availableProviders = useMemo(
    () => dentists.filter((staff) => staff.status?.toLowerCase() === "active"),
    [dentists],
  );

  const providerAvailability = useMemo(() => {
    const availabilityMap = new Map<string, Appointment | null>();

    availableProviders.forEach((provider) => {
      if (!appointmentToAssign) {
        availabilityMap.set(provider.id, null);
        return;
      }

      const blocking = getBlockingAppointmentForDentist(
        provider.name,
        appointmentToAssign.date,
        appointmentToAssign.time,
        appointmentToAssign.id,
      );

      availabilityMap.set(provider.id, blocking ?? null);
    });

    return availabilityMap;
  }, [
    appointmentToAssign?.date,
    appointmentToAssign?.id,
    appointmentToAssign?.time,
    availableProviders,
  ]);

  if (!clinic) {
    return null;
  }

  const openAssignModal = async (appointment: Appointment) => {
    if (!canModifyDentist(appointment.status)) {
      Alert.alert(
        "Locked",
        "Dentist changes aren't allowed once an appointment is completed.",
      );
      return;
    }

    await loadAssignableTeamMembers();
    setAppointmentToAssign(appointment);
    setAssignModalVisible(true);
  };

  const closeAssignModal = () => {
    setAssignModalVisible(false);
    setAppointmentToAssign(null);
    setCustomDentistName("");
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setDetailsAppointment(null);
  };

  const handleDentistSelection = (dentist: StaffMember) => {
    if (!appointmentToAssign) {
      return;
    }

    const blocking = providerAvailability.get(dentist.id);
    if (blocking) {
      Alert.alert(
        "Not Available",
        `${dentist.name} is already assigned to ${blocking.patientName} on ${blocking.date} at ${blocking.time}.`,
      );
      return;
    }

    if (!canModifyDentist(appointmentToAssign.status)) {
      Alert.alert(
        "Action not allowed",
        "This appointment can no longer be modified.",
      );
      closeAssignModal();
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

    if (!canModifyDentist(appointmentToAssign.status)) {
      Alert.alert(
        "Action not allowed",
        "This appointment can no longer be modified.",
      );
      closeAssignModal();
      return;
    }

    const trimmedName = customDentistName.trim();
    if (!trimmedName) {
      Alert.alert("Missing Name", "Please enter a dentist name first.");
      return;
    }

    const blocking = getBlockingAppointmentForDentist(
      trimmedName,
      appointmentToAssign.date,
      appointmentToAssign.time,
      appointmentToAssign.id,
    );
    if (blocking) {
      Alert.alert(
        "Not Available",
        `${trimmedName} is already assigned to ${blocking.patientName} on ${blocking.date} at ${blocking.time}.`,
      );
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

  const handleViewDetails = (appointment: Appointment) => {
    setDetailsAppointment(appointment);
    setDetailsModalVisible(true);
  };

  const formatDentistName = (name?: string) => {
    if (!name || !name.trim()) {
      return "Dentist not assigned";
    }

    const trimmed = name.trim();
    return trimmed.toLowerCase().startsWith("dr.") ? trimmed : `Dr. ${trimmed}`;
  };

  const formatPaymentMethod = (method?: PaymentMethod) => {
    if (!method) {
      return "N/A";
    }
    return method.toUpperCase();
  };

  const paymentStatusColors: Record<string, string> = {
    paid: "#4CAF50",
    pending: "#F9A825",
    refunded: "#0288D1",
    failed: "#E53935",
  };

  const getPaymentColor = (status?: string) => {
    if (!status) return "#9E9E9E";
    return paymentStatusColors[status] || "#9E9E9E";
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesFilter =
      selectedFilter === "all" ? true : apt.status === selectedFilter;
    const searchableText =
      `${apt.patientName} ${apt.type} ${apt.dentistName ?? ""}`.toLowerCase();
    const matchesSearch = searchableText.includes(
      searchQuery.trim().toLowerCase(),
    );
    return matchesFilter && matchesSearch;
  });

  const canModifyDentist = (status: Appointment["status"]) =>
    status === "pending" || status === "confirmed";

  const statusMeta: Record<
    typeof selectedFilter,
    {
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      color: string;
      background: string;
    }
  > = {
    all: {
      label: "All",
      icon: "apps-outline",
      color: "#007F6D",
      background: "#E6F8F4",
    },
    pending: {
      label: "Pending",
      icon: "time-outline",
      color: "#F9A825",
      background: "#FFF7E0",
    },
    confirmed: {
      label: "Confirmed",
      icon: "checkmark-circle-outline",
      color: "#2E7D32",
      background: "#E5F7EA",
    },
    completed: {
      label: "Completed",
      icon: "ribbon-outline",
      color: "#2E7D32",
      background: "#E5F7EA",
    },
    cancelled: {
      label: "Rejected",
      icon: "close-circle-outline",
      color: "#E53935",
      background: "#FFE8E8",
    },
  };

  const statusTabSummary = (
    Object.keys(statusMeta) as Array<typeof selectedFilter>
  ).map((key) => ({
    key,
    label: statusMeta[key].label,
    count: appointments.filter((a) => (key === "all" ? true : a.status === key))
      .length,
  }));

  const pendingCount = appointments.filter(
    (a) => a.status === "pending",
  ).length;

  const renderStatusTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statusTabs}
    >
      {statusTabSummary.map((tabItem) => {
        const isActive = selectedFilter === tabItem.key;
        const meta = statusMeta[tabItem.key];
        return (
          <TouchableOpacity
            key={tabItem.key}
            style={[
              styles.statusChip,
              isActive && [
                styles.statusChipActive,
                { backgroundColor: meta.background },
              ],
            ]}
            onPress={() => setSelectedFilter(tabItem.key)}
          >
            <View style={styles.statusChipTopRow}>
              <Ionicons
                name={meta.icon}
                size={16}
                color={isActive ? meta.color : "#7A7A7A"}
              />
              {tabItem.key === "pending" && pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.statusChipLabel,
                isActive && { color: meta.color },
              ]}
            >
              {tabItem.label}
            </Text>
            <Text style={styles.statusChipCount}>{tabItem.count}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

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
        return "#2E7D32";
      case "pending":
        return "#F9A825";
      case "completed":
        return "#2E7D32";
      case "cancelled":
        return "#E53935";
      default:
        return "#999";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Ionicons name="home-outline" size={24} color="#00BFA6" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.navTitle}>Clinic Appointments</Text>
          <Text style={styles.headerSubtitle}>
            Manage your incoming patient visits
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationContainer}
          onPress={() => setSelectedFilter("pending")}
        >
          <Ionicons name="notifications-outline" size={24} color="#6B7280" />
          {pendingCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.topBlock}>
        {renderStatusTabs()}

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient, service or dentist"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={18} color="#B0B0B0" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setSelectedFilter("pending")}
          >
            <Ionicons name="funnel-outline" size={18} color="#00BFA6" />
            <Text style={styles.filterText}>Filters</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            const avatarUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(appointment.patientName)}&background=00bfa6&color=fff`;

            return (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.patientInfo}>
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.patientAvatarImage}
                    />
                    <View style={styles.patientDetails}>
                      <View style={styles.patientNameRow}>
                        <Text style={styles.patientName}>
                          {appointment.patientName}
                        </Text>
                      </View>
                      <Text style={styles.appointmentType}>
                        {appointment.type}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: `${getStatusColor(appointment.status)}20`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="ellipse"
                      size={8}
                      color={getStatusColor(appointment.status)}
                      style={{ marginRight: 6 }}
                    />
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

                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#4A4A4A"
                    />
                    <Text style={styles.metaChipText}>{appointment.date}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="time-outline" size={16} color="#4A4A4A" />
                    <Text style={styles.metaChipText}>{appointment.time}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <View style={[styles.metaChip, styles.metaChipFull]}>
                    <Ionicons name="person-outline" size={16} color="#4A4A4A" />
                    <Text style={styles.metaChipText}>
                      {formatDentistName(appointment.dentistName)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentRow}>
                  <View
                    style={[
                      styles.paymentStatusPill,
                      {
                        backgroundColor: `${getPaymentColor(appointment.paymentStatus)}1A`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={16}
                      color={getPaymentColor(appointment.paymentStatus)}
                    />
                    <Text
                      style={[
                        styles.paymentStatusText,
                        { color: getPaymentColor(appointment.paymentStatus) },
                      ]}
                    >
                      {appointment.paymentStatus
                        ? appointment.paymentStatus.toUpperCase()
                        : "NO PAYMENT"}
                    </Text>
                  </View>
                  <Text style={styles.paymentMethodText}>
                    {formatPaymentMethod(appointment.paymentMethod)}
                    {appointment.transactionId
                      ? ` · Ref ${appointment.transactionId}`
                      : ""}
                  </Text>
                </View>

                {canModifyDentist(appointment.status) && (
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

                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => handleViewDetails(appointment)}
                >
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#007F6D" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={assignModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reassign Doctor</Text>
            {appointmentToAssign ? (
              <Text style={styles.modalScheduleNote}>
                Checking availability for {appointmentToAssign.date} at {appointmentToAssign.time}
              </Text>
            ) : null}
            {availableProviders.length === 0 ? (
              <View style={styles.noDentistState}>
                <Ionicons name="warning-outline" size={36} color="#FFB300" />
                <Text style={styles.noDentistText}>
                  No active team members found for this clinic.
                </Text>
                <Text style={styles.noDentistSubtext}>
                  Add or activate staff in Staff Management, or assign one
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
                {availableProviders.map((dentist) => (
                  (() => {
                    const blocking = providerAvailability.get(dentist.id);
                    const isUnavailable = Boolean(blocking);

                    return (
                  <TouchableOpacity
                    key={dentist.id}
                    style={[
                      styles.dentistCard,
                      isUnavailable && styles.dentistCardUnavailable,
                    ]}
                    onPress={() => handleDentistSelection(dentist)}
                    disabled={isUnavailable}
                  >
                    <Text style={styles.dentistName}>{dentist.name}</Text>
                    <Text style={styles.dentistRole}>{dentist.role}</Text>
                    <Text
                      style={[
                        styles.dentistAvailability,
                        isUnavailable && styles.dentistAvailabilityUnavailable,
                      ]}
                    >
                      {isUnavailable
                        ? `Not available (${blocking!.time})`
                        : "Available"}
                    </Text>
                  </TouchableOpacity>
                    );
                  })()
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

      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailsModalCard}>
            <View style={styles.detailsHeaderRow}>
              <View style={styles.detailsTitleWrap}>
                <Text style={styles.detailsPatientName} numberOfLines={1}>
                  {detailsAppointment?.patientName}
                </Text>
                <Text style={styles.detailsSubtitle}>Appointment Details</Text>
              </View>
              <TouchableOpacity
                style={styles.detailsCloseIconButton}
                onPress={closeDetailsModal}
                accessibilityLabel="Close appointment details"
              >
                <Ionicons name="close" size={18} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Service</Text>
              <Text style={styles.detailsValue}>
                {detailsAppointment?.type}
              </Text>
            </View>

            <View style={styles.detailsTwoColumnRow}>
              <View style={styles.detailsChip}>
                <Ionicons name="calendar-outline" size={15} color="#0F766E" />
                <Text style={styles.detailsChipText}>
                  {detailsAppointment?.date}
                </Text>
              </View>
              <View style={styles.detailsChip}>
                <Ionicons name="time-outline" size={15} color="#0F766E" />
                <Text style={styles.detailsChipText}>
                  {detailsAppointment?.time}
                </Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Dentist</Text>
              <Text style={styles.detailsValue}>
                {formatDentistName(detailsAppointment?.dentistName)}
              </Text>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Payment</Text>
              <Text style={styles.detailsValue}>
                {(
                  detailsAppointment?.paymentStatus || "no payment"
                ).toUpperCase()}{" "}
                • {formatPaymentMethod(detailsAppointment?.paymentMethod)}
              </Text>
              {detailsAppointment?.transactionId ? (
                <Text style={styles.detailsMetaText}>
                  Ref: {detailsAppointment.transactionId}
                </Text>
              ) : null}
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Status</Text>
              <View
                style={[
                  styles.detailsStatusBadge,
                  {
                    backgroundColor: `${getStatusColor(detailsAppointment?.status || "pending")}20`,
                  },
                ]}
              >
                <Ionicons
                  name="ellipse"
                  size={8}
                  color={getStatusColor(
                    detailsAppointment?.status || "pending",
                  )}
                />
                <Text
                  style={[
                    styles.detailsStatusText,
                    {
                      color: getStatusColor(
                        detailsAppointment?.status || "pending",
                      ),
                    },
                  ]}
                >
                  {(detailsAppointment?.status || "pending")
                    .charAt(0)
                    .toUpperCase() +
                    (detailsAppointment?.status || "pending").slice(1)}
                </Text>
              </View>
            </View>

            {detailsAppointment &&
            canModifyDentist(detailsAppointment.status) ? (
              <TouchableOpacity
                style={styles.detailsPrimaryAction}
                onPress={() => {
                  closeDetailsModal();
                  openAssignModal(detailsAppointment);
                }}
              >
                <Ionicons name="person-add-outline" size={16} color="#FFF" />
                <Text style={styles.detailsPrimaryActionText}>
                  Assign Dentist
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.detailsSecondaryAction}
              onPress={closeDetailsModal}
            >
              <Text style={styles.detailsSecondaryActionText}>Close</Text>
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
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
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
    width: "100%",
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
    gap: 10,
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
  },
  scrollContent: {
    paddingBottom: 32,
  },
  appointmentCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  patientAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 18,
    marginRight: 12,
  },
  patientDetails: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F6F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    gap: 6,
  },
  metaChipFull: {
    flex: 1,
  },
  metaChipText: {
    fontSize: 13,
    color: "#444",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  paymentStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  paymentMethodText: {
    fontSize: 12,
    color: "#555",
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
  viewDetailsButton: {
    marginTop: 10,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    color: "#007F6D",
    fontWeight: "700",
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
  modalScheduleNote: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  dentistList: {
    maxHeight: 280,
  },
  dentistCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dentistCardUnavailable: {
    opacity: 0.5,
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
  dentistAvailabilityUnavailable: {
    color: "#E53935",
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
  detailsModalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    maxHeight: "82%",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  detailsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  detailsTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  detailsPatientName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
  },
  detailsSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailsCloseIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsSection: {
    marginTop: 10,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  detailsValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  detailsMetaText: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  detailsTwoColumnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  detailsChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailsChipText: {
    fontSize: 13,
    color: "#0F766E",
    fontWeight: "600",
  },
  detailsStatusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailsPrimaryAction: {
    marginTop: 18,
    backgroundColor: "#00BFA6",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailsPrimaryActionText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  detailsSecondaryAction: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 11,
    alignItems: "center",
  },
  detailsSecondaryActionText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14,
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
