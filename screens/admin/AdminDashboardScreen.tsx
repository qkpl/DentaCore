import { Ionicons } from "@expo/vector-icons";
import React from "react";
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
    getAllClinics,
    getAllUsers,
    getSystemStats,
} from "../../services/dataService";

const { width } = Dimensions.get("window");

interface AdminDashboardScreenProps {
  navigation: any;
}

export default function AdminDashboardScreen({
  navigation,
}: AdminDashboardScreenProps) {
  const { user } = useAuth();
  const stats = getSystemStats();
  const clinics = getAllClinics();
  const users = getAllUsers();

  const forecastGrowthRate = 0.12; // 12% forecast growth
  const predictedRevenue = Math.round(stats.totalRevenue * (1 + forecastGrowthRate));

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

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#7C4DFF" }]}>
          <Ionicons name="business" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.totalClinics}</Text>
          <Text style={styles.statLabel}>Total Clinics</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#00BFA6" }]}>
          <Ionicons name="people" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.totalPatients}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: "#2196F3" }]}>
          <Ionicons name="calendar" size={32} color="#FFF" />
          <Text style={styles.statValue}>{stats.totalAppointments}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#4CAF50" }]}>
          <Ionicons name="cash" size={32} color="#FFF" />
          <Text style={styles.statValue}>
            ₱{(stats.totalRevenue / 1000).toFixed(1)}K
          </Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Revenue Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        <View style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendValue}>
              ₱{stats.totalRevenue.toLocaleString()}
            </Text>
            <View style={styles.trendBadge}>
              <Ionicons name="trending-up" size={16} color="#4CAF50" />
              <Text style={styles.trendPercentage}>+18.7%</Text>
            </View>
          </View>
          <Text style={styles.trendSubtext}>This month vs last month</Text>
          <View style={styles.chartBox}>
            <Text style={styles.chartTitle}>Monthly revenue trend</Text>
            <View style={styles.chartContainer}>
              <View style={styles.chartBar}>
                <View style={[styles.bar, { height: "60%" }]} />
                <Text style={styles.barLabel}>Jan</Text>
              </View>
              <View style={styles.chartBar}>
                <View style={[styles.bar, { height: "70%" }]} />
                <Text style={styles.barLabel}>Feb</Text>
              </View>
              <View style={styles.chartBar}>
                <View style={[styles.bar, { height: "80%" }]} />
                <Text style={styles.barLabel}>Mar</Text>
              </View>
              <View style={styles.chartBar}>
                <View style={[styles.bar, { height: "75%" }]} />
                <Text style={styles.barLabel}>Apr</Text>
              </View>
              <View style={styles.chartBar}>
                <View style={[styles.bar, { height: "90%" }]} />
                <Text style={styles.barLabel}>May</Text>
              </View>
              <View style={styles.chartBar}>
                <View style={[styles.bar, { height: "95%" }]} />
                <Text style={styles.barLabel}>Jun</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.predictionCardOuter}>
          <View style={styles.predictionRow}>
            <Text style={styles.predictionLabel}>Revenue Prediction</Text>
            <Text style={styles.predictionValue}>+12% forecast</Text>
          </View>
          <Text style={styles.predictionRevenue}>
            ₱{predictedRevenue.toLocaleString()} predicted next month
          </Text>
          <Text style={styles.predictionNote}>
            Based on current trend and growth projections.
          </Text>
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

      {/* Top Performing Clinics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Performing Clinics</Text>
          <TouchableOpacity onPress={() => navigation.navigate("AdminClinics")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {clinics.slice(0, 3).map((clinic, index) => (
          <View key={clinic.id} style={styles.clinicCard}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>{clinic.name}</Text>
              <Text style={styles.clinicRevenue}>
                ₱{clinic.revenue.toLocaleString()} revenue
              </Text>
            </View>
            <View style={styles.clinicStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <Text style={styles.statText}>{clinic.rating}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people" size={14} color="#666" />
                <Text style={styles.statText}>{clinic.totalPatients}</Text>
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
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
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
