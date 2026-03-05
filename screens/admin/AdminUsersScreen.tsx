import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { User } from "../../data/mockData";
import {
    deleteUser,
    getAllUsers,
    getUsersByRole,
    updateUser,
} from "../../services/dataService";

interface AdminUsersScreenProps {
  navigation: any;
}

export default function AdminUsersScreen({
  navigation,
}: AdminUsersScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "patient" | "clinic" | "admin"
  >("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form fields
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userAddress, setUserAddress] = useState("");

  const allUsers = getAllUsers();

  // Sync form fields with selected user
  useEffect(() => {
    if (selectedUser) {
      setUserName(selectedUser.name);
      setUserEmail(selectedUser.email);
      setUserPhone(selectedUser.phone);
      setUserAddress(selectedUser.address || "");
    }
  }, [selectedUser]);

  const filteredUsers = (
    selectedFilter === "all" ? allUsers : getUsersByRole(selectedFilter)
  ).filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleViewUser = (user: User) => {
    Alert.alert(
      user.name,
      `Email: ${user.email}\nPhone: ${user.phone}\nRole: ${user.role}\n${user.address ? `Address: ${user.address}` : ""}`,
      [{ text: "OK" }],
    );
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditModalVisible(true);
  };

  const handleSaveUser = () => {
    if (!selectedUser) return;

    if (!userName.trim() || !userEmail.trim() || !userPhone.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const success = updateUser(selectedUser.id, {
      name: userName,
      email: userEmail,
      phone: userPhone,
      address: userAddress,
    });

    if (success) {
      Alert.alert("Success", "User updated successfully");
      setEditModalVisible(false);
      setSelectedUser(null);
      setRefreshTrigger((prev) => prev + 1);
    } else {
      Alert.alert("Error", "Failed to update user");
    }
  };

  const handleDeleteUser = (user: User) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${user.name}? This will also delete all associated appointments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const success = deleteUser(user.id);
            if (success) {
              Alert.alert("Success", "User deleted successfully");
              setRefreshTrigger((prev) => prev + 1);
            } else {
              Alert.alert("Error", "Failed to delete user");
            }
          },
        },
      ],
    );
  };

  const getRoleColor = (role: User["role"]) => {
    switch (role) {
      case "patient":
        return "#00BFA6";
      case "clinic":
        return "#7C4DFF";
      case "admin":
        return "#F57C00";
      default:
        return "#999";
    }
  };

  const getRoleIcon = (role: User["role"]) => {
    switch (role) {
      case "patient":
        return "person";
      case "clinic":
        return "business";
      case "admin":
        return "shield-checkmark";
      default:
        return "person";
    }
  };

  return (
    <View style={styles.container}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => navigation.navigate("AdminDashboard")}
        >
          <Ionicons name="grid-outline" size={24} color="#7C4DFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>User Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>Manage all system users</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        <TouchableOpacity
          style={[styles.tab, selectedFilter === "all" && styles.tabActive]}
          onPress={() => setSelectedFilter("all")}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === "all" && styles.tabTextActive,
            ]}
          >
            All ({allUsers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedFilter === "patient" && styles.tabActive]}
          onPress={() => setSelectedFilter("patient")}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === "patient" && styles.tabTextActive,
            ]}
          >
            Patients ({getUsersByRole("patient").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedFilter === "clinic" && styles.tabActive]}
          onPress={() => setSelectedFilter("clinic")}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === "clinic" && styles.tabTextActive,
            ]}
          >
            Clinics ({getUsersByRole("clinic").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedFilter === "admin" && styles.tabActive]}
          onPress={() => setSelectedFilter("admin")}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === "admin" && styles.tabTextActive,
            ]}
          >
            Admins ({getUsersByRole("admin").length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Users List */}
      <ScrollView style={styles.content}>
        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => handleViewUser(user)}
          >
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: `${getRoleColor(user.role)}20` },
              ]}
            >
              <Ionicons
                name={getRoleIcon(user.role)}
                size={24}
                color={getRoleColor(user.role)}
              />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.userMeta}>
                <Ionicons name="mail" size={12} color="#666" />
                <Text style={styles.metaText}>{user.email}</Text>
              </View>
              <View style={styles.userMeta}>
                <Ionicons name="call" size={12} color="#666" />
                <Text style={styles.metaText}>{user.phone}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleColor(user.role) },
                ]}
              >
                <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditUser(user);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#7C4DFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteUser(user);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          Alert.alert("Add User", "Add new user feature coming soon")
        }
      >
        <Ionicons name="person-add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Edit User Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit User</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Modal Content */}
          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter full name"
                value={userName}
                onChangeText={setUserName}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter email address"
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                value={userPhone}
                onChangeText={setUserPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter address (optional)"
                value={userAddress}
                onChangeText={setUserAddress}
                multiline
              />
            </View>

            {selectedUser && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Role</Text>
                <View
                  style={[
                    styles.roleDisplay,
                    { backgroundColor: getRoleColor(selectedUser.role) + "15" },
                  ]}
                >
                  <Ionicons
                    name={getRoleIcon(selectedUser.role) as any}
                    size={20}
                    color={getRoleColor(selectedUser.role)}
                  />
                  <Text
                    style={[
                      styles.roleText,
                      { color: getRoleColor(selectedUser.role) },
                    ]}
                  >
                    {selectedUser.role.charAt(0).toUpperCase() +
                      selectedUser.role.slice(1)}
                  </Text>
                </View>
                <Text style={styles.roleNote}>
                  Note: Role cannot be changed
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveUser}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: 20,
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
  tabsContainer: {
    backgroundColor: "#FFF",
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  tabActive: {
    backgroundColor: "#7C4DFF",
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  userCard: {
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
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
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
    backgroundColor: "#7C4DFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#FFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    fontSize: 16,
    color: "#333",
  },
  roleDisplay: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  roleNote: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#7C4DFF",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});
