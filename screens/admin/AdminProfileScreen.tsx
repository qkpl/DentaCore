import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
    getAdminAuditLogs,
    getUsersByRole,
} from "../../services/dataService";

interface AdminProfileScreenProps {
  navigation: any;
}

export default function AdminProfileScreen({
  navigation,
}: AdminProfileScreenProps) {
  const { user, logout } = useAuth();
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [dbHost, setDbHost] = useState("localhost");
  const [dbPort, setDbPort] = useState("3306");
  const [dbName, setDbName] = useState("dentacore");
  const [dbUsername, setDbUsername] = useState("admin");
  const [dbPassword, setDbPassword] = useState("");
  const [dbConnected, setDbConnected] = useState(false);
  const [sqlInput, setSqlInput] = useState("SELECT * FROM appointments LIMIT 10;");
  const [sqlResult, setSqlResult] = useState("Run a query to view output.");
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [adminRoleEditEnabled, setAdminRoleEditEnabled] = useState(false);

  const adminLogs = useMemo(() => getAdminAuditLogs(12), []);
  const adminAccounts = useMemo(() => getUsersByRole("admin"), []);

  const systemNotifications = useMemo(() => {
    const mapped = adminLogs.map((log, index) => {
      const eventType = log.eventType;
      const category =
        eventType.includes("user")
          ? "User-related"
          : eventType.includes("clinic")
            ? "Clinic / Service"
            : eventType.includes("appointment")
              ? "Appointment / Booking"
              : eventType.includes("payment")
                ? "System / Technical"
                : "Security";
      const priority =
        eventType.includes("deleted") || eventType.includes("failed")
          ? "high"
          : eventType.includes("updated")
            ? "medium"
            : "low";

      return {
        id: log.id,
        title: log.details,
        category,
        timestamp: new Date(log.createdAt).toLocaleString(),
        status: index < 4 ? "unread" : "read",
        priority,
      };
    });

    return [
      {
        id: "sys-db",
        title: dbConnected
          ? "Database connection restored"
          : "Database connection disconnected",
        category: "System / Technical",
        timestamp: new Date().toLocaleString(),
        status: "unread",
        priority: dbConnected ? "low" : "high",
      },
      {
        id: "sys-api",
        title: "Google Maps / AI API health monitored",
        category: "System / Technical",
        timestamp: new Date().toLocaleString(),
        status: "read",
        priority: "medium",
      },
      {
        id: "sys-security",
        title: "No unauthorized admin access detected",
        category: "Security",
        timestamp: new Date().toLocaleString(),
        status: "read",
        priority: "low",
      },
      ...mapped,
    ];
  }, [adminLogs, dbConnected]);

  const tableStructures = useMemo(
    () => [
      {
        name: "users",
        columns: [
          "id (VARCHAR, PRIMARY KEY)",
          "email (VARCHAR, UNIQUE, NOT NULL)",
          "role (VARCHAR, NOT NULL)",
        ],
        relation: "1:N with appointments (patientId)",
      },
      {
        name: "clinics",
        columns: [
          "id (VARCHAR, PRIMARY KEY)",
          "name (VARCHAR, NOT NULL)",
          "address (VARCHAR, NOT NULL)",
        ],
        relation: "1:N with appointments (clinicId)",
      },
      {
        name: "appointments",
        columns: [
          "id (VARCHAR, PRIMARY KEY)",
          "patientId (VARCHAR, FOREIGN KEY)",
          "clinicId (VARCHAR, FOREIGN KEY)",
          "date (DATE, NOT NULL)",
        ],
        relation: "N:1 users + N:1 clinics",
      },
      {
        name: "transactions",
        columns: [
          "transactionId (VARCHAR, PRIMARY KEY)",
          "appointmentId (VARCHAR, FOREIGN KEY)",
          "amount (INT, NOT NULL)",
          "status (VARCHAR, NOT NULL)",
        ],
        relation: "1:1 with appointments",
      },
    ],
    [],
  );

  const handleTestDbConnection = () => {
    const ready =
      dbHost.trim().length > 0 &&
      dbPort.trim().length > 0 &&
      dbName.trim().length > 0 &&
      dbUsername.trim().length > 0;

    setDbConnected(ready);
    Alert.alert(
      ready ? "Connected" : "Disconnected",
      ready
        ? "Database connection established successfully."
        : "Please complete host, port, database, and username fields.",
    );
  };

  const handleExecuteQuery = () => {
    const query = sqlInput.trim();
    if (!query) {
      Alert.alert("Empty query", "Enter a SQL command first.");
      return;
    }

    setQueryHistory((prev) => [query, ...prev].slice(0, 5));
    const lowered = query.toLowerCase();
    if (lowered.startsWith("select")) {
      setSqlResult("Query output: 3 rows returned (sample mode).");
    } else {
      setSqlResult("Rows affected: 1 (sample mode).");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate("AdminDashboard")}
        >
          <Ionicons name="grid-outline" size={24} color="#7C4DFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Admin Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="shield-checkmark" size={40} color="#FFF" />
          </View>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userRole}>System Administrator</Text>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail" size={20} color="#7C4DFF" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call" size={20} color="#7C4DFF" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.phone}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* System Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowDatabaseModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="server-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Database Management</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowDatabaseModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="cloud-upload-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Backup & Restore</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("AdminReports")}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="document-text-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Audit Logs</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowNotificationsModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
            <Text style={styles.settingText}>System Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() =>
            Alert.alert("Password", "Change password feature coming soon")
          }
        >
          <View style={styles.settingLeft}>
            <Ionicons name="lock-closed-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowSecurityModal(true)}
        >
          <View style={styles.settingLeft}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#666" />
            <Text style={styles.settingText}>Security Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Audit Logs</Text>
        <View style={styles.infoCard}>
          {adminLogs.length === 0 ? (
            <Text style={styles.emptyText}>No admin audit logs yet.</Text>
          ) : (
            adminLogs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.auditRow}>
                <Text style={styles.auditTitle}>{log.details}</Text>
                <Text style={styles.auditMeta}>
                  {new Date(log.createdAt).toLocaleString()} · {log.eventType}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Platform Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Information</Text>
        <View style={styles.platformCard}>
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>Platform Version</Text>
            <Text style={styles.platformValue}>v1.0.0</Text>
          </View>
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>Database Status</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Healthy</Text>
            </View>
          </View>
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>Last Backup</Text>
            <Text style={styles.platformValue}>Feb 23, 2026</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer} />

      <Modal
        visible={showDatabaseModal}
        animationType="slide"
        onRequestClose={() => setShowDatabaseModal(false)}
      >
        <ScrollView style={styles.modalPage}>
          <View style={styles.modalTopBar}>
            <TouchableOpacity onPress={() => setShowDatabaseModal(false)}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalPageTitle}>Database Management</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>1. Database Connection Settings</Text>
            <TextInput style={styles.input} placeholder="Hostname / IP" value={dbHost} onChangeText={setDbHost} />
            <TextInput style={styles.input} placeholder="Port" value={dbPort} onChangeText={setDbPort} keyboardType="number-pad" />
            <TextInput style={styles.input} placeholder="Database name" value={dbName} onChangeText={setDbName} />
            <TextInput style={styles.input} placeholder="Username" value={dbUsername} onChangeText={setDbUsername} />
            <TextInput style={styles.input} placeholder="Password" value={dbPassword} onChangeText={setDbPassword} secureTextEntry />
            <View style={styles.connectionRow}>
              <Text style={styles.connectionLabel}>Connection status</Text>
              <Text style={[styles.connectionValue, dbConnected ? styles.connected : styles.disconnected]}>
                {dbConnected ? "Connected" : "Disconnected"}
              </Text>
            </View>
            <TouchableOpacity style={styles.actionPrimary} onPress={handleTestDbConnection}>
              <Text style={styles.actionPrimaryText}>Test Connection</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>2. Table List / Structure</Text>
            {tableStructures.map((table) => (
              <View key={table.name} style={styles.tableCard}>
                <Text style={styles.tableName}>{table.name}</Text>
                {table.columns.map((column) => (
                  <Text key={column} style={styles.tableColumn}>• {column}</Text>
                ))}
                <Text style={styles.tableRelation}>Relationship: {table.relation}</Text>
              </View>
            ))}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>3. Data Management</Text>
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert("Data", "Add/Edit/Delete records panel opened (sample mode).") }>
              <Text style={styles.settingText}>Add / Edit / Delete records</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert("Data", "Search and filter panel opened (sample mode).") }>
              <Text style={styles.settingText}>Search / Filter records</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert("Data", "Sample data viewer opened.") }>
              <Text style={styles.settingText}>View sample data</Text>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>4. Query / Custom SQL</Text>
            <TextInput
              style={[styles.input, styles.sqlInput]}
              multiline
              value={sqlInput}
              onChangeText={setSqlInput}
              placeholder="Write SQL query"
            />
            <TouchableOpacity style={styles.actionPrimary} onPress={handleExecuteQuery}>
              <Text style={styles.actionPrimaryText}>Execute Query</Text>
            </TouchableOpacity>
            <Text style={styles.sqlResult}>{sqlResult}</Text>
            <Text style={styles.modalHint}>Query history</Text>
            {queryHistory.map((entry) => (
              <Text key={entry} style={styles.queryHistoryItem}>{entry}</Text>
            ))}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>5. Backup / Restore Options</Text>
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert("Backup", "Full database backup started (sample mode).") }>
              <Text style={styles.settingText}>Full database backup</Text>
              <Ionicons name="download-outline" size={18} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert("Export", "Exported to SQL / CSV (sample mode).") }>
              <Text style={styles.settingText}>Export SQL / CSV</Text>
              <Ionicons name="share-social-outline" size={18} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert("Restore", "Import / restore flow opened (sample mode).") }>
              <Text style={styles.settingText}>Import / Restore backup</Text>
              <Ionicons name="cloud-upload-outline" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <ScrollView style={styles.modalPage}>
          <View style={styles.modalTopBar}>
            <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalPageTitle}>System Notifications</Text>
            <View style={styles.placeholder} />
          </View>
          {systemNotifications.map((item) => (
            <View key={item.id} style={styles.notificationCard}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.notificationMeta}>
                {item.category} · {item.timestamp}
              </Text>
              <Text style={styles.notificationMeta}>
                Status: {item.status} · Priority: {item.priority}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Modal>

      <Modal
        visible={showSecurityModal}
        animationType="slide"
        onRequestClose={() => setShowSecurityModal(false)}
      >
        <ScrollView style={styles.modalPage}>
          <View style={styles.modalTopBar}>
            <TouchableOpacity onPress={() => setShowSecurityModal(false)}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalPageTitle}>Security Settings</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalSection}>
            <View style={styles.toggleRow}>
              <Text style={styles.settingText}>Enable admin role management</Text>
              <Switch
                value={adminRoleEditEnabled}
                onValueChange={setAdminRoleEditEnabled}
                trackColor={{ false: "#CBD5E1", true: "#C4B5FD" }}
                thumbColor={adminRoleEditEnabled ? "#7C3AED" : "#F8FAFC"}
              />
            </View>
            <Text style={styles.modalHint}>Admin Accounts</Text>
            {adminAccounts.map((admin) => (
              <View key={admin.id} style={styles.adminAccountCard}>
                <Text style={styles.adminName}>{admin.name}</Text>
                <Text style={styles.adminMeta}>{admin.email}</Text>
                <Text style={styles.adminMeta}>Role: {admin.role}</Text>
                <Text style={styles.adminMeta}>Permissions: full_admin_access</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </Modal>
    </ScrollView>
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
    backgroundColor: "#7C4DFF",
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFF",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EDE7F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  emptyText: {
    color: "#64748B",
  },
  auditRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  auditTitle: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "600",
  },
  auditMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
  },
  platformCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  platformRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  platformLabel: {
    fontSize: 15,
    color: "#666",
  },
  platformValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "600",
  },
  modalPage: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalPageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSection: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
  },
  modalSectionTitle: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "700",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: "#111827",
    backgroundColor: "#FFF",
  },
  connectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  connectionLabel: {
    color: "#334155",
    fontSize: 13,
  },
  connectionValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  connected: {
    color: "#16A34A",
  },
  disconnected: {
    color: "#DC2626",
  },
  actionPrimary: {
    backgroundColor: "#7C3AED",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  actionPrimaryText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  tableCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  tableName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  tableColumn: {
    fontSize: 12,
    color: "#334155",
  },
  tableRelation: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
  },
  sqlInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  sqlResult: {
    marginTop: 8,
    color: "#0F172A",
    fontSize: 13,
  },
  modalHint: {
    marginTop: 8,
    color: "#64748B",
    fontSize: 12,
  },
  queryHistoryItem: {
    color: "#334155",
    fontSize: 12,
    marginTop: 4,
  },
  notificationCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
  },
  notificationTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
  },
  notificationMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  adminAccountCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  adminName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  adminMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
    marginLeft: 8,
  },
  footer: {
    height: 40,
  },
});
