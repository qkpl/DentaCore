import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
    getClinicStats,
    getClinicTransactionAuditLogs,
    getUpcomingAppointmentsForClinic,
} from "../../services/dataService";

interface ClinicDashboardScreenProps {
  navigation: any;
}

export default function ClinicDashboardScreen({
  navigation,
}: ClinicDashboardScreenProps) {
  const { clinic } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadStats = async () => {
        if (!clinic) {
          if (isActive) {
            setStats(null);
            setIsLoadingStats(false);
          }
          return;
        }

        if (isActive) {
          setIsLoadingStats(true);
        }

        try {
          const fetchedStats = await getClinicStats(clinic.id);
          if (isActive) {
            setStats(fetchedStats);
          }
        } catch (error) {
          if (isActive) {
            setStats(null);
          }
        } finally {
          if (isActive) {
            setIsLoadingStats(false);
          }
        }
      };

      void loadStats();

      return () => {
        isActive = false;
      };
    }, [clinic]),
  );

  if (!clinic) {
    return null;
  }

  if (isLoadingStats || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
        <Text style={styles.loadingText}>Loading clinic dashboard...</Text>
      </View>
    );
  }

  const transactionAuditLogs = getClinicTransactionAuditLogs(clinic.id, 8);
  const upcomingPatientAppointments = getUpcomingAppointmentsForClinic(
    clinic.id,
    5,
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome Back</Text>
          <Text style={styles.clinicName}>{clinic.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("ClinicProfile")}
        >
          <Ionicons name="settings" size={28} color="#00BFA6" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: "#2196F3" }]}>
          <Ionicons name="calendar" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.todaysAppointments}</Text>
          <Text style={styles.statLabel}>Today's Appointments</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#4CAF50" }]}>
          <Ionicons name="people" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.totalPatients}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      {/* Revenue & Appointments Overview */}
      <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Monthly Overview</Text>
          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Revenue</Text>
              <Text style={styles.overviewValue}>
                ₱{stats.revenue.toLocaleString()}
              </Text>
              <Text style={styles.overviewGrowth}>↑ 12.8%</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewLabel}>Appointments</Text>
              <Text style={styles.overviewValue}>
                {stats.totalAppointments}
              </Text>
              <Text style={styles.overviewGrowth}>↑ 8.4%</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ClinicAppointments")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="calendar" size={28} color="#1976D2" />
            </View>
            <Text style={styles.actionText}>Appointments</Text>
            {stats.pendingAppointments > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {stats.pendingAppointments}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ClinicPatients")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="people" size={28} color="#388E3C" />
            </View>
            <Text style={styles.actionText}>Patient Records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ClinicStaff")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="person-add" size={28} color="#F57C00" />
            </View>
            <Text style={styles.actionText}>Staff</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("ClinicProfile")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FCE4EC" }]}>
              <Ionicons name="business" size={28} color="#C2185B" />
            </View>
            <Text style={styles.actionText}>Clinic Details</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clinic Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinic Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Pending Approval</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusValue}>
                {stats.pendingAppointments}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Confirmed</Text>
            <View style={[styles.statusBadge, { backgroundColor: "#4CAF50" }]}>
              <Text style={styles.statusValue}>
                {stats.confirmedAppointments}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Completed</Text>
            <View style={[styles.statusBadge, { backgroundColor: "#9E9E9E" }]}>
              <Text style={styles.statusValue}>
                {stats.completedAppointments}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Platform Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityItem}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.activityText}>
              Platform growing at 29% this month
            </Text>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="star" size={24} color="#FFB300" />
            <Text style={styles.activityText}>
              Your rating: {clinic.rating} ⭐
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.notificationCard}>
          {upcomingPatientAppointments.length === 0 ? (
            <Text style={styles.notificationEmptyText}>
              No upcoming patient appointments.
            </Text>
          ) : (
            upcomingPatientAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.notificationRow}>
                <Ionicons name="notifications-outline" size={18} color="#C2185B" />
                <View style={styles.notificationCopyWrap}>
                  <Text style={styles.notificationTitle}>
                    {appointment.patientName} has an upcoming appointment
                  </Text>
                  <Text style={styles.notificationMeta}>
                    {appointment.date} · {appointment.time}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction Audit Logs</Text>
        <View style={styles.auditCard}>
          {transactionAuditLogs.length === 0 ? (
            <Text style={styles.auditEmptyText}>No payment audit events yet.</Text>
          ) : (
            transactionAuditLogs.map((log) => (
              <View key={log.id} style={styles.auditRow}>
                <Ionicons name="receipt-outline" size={18} color="#0EA5E9" />
                <View style={styles.auditCopyWrap}>
                  <Text style={styles.auditText}>{log.details}</Text>
                  <Text style={styles.auditMeta}>
                    {new Date(log.createdAt).toLocaleString()} · {log.transactionId || "N/A"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: "#666",
  },
  clinicName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  profileButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
    marginVertical: 10,
  },
  statLabel: {
    fontSize: 13,
    color: "#FFF",
    textAlign: "center",
  },
  overviewContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  overviewCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
  },
  overviewLabel: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  overviewGrowth: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  divider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 20,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  actionButton: {
    width: "47%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  statusCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  statusLabel: {
    fontSize: 15,
    color: "#333",
  },
  statusBadge: {
    backgroundColor: "#FFB300",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: "center",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFF",
  },
  activityCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  activityText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
    flex: 1,
  },
  auditCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECEFF1",
    gap: 12,
  },
  notificationCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0E4EC",
    gap: 10,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  notificationCopyWrap: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "700",
  },
  notificationMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  notificationEmptyText: {
    fontSize: 13,
    color: "#666",
  },
  auditRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  auditCopyWrap: {
    flex: 1,
  },
  auditText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  auditMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
  },
  auditEmptyText: {
    fontSize: 13,
    color: "#666",
  },
});
