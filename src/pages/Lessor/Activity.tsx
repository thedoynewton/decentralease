// Activity.tsx
import { useCallback, useEffect, useState } from "react";
import styles from "../../styles/LesseeActivity.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import Layout from "../../../components/LessorLayout";
import ConfirmReturnModal from "../../../components/ConfirmReturnModal";

const STATUS_TABS = ["approved", "paid", "completed"];

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("approved");

  const [modalBooking, setModalBooking] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUserBookings = useCallback(async () => {
    if (!address) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get the lessor's user id
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();

      if (userError || !user) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Fetch bookings where the listing's user_id matches the lessor's id
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
        id,
        total_amount,
        status,
        image_proof_url,
        return_date,
        lessee_confirmed,
        lessor_confirmed,
        has_damage,
        is_acknowledge,
        listing_id (
          title,
          image_url,
          user_id
        )
      `
        )
        .in("listing_id.user_id", [user.id]); // Only bookings for listings owned by this user

      if (bookingsError) {
        setBookings([]);
      } else {
        // Filter bookings where the nested listing_id.user_id matches the lessor's id
        setBookings(
          (bookingsData || []).filter(
            (b: any) => b.listing_id && b.listing_id.user_id === user.id
          )
        );
      }
    } catch (error: any) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]);

  const filteredBookings = bookings.filter(
    (b) => b.status.toLowerCase() === activeTab.toLowerCase()
  );

  // When opening the modal, pass confirmation count and has_damage
  const handleConfirmReturn = (booking: any) => {
    const confirmationCount =
      (booking.lessee_confirmed ? 1 : 0) + (booking.lessor_confirmed ? 1 : 0);
    setModalBooking({ ...booking, confirmationCount });
  };

  // Handle modal actions
  const handleModalAction = async (hasDamage: boolean) => {
    if (!modalBooking) return;
    setModalLoading(true);
    // Update both lessor_confirmed and has_damage fields
    const { error } = await supabase
      .from("bookings")
      .update({ lessor_confirmed: true, has_damage: hasDamage })
      .eq("id", modalBooking.id);

    setModalLoading(false);
    setModalBooking(null);

    if (error) {
      alert("Failed to confirm return: " + error.message);
    } else {
      alert(
        hasDamage
          ? "Marked as returned with damage."
          : "Return confirmed with no damage."
      );
      fetchUserBookings();
    }
  };

  // Example for Lessor Activity.tsx
  const handleAcknowledge = async () => {
    if (!modalBooking) return;
    setModalLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ lessor_confirmed: true, is_acknowledge: true })
      .eq("id", modalBooking.id);

    setModalLoading(false);
    setModalBooking(null);

    if (error) {
      alert("Failed to acknowledge: " + error.message);
    } else {
      alert("Acknowledged successfully.");
      fetchUserBookings();
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Activity</h1>

        {/* Tabs */}
        <div className={styles.tabContainer}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${styles.tabButton} ${
                activeTab === tab ? styles.active : ""
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.infoBox}>
          <strong>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Bookings
          </strong>
          {loading ? (
            <p>Loading...</p>
          ) : filteredBookings.length === 0 ? (
            <p>No {activeTab.toLowerCase()} bookings found.</p>
          ) : (
            <ul>
              {filteredBookings.map((booking) => (
                <li key={booking.id} className={styles.bookingItem}>
                  {booking.listing_id?.image_url && (
                    <img
                      src={booking.listing_id.image_url}
                      alt={booking.listing_id.title}
                      className={styles.bookingImage}
                    />
                  )}
                  <div className={styles.bookingDetails}>
                    <strong>{booking.listing_id?.title}</strong>
                    <div>Total Amount: {booking.total_amount} ETH</div>
                  </div>
                  {/* Upload Proof of Handover button and input removed */}
                  {activeTab === "paid" &&
                    booking.image_proof_url &&
                    (() => {
                      // Check if today is the return date or later
                      const today = new Date();
                      const returnDate = booking.return_date
                        ? new Date(booking.return_date)
                        : null;
                      const lesseeConfirmed = booking.lessee_confirmed;
                      const lessorConfirmed = booking.lessor_confirmed;
                      const totalConfirmed =
                        (lesseeConfirmed ? 1 : 0) + (lessorConfirmed ? 1 : 0);

                      // If both confirmed and status is still "paid", update to "completed"
                      if (
                        returnDate &&
                        today >= returnDate &&
                        lesseeConfirmed &&
                        lessorConfirmed &&
                        booking.status === "paid"
                      ) {
                        // Fire-and-forget status update (no await in render)
                        supabase
                          .from("bookings")
                          .update({ status: "completed" })
                          .eq("id", booking.id)
                          .then(() => fetchUserBookings());
                      }

                      if (returnDate && today >= returnDate) {
                        return (
                          <div>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>
                              Confirmation: {totalConfirmed}/2
                            </div>
                            {!lessorConfirmed && (
                              <button
                                className={styles.payButton}
                                style={{ background: "#2563eb" }}
                                onClick={() => handleConfirmReturn(booking)}
                              >
                                Confirm Return
                              </button>
                            )}
                            {lessorConfirmed && totalConfirmed < 2 && (
                              <span
                                style={{ color: "#43a047", fontWeight: 500 }}
                              >
                                Waiting for lessee confirmation...
                              </span>
                            )}
                            {totalConfirmed === 2 && (
                              <span
                                style={{ color: "#43a047", fontWeight: 500 }}
                              >
                                Both parties confirmed. Booking completed!
                              </span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <span style={{ color: "#43a047", fontWeight: 500 }}>
                          In use
                        </span>
                      );
                    })()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Modal for confirm return */}
      <ConfirmReturnModal
        open={!!modalBooking}
        imageUrl={modalBooking?.image_proof_url || ""}
        loading={modalLoading}
        hasDamage={
          modalBooking?.has_damage === undefined ||
          modalBooking?.has_damage === null
            ? null
            : modalBooking?.has_damage === true ||
              modalBooking?.has_damage === 1 ||
              modalBooking?.has_damage === "true"
            ? true
            : false
        }
        confirmationCount={modalBooking?.confirmationCount ?? 0}
        isAcknowledge={modalBooking?.is_acknowledge ?? false}
        onClose={() => setModalBooking(null)}
        onAction={handleModalAction}
        onAcknowledge={handleAcknowledge}
      />
    </Layout>
  );
}
