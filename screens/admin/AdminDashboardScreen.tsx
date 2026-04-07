import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
    getAdminAnalyticsReport,
    getAllClinics,
    getRecentTransactions,
    refreshClinicsFromFirestore,
    refreshUsersFromFirestore,
    syncAppointmentsFromFirestore,
} from "../../services/dataService";

const { width } = Dimensions.get("window");
const AUTO_REFRESH_MS = 15000;

interface AdminDashboardScreenProps {
  navigation: any;
}

export default function AdminDashboardScreen({
  navigation,
}: AdminDashboardScreenProps) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(getAdminAnalyticsReport());
  const [clinics, setClinics] = useState(getAllClinics());
  const [transactions, setTransactions] = useState(getRecentTransactions());
  const [isSyncing, setIsSyncing] = useState(false);
  const hydrationInProgressRef = useRef(false);
  const stats = analytics.totals;
  const revenueGrowthPercentage = (analytics.revenueGrowthRate * 100).toFixed(
    1,
  );
  const predictedRevenue = analytics.predictedRevenueNextMonth;
  const trendMax =
    analytics.monthlyRevenueTrend.reduce<number>(
      (max, point) => Math.max(max, point.value),
      0,
    ) || 1;
  const clinicDirectory = useMemo(
    () => Object.fromEntries(clinics.map((clinic) => [clinic.id, clinic])),
    [clinics],
  );

  const topPerformingClinics = useMemo(
    () => analytics.revenueByClinic.slice(0, 3),
    [analytics.revenueByClinic],
  );

  const hydrateAdminData = useCallback(async (showLoader = true) => {
    if (hydrationInProgressRef.current) {
      return;
    }

    hydrationInProgressRef.current = true;
    if (showLoader) {
      setIsSyncing(true);
    }

    try {
      await Promise.all([
        refreshClinicsFromFirestore(),
        refreshUsersFromFirestore(),
        syncAppointmentsFromFirestore(),
      ]);
      setClinics([...getAllClinics()]);
      setAnalytics(getAdminAnalyticsReport());
      setTransactions(getRecentTransactions());
    } finally {
      hydrationInProgressRef.current = false;
      if (showLoader) {
        setIsSyncing(false);
      }
    }
  }, []);

  useEffect(() => {
    void hydrateAdminData();
  }, [hydrateAdminData]);

  useFocusEffect(
    useCallback(() => {
      void hydrateAdminData(true);

      const intervalId = setInterval(() => {
        void hydrateAdminData(false);
      }, AUTO_REFRESH_MS);

      return () => {
        clearInterval(intervalId);
      };
    }, [hydrateAdminData]),
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Dashboard</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate("AdminProfile")}
        >
          <Ionicons name="settings" size={28} color="#7C4DFF" />
        </TouchableOpacity>
      </View>
      {isSyncing && (
        <Text style={styles.syncText}>Syncing latest clinics & patients…</Text>
      )}
      <View style={styles.refreshRow}>
        <Text style={styles.autoRefreshText}>Auto-refresh every 15 seconds</Text>
        <TouchableOpacity
          style={[styles.manualRefreshButton, isSyncing && styles.manualRefreshButtonDisabled]}
          onPress={() => void hydrateAdminData(true)}
          disabled={isSyncing}
        >
          <Ionicons
            name="refresh"
            size={14}
            color={isSyncing ? "#94A3B8" : "#0F766E"}
          />
          <Text
            style={[
              styles.manualRefreshText,
              isSyncing && styles.manualRefreshTextDisabled,
            ]}
          >
            Refresh now
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#7C4DFF" }]}>
          <Ionicons name="business" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.clinics}</Text>
          <Text style={styles.statLabel}>Total Clinics</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#00BFA6" }]}>
          <Ionicons name="people" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.patients}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#2196F3" }]}>
          <Ionicons name="calendar" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.appointments}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#4CAF50" }]}>
          <Ionicons name="cash" size={32} color="#FFF" />
          <Text style={styles.statValue}>
            ₱{(stats.collectedRevenue / 1000).toFixed(1)}K
          </Text>
          <Text style={styles.statLabel}>Collected Revenue</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#8B5CF6" }]}>
          <Ionicons name="stats-chart" size={32} color="#FFF" />
          <Text style={styles.statValue}>
            ₱{(stats.projectedRevenue / 1000).toFixed(1)}K
          </Text>
          <Text style={styles.statLabel}>Projected Revenue</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#0EA5E9" }]}>
          <Ionicons name="analytics" size={32} color="#FFF" />
          <Text style={styles.statValue}>
            ₱{((stats.projectedRevenue - stats.collectedRevenue) / 1000).toFixed(1)}K
          </Text>
          <Text style={styles.statLabel}>Forecast Remaining</Text>
        </View>
      </View>

      {/* Revenue Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendValue}>
              ₱{stats.projectedRevenue.toLocaleString()}
            </Text>
            <View style={styles.trendBadge}>
              <Ionicons name="trending-up" size={16} color="#4CAF50" />
              <Text style={styles.trendPercentage}>
                +{revenueGrowthPercentage}%
              </Text>
            </View>
          </View>
          <Text style={styles.trendSubtext}>
            Revenue movement vs last month
          </Text>
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Last 6 months</Text>
            <View style={styles.chartContainer}>
              {analytics.monthlyRevenueTrend.map((point) => {
                const barHeight = Math.max(12, (point.value / trendMax) * 100);
                return (
                  <View key={point.label} style={styles.chartBar}>
                    <View style={[styles.bar, { height: `${barHeight}%` }]} />
                    <Text style={styles.barLabel}>{point.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.predictionCardOuter}>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>Revenue Prediction</Text>
            <Text style={styles.predictionValue}>
              +{revenueGrowthPercentage}% trend
            </Text>
          </View>
          <Text style={styles.predictionRevenue}>
            ₱{predictedRevenue.toLocaleString()} predicted next month
          </Text>
          <Text style={styles.predictionNote}>
            Tracking {stats.activeClinics} active clinics across{" "}
            {stats.appointments} appointments.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operational Insights</Text>
        <View style={styles.insightsRow}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Avg. Appointment Value</Text>
            <Text style={styles.insightValue}>
              ₱{analytics.avgAppointmentValue.toLocaleString()}
            </Text>
            <Text style={styles.insightDelta}>Based on recent bookings</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Conversion Rate</Text>
            <Text style={styles.insightValue}>{analytics.conversionRate}%</Text>
            <Text style={styles.insightDelta}>Confirmed + completed</Text>
          </View>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Cancellation Rate</Text>
            <Text style={styles.insightValue}>
              {analytics.cancellationRate}%
            </Text>
            <Text style={styles.insightDelta}>Across all appointments</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminClinics")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#EDE7F6" }]}>
              <Ionicons name="business" size={28} color="#7C4DFF" />
            </View>
            <Text style={styles.actionText}>Manage Clinics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminUsers")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E0F7F4" }]}>
              <Ionicons name="people" size={28} color="#00BFA6" />
            </View>
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminReports")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#E3F2FD" }]}>
              <Ionicons name="bar-chart" size={28} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("AdminSettings")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="settings" size={28} color="#F57C00" />
            </View>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <Text style={styles.viewAllText}>Live</Text>
        </View>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No recent payments recorded.</Text>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionRow}>
                <View style={styles.transactionIcon}>
                  <Ionicons name="card" size={18} color="#7C4DFF" />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionPrimary}>
                    {transaction.patientName}
                  </Text>
                  <Text style={styles.transactionSecondary}>
                    {transaction.clinicName} · {transaction.date}{" "}
                    {transaction.time}
                  </Text>
                  <Text style={styles.transactionMeta}>
                    Paid via {transaction.paymentMethod?.toUpperCase() || "N/A"}
                    {transaction.transactionId
                      ? ` · Ref ${transaction.transactionId}`
                      : ""}
                  </Text>
                </View>
                <View style={styles.paymentBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                  <Text style={styles.paymentBadgeText}>Paid</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Top Performing Clinics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Performing Clinics</Text>
          <TouchableOpacity onPress={() => navigation.navigate("AdminClinics")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {topPerformingClinics.map((entry, index) => (
          <View key={entry.clinicId} style={styles.clinicCard}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{entry.clinicName}</Text>
              <Text style={styles.clinicRevenue}>
                ₱{entry.revenue.toLocaleString()} revenue
              </Text>
            </View>
            <View style={styles.clinicStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <Text style={styles.statText}>
                  {clinicDirectory[entry.clinicId]?.rating ?? 0}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people" size={14} color="#666" />
                <Text style={styles.statText}>{entry.patientCount}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* System Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.statusText}>All Systems Operational</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Ionicons name="server" size={24} color="#2196F3" />
              <Text style={styles.statusText}>Database: Healthy</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <Ionicons name="cloud-done" size={24} color="#00BFA6" />
              <Text style={styles.statusText}>Cloud Services: Active</Text>
            </View>
          </View>
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
  refreshRow: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  autoRefreshText: {
    color: "#64748B",
    fontSize: 12,
  },
  manualRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFEF8",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  manualRefreshButtonDisabled: {
    backgroundColor: "#F1F5F9",
  },
  manualRefreshText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
  },
  manualRefreshTextDisabled: {
    color: "#94A3B8",
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
  syncText: {
    textAlign: "center",
    color: "#7C4DFF",
    fontWeight: "600",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  profileButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 15,
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
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#FFF",
    textAlign: "center",
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C4DFF",
  },
  emptyText: {
    color: "#777",
    marginTop: 4,
  },
  transactionCard: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 16,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
    gap: 2,
  },
  transactionPrimary: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  transactionSecondary: {
    fontSize: 13,
    color: "#555",
  },
  transactionMeta: {
    fontSize: 12,
    color: "#7C4DFF",
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
  },
  paymentBadgeText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 12,
  },
  predictionCard: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 14,
  },
  predictionCardOuter: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  predictionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  predictionValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#388E3C",
  },
  predictionRevenue: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  predictionNote: {
    fontSize: 12,
    color: "#555",
    marginTop: 6,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 130,
    marginTop: 12,
    paddingTop: 8,
  },
  insightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  insightCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  insightValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#212121",
    marginTop: 8,
  },
  insightDelta: {
    marginTop: 6,
    fontSize: 12,
    color: "#7C7C7C",
  },
  predictionContainer: {
    marginTop: 12,
    gap: 10,
  },
  chartBox: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "#FFF",
    padding: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  chartTitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginBottom: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 2,
  },
  bar: {
    width: "70%",
    backgroundColor: "#7C4DFF",
    borderRadius: 4,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 5,
  },
  trendCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trendValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  trendPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
    marginLeft: 4,
  },
  trendSubtext: {
    fontSize: 13,
    color: "#999",
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  actionCard: {
    width: (width - 55) / 2,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
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
  clinicCard: {
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
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7C4DFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFF",
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
  clinicRevenue: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "600",
  },
  clinicStats: {
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },
  statusCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
});
