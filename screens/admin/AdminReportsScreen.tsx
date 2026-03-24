import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
    getAdminAnalyticsReport,
    getAdminLinkedEntities,
} from "../../services/dataService";

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const analytics = getAdminAnalyticsReport();
  const linkedEntities = getAdminLinkedEntities();

  const revenueGrowthDisplay = (analytics.revenueGrowthRate * 100).toFixed(1);
  const chartMaxValue = Math.max(
    ...analytics.monthlyRevenueTrend.map((p) => p.value),
    1,
  );
  const chartMaxHeight = 140;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Analytics & Forecast</Text>
          <Text style={styles.subtitle}>{user?.name}</Text>
        </View>
        <View style={styles.iconBadge}>
          <Ionicons name="analytics" size={28} color="#7C4DFF" />
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Revenue</Text>
          <Text style={styles.metricValue}>
            ₱{analytics.totals.revenue.toLocaleString()}
          </Text>
          <Text style={styles.metricSub}>
            Predicted next month ₱
            {analytics.predictedRevenueNextMonth.toLocaleString()}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Conversion Rate</Text>
          <Text style={styles.metricValue}>{analytics.conversionRate}%</Text>
          <Text style={styles.metricSub}>Confirmed + completed bookings</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Average Value</Text>
          <Text style={styles.metricValue}>
            ₱{analytics.avgAppointmentValue.toLocaleString()}
          </Text>
          <Text style={styles.metricSub}>Per appointment</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Clinics</Text>
          <Text style={styles.metricValue}>
            {analytics.totals.activeClinics}
          </Text>
          <Text style={styles.metricSub}>
            Connected to {linkedEntities.clinics.length} clinics
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <Text style={styles.sectionMeta}>
            +{revenueGrowthDisplay}% vs last month
          </Text>
        </View>
        <View style={[styles.trendChart, { minHeight: chartMaxHeight + 12 }]}>
          {analytics.monthlyRevenueTrend.map((point) => {
            const barHeight = Math.max(
              16,
              (point.value / chartMaxValue) * chartMaxHeight,
            );
            return (
              <View key={point.label} style={styles.trendBar}>
                <View style={[styles.trendBarFill, { height: barHeight }]} />
                <Text style={styles.trendLabel}>{point.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Status</Text>
        {analytics.appointmentStatusSummary.map((item) => (
          <View key={item.status} style={styles.rowCard}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor(item.status) },
                ]}
              />
              <Text style={styles.rowLabel}>{item.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.rowValue}>
              {item.count} · {item.percentage}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Mix</Text>
        {analytics.paymentMethodSummary.map((item) => (
          <View key={item.method} style={styles.rowCard}>
            <View style={styles.rowLeft}>
              <Ionicons name="card" size={18} color="#7C4DFF" />
              <Text style={styles.rowLabel}>{item.method.toUpperCase()}</Text>
            </View>
            <Text style={styles.rowValue}>
              {item.count} · {item.percentage}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Clinic</Text>
        {analytics.revenueByClinic.map((entry) => (
          <View key={entry.clinicId} style={styles.revenueCard}>
            <View>
              <Text style={styles.revenueLabel}>{entry.clinicName}</Text>
              <Text style={styles.revenueSub}>
                {entry.percentage}% of total
              </Text>
            </View>
            <Text style={styles.revenueValue}>
              ₱{entry.revenue.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connected Entities</Text>
        <View style={styles.entityGrid}>
          <View style={styles.entityCard}>
            <Ionicons name="business" size={20} color="#7C4DFF" />
            <Text style={styles.entityValue}>
              {linkedEntities.clinicUsers.length}
            </Text>
            <Text style={styles.entityLabel}>Clinic Admins</Text>
          </View>
          <View style={styles.entityCard}>
            <Ionicons name="people" size={20} color="#00BFA6" />
            <Text style={styles.entityValue}>
              {linkedEntities.patients.length}
            </Text>
            <Text style={styles.entityLabel}>Patients</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const statusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "#2196F3";
    case "completed":
      return "#4CAF50";
    case "cancelled":
      return "#F44336";
    default:
      return "#FFC107";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFF",
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  metricsGrid: {
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    paddingBottom: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 13,
    color: "#777",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
    marginVertical: 6,
  },
  metricSub: {
    fontSize: 12,
    color: "#888",
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionMeta: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  trendChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingVertical: 10,
  },
  trendBar: {
    flex: 1,
    alignItems: "center",
  },
  trendBarFill: {
    width: 22,
    borderRadius: 8,
    backgroundColor: "#7C4DFF",
  },
  trendLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "#777",
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  revenueCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  revenueLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  revenueSub: {
    fontSize: 12,
    color: "#888",
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  entityGrid: {
    flexDirection: "row",
    gap: 14,
  },
  entityCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  entityValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
  entityLabel: {
    fontSize: 12,
    color: "#777",
  },
});
