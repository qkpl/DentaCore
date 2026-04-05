import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
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
import { Appointment, ClinicReview } from "../../data/mockData";
import {
    cancelAppointment,
    deleteAppointment,
    getAppointmentsByPatient,
    getClinicReviewsByPatient,
    submitClinicReview,
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
  const [reviewsByAppointment, setReviewsByAppointment] = useState<
    Record<string, ClinicReview>
  >({});
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<Appointment | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Appointment | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  const loadAppointments = useCallback(async () => {
    if (!user) {
      setAppointments([]);
      setReviewsByAppointment({});
      return;
    }

    const patientAppointments = getAppointmentsByPatient(user.id);
    setAppointments(patientAppointments);

    try {
      const patientReviews = await getClinicReviewsByPatient(user.id);
      const mappedReviews = patientReviews.reduce<Record<string, ClinicReview>>(
        (acc, review) => {
          acc[review.appointmentId] = review;
          return acc;
        },
        {},
      );
      setReviewsByAppointment(mappedReviews);
    } catch (error) {
      console.warn("Failed to load reviews for patient", error);
    }
  }, [user]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments, refreshTrigger]);

  useFocusEffect(
    useCallback(() => {
      void loadAppointments();
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
    setDetailsTarget(appointment);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setDetailsTarget(null);
  };

  const formatPaymentMethod = (method?: Appointment["paymentMethod"]) => {
    if (!method) {
      return "Not specified";
    }
    if (method === "gcash") {
      return "GCash";
    }
    if (method === "paypal") {
      return "PayPal";
    }
    return "Credit / Debit Card";
  };

  const formatStatusLabel = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

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

  const handleDeleteAppointment = (appointment: Appointment) => {
    Alert.alert(
      "Delete Appointment",
      `Delete this appointment with ${appointment.clinicName}? This action cannot be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteAppointment(appointment.id);
            if (success) {
              setFeedbackMessage("Appointment deleted.");
              setRefreshTrigger((prev) => prev + 1);
            } else {
              setFeedbackMessage(
                "Delete failed. Please check your connection and try again.",
              );
            }
            setTimeout(() => setFeedbackMessage(""), 2400);
          },
        },
      ],
    );
  };

  const getReviewForAppointment = (appointmentId: string) =>
    reviewsByAppointment[appointmentId];

  const openReviewModal = (appointment: Appointment) => {
    const existingReview = getReviewForAppointment(appointment.id);
    setReviewTarget(appointment);
    setReviewRating(existingReview?.rating ?? 5);
    setReviewComment(existingReview?.comment ?? "");
    setReviewModalVisible(true);
  };

  const closeReviewModal = () => {
    if (reviewSaving) {
      return;
    }
    setReviewModalVisible(false);
    setReviewTarget(null);
    setReviewComment("");
    setReviewRating(5);
  };

  const renderStars = (
    currentValue: number,
    onSelect?: (value: number) => void,
  ) =>
    Array.from({ length: 5 }).map((_, index) => {
      const starValue = index + 1;
      const active = currentValue >= starValue;
      const iconName = active ? "star" : "star-outline";
      return (
        <TouchableOpacity
          key={starValue}
          style={styles.starButton}
          activeOpacity={onSelect ? 0.7 : 1}
          onPress={() => onSelect?.(starValue)}
        >
          <Ionicons
            name={iconName}
            size={24}
            color={active ? "#FBBF24" : "#D1D5DB"}
          />
        </TouchableOpacity>
      );
    });

  const handleSubmitReview = async () => {
    if (!reviewTarget || !user) {
      return;
    }
    if (reviewRating < 1) {
      Alert.alert("Rating required", "Please select a star rating first.");
      return;
    }

    setReviewSaving(true);
    try {
      const savedReview = await submitClinicReview({
        appointmentId: reviewTarget.id,
        clinicId: reviewTarget.clinicId,
        clinicName: reviewTarget.clinicName,
        patientId: user.id,
        patientName: user.name,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewsByAppointment((prev) => ({
        ...prev,
        [savedReview.appointmentId]: savedReview,
      }));
      setFeedbackMessage("Thanks for reviewing the clinic!");
      setTimeout(() => setFeedbackMessage(""), 2400);
      setReviewModalVisible(false);
      setReviewTarget(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (error) {
      Alert.alert(
        "Review failed",
        "We couldn't save your review. Please try again.",
      );
    } finally {
      setReviewSaving(false);
    }
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
                    const canDelete =
                      appointment.status === "completed" ||
                      appointment.status === "cancelled";

                    if (!canReschedule && !canCancel && !canDelete) {
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
                        {canDelete && (
                          <TouchableOpacity
                            style={[
                              styles.secondaryActionButton,
                              styles.secondaryDanger,
                              styles.secondaryDelete,
                            ]}
                            onPress={() => handleDeleteAppointment(appointment)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color="#FFF"
                            />
                            <Text style={styles.secondaryActionText}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })()}
                </View>

                {appointment.status === "completed" && (
                  <View style={styles.reviewBlock}>
                    {(() => {
                      const existingReview = getReviewForAppointment(
                        appointment.id,
                      );
                      if (existingReview) {
                        return (
                          <View style={styles.reviewSummary}>
                            <View style={styles.reviewSummaryHeader}>
                              <View style={styles.reviewStarsRow}>
                                {renderStars(existingReview.rating)}
                                <Text style={styles.reviewRatingValue}>
                                  {existingReview.rating.toFixed(1)}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.reviewEditButton}
                                onPress={() => openReviewModal(appointment)}
                              >
                                <Ionicons
                                  name="create-outline"
                                  size={16}
                                  color="#0369A1"
                                />
                                <Text style={styles.reviewEditText}>
                                  Update review
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {existingReview.comment ? (
                              <Text style={styles.reviewComment}>
                                {existingReview.comment}
                              </Text>
                            ) : null}
                            <Text style={styles.reviewTimestamp}>
                              Posted{" "}
                              {new Date(
                                existingReview.createdAt,
                              ).toLocaleDateString()}
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <TouchableOpacity
                          style={styles.reviewPrompt}
                          onPress={() => openReviewModal(appointment)}
                        >
                          <Ionicons
                            name="star-outline"
                            size={18}
                            color="#FBBF24"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reviewPromptTitle}>
                              Share your experience
                            </Text>
                            <Text style={styles.reviewPromptSubtitle}>
                              Rate this clinic to help other patients.
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#9CA3AF"
                          />
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                )}
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

      <Modal
        animationType="fade"
        transparent
        visible={detailsModalVisible}
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailsModalCard}>
            <View style={styles.detailsModalHeader}>
              <View>
                <Text style={styles.detailsModalTitle}>
                  Appointment Details
                </Text>
                <Text style={styles.detailsModalSubtitle}>
                  {detailsTarget?.clinicName}
                </Text>
              </View>
              <TouchableOpacity onPress={closeDetailsModal}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailsStatusPillWrap}>
              <View
                style={[
                  styles.detailsStatusPill,
                  {
                    backgroundColor:
                      STATUS_COLORS[detailsTarget?.status || "pending"].bg,
                  },
                ]}
              >
                <Ionicons
                  name={STATUS_COLORS[detailsTarget?.status || "pending"].icon}
                  size={15}
                  color={
                    STATUS_COLORS[detailsTarget?.status || "pending"].color
                  }
                />
                <Text
                  style={[
                    styles.detailsStatusText,
                    {
                      color:
                        STATUS_COLORS[detailsTarget?.status || "pending"].color,
                    },
                  ]}
                >
                  {formatStatusLabel(detailsTarget?.status || "pending")}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGroup}>
              <Text style={styles.detailsSectionTitle}>Visit Info</Text>
              <View style={styles.detailsRow}>
                <Ionicons name="medkit-outline" size={16} color="#0EA5A4" />
                <Text style={styles.detailsValue}>{detailsTarget?.type}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name="calendar-outline" size={16} color="#0EA5A4" />
                <Text style={styles.detailsValue}>{detailsTarget?.date}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons name="time-outline" size={16} color="#0EA5A4" />
                <Text style={styles.detailsValue}>{detailsTarget?.time}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color="#0EA5A4"
                />
                <Text style={styles.detailsValue}>
                  {formatDentistName(detailsTarget?.dentistName)}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGroup}>
              <Text style={styles.detailsSectionTitle}>Payment</Text>
              <View style={styles.detailsRowBetween}>
                <Text style={styles.detailsLabel}>Method</Text>
                <Text style={styles.detailsValueStrong}>
                  {formatPaymentMethod(detailsTarget?.paymentMethod)}
                </Text>
              </View>
              <View style={styles.detailsRowBetween}>
                <Text style={styles.detailsLabel}>Payment Status</Text>
                <Text style={styles.detailsValueStrong}>
                  {formatStatusLabel(detailsTarget?.paymentStatus || "pending")}
                </Text>
              </View>
              {detailsTarget?.transactionId ? (
                <View style={styles.detailsRowBetween}>
                  <Text style={styles.detailsLabel}>Reference</Text>
                  <Text style={styles.detailsReference}>
                    {detailsTarget.transactionId}
                  </Text>
                </View>
              ) : null}
            </View>

            {detailsTarget?.status === "cancelled" &&
            detailsTarget.cancellationReason ? (
              <View style={styles.detailsWarningBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#B45309"
                />
                <Text style={styles.detailsWarningText}>
                  {detailsTarget.cancellationReason}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.detailsCloseButton}
              onPress={closeDetailsModal}
            >
              <Text style={styles.detailsCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={reviewModalVisible}
        onRequestClose={closeReviewModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Clinic review</Text>
              <TouchableOpacity onPress={closeReviewModal}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.reviewModalSubtitle}>
              How was your visit with {reviewTarget?.clinicName}?
            </Text>
            <View style={styles.starRow}>
              {renderStars(reviewRating, (value) => setReviewRating(value))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share any details that stood out (optional)"
              placeholderTextColor="#94A3B8"
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
            />
            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonGhost]}
                onPress={closeReviewModal}
                disabled={reviewSaving}
              >
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSubmitReview}
                disabled={reviewSaving}
              >
                <Text style={styles.modalButtonText}>
                  {reviewSaving ? "Saving…" : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
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
  secondaryDelete: {
    backgroundColor: "#B91C1C",
  },
  secondaryActionText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  reviewBlock: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  reviewSummary: {
    gap: 8,
  },
  reviewSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewRatingValue: {
    marginLeft: 6,
    fontWeight: "700",
    fontSize: 14,
    color: "#0F172A",
  },
  reviewEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewEditText: {
    color: "#0369A1",
    fontWeight: "600",
    fontSize: 13,
  },
  reviewComment: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  reviewTimestamp: {
    fontSize: 11,
    color: "#94A3B8",
  },
  reviewPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reviewPromptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4338CA",
  },
  reviewPromptSubtitle: {
    fontSize: 12,
    color: "#6366F1",
  },
  starButton: {
    padding: 4,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  detailsModalCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  detailsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  detailsModalSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#64748B",
    maxWidth: 260,
  },
  detailsStatusPillWrap: {
    flexDirection: "row",
  },
  detailsStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  detailsStatusText: {
    fontWeight: "700",
    fontSize: 13,
  },
  detailsGroup: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    gap: 9,
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsRowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailsLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  detailsValue: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  detailsValueStrong: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "700",
  },
  detailsReference: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
  },
  detailsWarningBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  detailsWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 17,
  },
  detailsCloseButton: {
    marginTop: 2,
    backgroundColor: "#0EA5A4",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  detailsCloseButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  reviewModalCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  reviewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  reviewModalSubtitle: {
    fontSize: 14,
    color: "#475569",
  },
  starRow: {
    flexDirection: "row",
    gap: 4,
  },
  reviewInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#0F172A",
  },
  reviewModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
  modalButtonGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalButtonGhostText: {
    color: "#475569",
    fontWeight: "600",
  },
});
