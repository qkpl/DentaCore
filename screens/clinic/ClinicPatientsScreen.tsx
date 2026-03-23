import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
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
import { DentalRecord } from "../../data/mockData";
import {
    createDentalRecord,
    getAppointmentsByClinic,
    getRecordsByClinic,
} from "../../services/dataService";

interface PatientSummary {
  patientId: string;
  patientName: string;
  recordsCount: number;
  acceptedAppointments: Array<{
    id: string;
    type: string;
    date: string;
    time: string;
  }>;
  latestDate: string;
}

const getAppointmentTimestamp = (date: string, time: string): number => {
  const dateParts = date.split("-").map(Number);
  if (dateParts.length !== 3) {
    return Number.POSITIVE_INFINITY;
  }

  const timeMatch = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) {
    return Number.POSITIVE_INFINITY;
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();

  if (period === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }

  const appointmentDate = new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    hour,
    minute,
    0,
    0,
  );

  return appointmentDate.getTime();
};

const getNearestUpcomingTimestamp = (summary: PatientSummary): number => {
  const now = Date.now();

  const upcoming = summary.acceptedAppointments
    .map((appointment) =>
      getAppointmentTimestamp(appointment.date, appointment.time),
    )
    .filter((timestamp) => timestamp >= now)
    .sort((a, b) => a - b);

  if (upcoming.length > 0) {
    return upcoming[0];
  }

  return Number.POSITIVE_INFINITY;
};

interface ClinicPatientsScreenProps {
  navigation: any;
}

export default function ClinicPatientsScreen({
  navigation,
}: ClinicPatientsScreenProps) {
  const { clinic } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [records, setRecords] = React.useState<DentalRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
  const [isRecordsModalVisible, setIsRecordsModalVisible] =
    React.useState(false);
  const [activePatient, setActivePatient] =
    React.useState<PatientSummary | null>(null);
  const [activePatientRecords, setActivePatientRecords] = React.useState<
    DentalRecord[]
  >([]);
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>("");
  const [newRecordType, setNewRecordType] = React.useState("");
  const [newRecordDate, setNewRecordDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [newRecordDentist, setNewRecordDentist] = React.useState("");
  const [newRecordTreatment, setNewRecordTreatment] = React.useState("");
  const [newRecordNotes, setNewRecordNotes] = React.useState("");
  const [isSavingRecord, setIsSavingRecord] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const loadRecords = async () => {
      if (!clinic) {
        if (isMounted) {
          setRecords([]);
          setIsLoadingRecords(false);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingRecords(true);
      }

      try {
        const fetchedRecords = await getRecordsByClinic(clinic.id);
        if (isMounted) {
          setRecords(fetchedRecords);
        }
      } catch (error) {
        console.warn("Failed to load clinic records", error);
      } finally {
        if (isMounted) {
          setIsLoadingRecords(false);
        }
      }
    };

    void loadRecords();

    return () => {
      isMounted = false;
    };
  }, [clinic, refreshTrigger]);

  if (!clinic) {
    return null;
  }

  const acceptedAppointments = getAppointmentsByClinic(clinic.id).filter(
    (appointment) =>
      appointment.status === "confirmed" || appointment.status === "completed",
  );

  const patientRecords = records.reduce(
    (accumulator, record) => {
      if (!accumulator[record.patientId]) {
        accumulator[record.patientId] = [];
      }

      accumulator[record.patientId].push(record);
      return accumulator;
    },
    {} as Record<string, typeof records>,
  );

  const patientSummariesMap = acceptedAppointments.reduce(
    (accumulator, appointment) => {
      const existingSummary = accumulator[appointment.patientId];
      const patientRecordsList = patientRecords[appointment.patientId] || [];

      if (!existingSummary) {
        accumulator[appointment.patientId] = {
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          recordsCount: patientRecordsList.length,
          acceptedAppointments: [
            {
              id: appointment.id,
              type: appointment.type,
              date: appointment.date,
              time: appointment.time,
            },
          ],
          latestDate: appointment.date,
        };
        return accumulator;
      }

      existingSummary.acceptedAppointments.push({
        id: appointment.id,
        type: appointment.type,
        date: appointment.date,
        time: appointment.time,
      });

      if (appointment.date > existingSummary.latestDate) {
        existingSummary.latestDate = appointment.date;
      }

      return accumulator;
    },
    {} as Record<string, PatientSummary>,
  );

  const patientSummaries = Object.values(patientSummariesMap)
    .map((summary) => ({
      ...summary,
      acceptedAppointments: [...summary.acceptedAppointments].sort((a, b) => {
        return (
          getAppointmentTimestamp(a.date, a.time) -
          getAppointmentTimestamp(b.date, b.time)
        );
      }),
    }))
    .sort((a, b) => {
      const nearestA = getNearestUpcomingTimestamp(a);
      const nearestB = getNearestUpcomingTimestamp(b);

      if (nearestA !== nearestB) {
        return nearestA - nearestB;
      }

      return b.latestDate.localeCompare(a.latestDate);
    });

  const patientOptions = patientSummaries.map((summary) => ({
    patientId: summary.patientId,
    patientName: summary.patientName,
  }));

  const resetAddRecordForm = () => {
    setNewRecordType("");
    setNewRecordTreatment("");
    setNewRecordNotes("");
    setNewRecordDentist("");
    setNewRecordDate(new Date().toISOString().split("T")[0]);
  };

  const openAddRecordModal = () => {
    if (patientOptions.length === 0) {
      Alert.alert("No Patients", "Accept or complete an appointment first.");
      return;
    }

    if (!selectedPatientId) {
      setSelectedPatientId(patientOptions[0].patientId);
    }
    resetAddRecordForm();
    setIsAddModalVisible(true);
  };

  const closeAddRecordModal = () => {
    setIsAddModalVisible(false);
  };

  const closeRecordsModal = () => {
    setIsRecordsModalVisible(false);
    setActivePatient(null);
    setActivePatientRecords([]);
  };

  const handleSaveRecord = async () => {
    if (!clinic) {
      return;
    }

    const patientSummary = patientSummaries.find(
      (summary) => summary.patientId === selectedPatientId,
    );

    if (!patientSummary) {
      Alert.alert("Missing Patient", "Please select a patient.");
      return;
    }

    if (!newRecordType.trim()) {
      Alert.alert("Missing Details", "Please enter the service type.");
      return;
    }

    setIsSavingRecord(true);

    const trimmedType = newRecordType.trim();
    const trimmedTreatment = newRecordTreatment.trim();
    const trimmedNotes = newRecordNotes.trim();
    const trimmedDentist = newRecordDentist.trim();
    const trimmedDate = newRecordDate.trim();

    const payload = {
      patientId: patientSummary.patientId,
      clinicId: clinic.id,
      clinicName: clinic.name || "Clinic",
      dentistName: trimmedDentist || "Clinic Dentist",
      date: trimmedDate || new Date().toISOString().split("T")[0],
      type: trimmedType,
      description:
        trimmedNotes || `${trimmedType} record added via clinic dashboard.`,
      treatment: trimmedTreatment || trimmedType,
      notes: trimmedNotes,
    } satisfies Omit<DentalRecord, "id">;

    try {
      const savedRecord = await createDentalRecord(payload);
      setIsAddModalVisible(false);
      setRecords((previousRecords) => {
        const existingRecord = previousRecords.some(
          (record) => record.id === savedRecord.id,
        );
        if (existingRecord) {
          return previousRecords;
        }

        const updatedRecords = [...previousRecords, savedRecord].sort((a, b) =>
          b.date.localeCompare(a.date),
        );
        return updatedRecords;
      });
      setRefreshTrigger((prev) => prev + 1);
      Alert.alert("Record Saved", "Patient record has been added.");
    } catch (error) {
      Alert.alert("Error", "Failed to save record. Please try again.");
    } finally {
      setIsSavingRecord(false);
    }
  };

  const filteredPatientSummaries = patientSummaries.filter((summary) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const matchesPatient =
      summary.patientName.toLowerCase().includes(query) ||
      summary.patientId.toLowerCase().includes(query);

    const matchesAppointment = summary.acceptedAppointments.some(
      (appointment) =>
        appointment.type.toLowerCase().includes(query) ||
        appointment.date.toLowerCase().includes(query) ||
        appointment.time.toLowerCase().includes(query),
    );

    return matchesPatient || matchesAppointment;
  });

  const handleViewRecords = (summary: PatientSummary) => {
    const patientRecordsList = patientRecords[summary.patientId] || [];
    setActivePatient(summary);
    setActivePatientRecords(patientRecordsList);
    setIsRecordsModalVisible(true);
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
        <Text style={styles.navTitle}>Patient Records</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Records</Text>
        <Text style={styles.headerSubtitle}>
          View and manage patient information
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, service, or time..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Patient List */}
      <ScrollView style={styles.content}>
        {isLoadingRecords ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00BFA6" />
            <Text style={styles.loadingText}>Loading patient records...</Text>
          </View>
        ) : filteredPatientSummaries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No accepted appointments yet</Text>
          </View>
        ) : (
          filteredPatientSummaries.map((summary) => {
            const nextAppointment = summary.acceptedAppointments[0];
            return (
              <TouchableOpacity
                key={summary.patientId}
                style={styles.patientCard}
                onPress={() => handleViewRecords(summary)}
              >
                <View style={styles.patientAvatar}>
                  <Ionicons name="person" size={24} color="#00BFA6" />
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{summary.patientName}</Text>
                  <Text style={styles.patientIdText}>
                    ID: {summary.patientId}
                  </Text>
                  <View style={styles.patientMeta}>
                    <Ionicons name="medical" size={14} color="#666" />
                    <Text style={styles.metaText}>
                      Service: {nextAppointment?.type || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.patientMeta}>
                    <Ionicons name="document-text" size={14} color="#666" />
                    <Text style={styles.metaText}>
                      {summary.recordsCount} record
                      {summary.recordsCount > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.patientMeta}>
                    <Ionicons name="calendar" size={14} color="#666" />
                    <Text style={styles.metaText}>
                      Appointment: {nextAppointment?.date || "N/A"} at{" "}
                      {nextAppointment?.time || "N/A"}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() =>
                      Alert.alert("Call", `Call patient ${summary.patientName}`)
                    }
                  >
                    <Ionicons name="call" size={20} color="#00BFA6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() =>
                      Alert.alert(
                        "Message",
                        `Message patient ${summary.patientName}`,
                      )
                    }
                  >
                    <Ionicons name="mail" size={20} color="#00BFA6" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Record Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddRecordModal}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddRecordModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Patient Record</Text>
              <TouchableOpacity onPress={closeAddRecordModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Patient</Text>
            <ScrollView
              style={styles.patientPicker}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {patientOptions.map((option) => {
                const isSelected = option.patientId === selectedPatientId;
                return (
                  <TouchableOpacity
                    key={option.patientId}
                    style={[
                      styles.patientChip,
                      isSelected && styles.patientChipSelected,
                    ]}
                    onPress={() => setSelectedPatientId(option.patientId)}
                  >
                    <Text
                      style={[
                        styles.patientChipText,
                        isSelected && styles.patientChipTextSelected,
                      ]}
                    >
                      {option.patientName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalLabel}>Service Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Root Canal"
              value={newRecordType}
              onChangeText={setNewRecordType}
            />

            <Text style={styles.modalLabel}>Treatment</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Medication/Treatment"
              value={newRecordTreatment}
              onChangeText={setNewRecordTreatment}
            />

            <Text style={styles.modalLabel}>Date</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={newRecordDate}
              onChangeText={setNewRecordDate}
            />

            <Text style={styles.modalLabel}>Dentist Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dr. Reyes"
              value={newRecordDentist}
              onChangeText={setNewRecordDentist}
            />

            <Text style={styles.modalLabel}>Notes / Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Add visit notes"
              multiline
              numberOfLines={4}
              value={newRecordNotes}
              onChangeText={setNewRecordNotes}
            />

            <TouchableOpacity
              style={[
                styles.modalButton,
                isSavingRecord && styles.modalButtonDisabled,
              ]}
              onPress={handleSaveRecord}
              disabled={isSavingRecord}
            >
              <Text style={styles.modalButtonText}>
                {isSavingRecord ? "Saving..." : "Save Record"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isRecordsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeRecordsModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Records</Text>
              <TouchableOpacity onPress={closeRecordsModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {activePatient ? (
              <View style={styles.recordsPatientHeader}>
                <Text style={styles.recordsPatientName}>
                  {activePatient.patientName}
                </Text>
                <Text style={styles.recordsPatientId}>
                  ID: {activePatient.patientId}
                </Text>

                <Text style={[styles.modalLabel, styles.recordsSectionTitle]}>
                  Accepted Appointments
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.appointmentChips}
                >
                  {activePatient.acceptedAppointments.map((appointment) => (
                    <View key={appointment.id} style={styles.appointmentChip}>
                      <Text style={styles.appointmentChipText}>
                        {appointment.type} • {appointment.date} at{" "}
                        {appointment.time}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <Text style={[styles.modalLabel, styles.recordsSectionTitle]}>
              Dental Records
            </Text>

            {activePatientRecords.length === 0 ? (
              <View style={styles.emptyRecordState}>
                <Ionicons name="document-text" size={40} color="#CCC" />
                <Text style={styles.emptyRecordText}>
                  No clinical records yet.
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.recordsList}>
                {activePatientRecords.map((record) => (
                  <View key={record.id} style={styles.recordCard}>
                    <View style={styles.recordHeader}>
                      <Text style={styles.recordTitle}>{record.type}</Text>
                      <Text style={styles.recordDate}>{record.date}</Text>
                    </View>
                    <Text style={styles.recordDentist}>
                      Dentist: {record.dentistName}
                    </Text>
                    <Text style={styles.recordTreatment}>
                      Treatment: {record.treatment}
                    </Text>
                    {!!record.notes && (
                      <Text style={styles.recordNotes}>{record.notes}</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E0F7F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  patientIdText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  patientMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F7F4",
    justifyContent: "center",
    alignItems: "center",
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00BFA6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    maxHeight: "90%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  modalTextarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalButton: {
    marginTop: 20,
    backgroundColor: "#00BFA6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  patientPicker: {
    marginBottom: 10,
  },
  patientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  patientChipSelected: {
    backgroundColor: "#00BFA6",
    borderColor: "#00BFA6",
  },
  patientChipText: {
    color: "#444",
    fontWeight: "500",
  },
  patientChipTextSelected: {
    color: "#FFF",
  },
  recordsPatientHeader: {
    marginBottom: 10,
  },
  recordsPatientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  recordsPatientId: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  recordsSectionTitle: {
    marginTop: 16,
  },
  appointmentChips: {
    marginTop: 6,
  },
  appointmentChip: {
    backgroundColor: "#F2FFFC",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#CCF5EA",
  },
  appointmentChipText: {
    color: "#077562",
    fontSize: 12,
  },
  emptyRecordState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyRecordText: {
    marginTop: 10,
    color: "#888",
  },
  recordsList: {
    marginTop: 10,
  },
  recordCard: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  recordDate: {
    fontSize: 12,
    color: "#777",
  },
  recordDentist: {
    fontSize: 13,
    color: "#555",
    marginBottom: 2,
  },
  recordTreatment: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
  },
  recordNotes: {
    fontSize: 13,
    color: "#444",
    lineHeight: 18,
  },
});
