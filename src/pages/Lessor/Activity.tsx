// Activity.tsx
import { useCallback, useEffect, useState } from "react";
import styles from "../../styles/LesseeActivity.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import Layout from "../../../components/LessorLayout";
import AcknowledgeModal from "../../../components/AcknowledgeModal";
import ReleasePaymentButton from "../../../components/ReleasePaymentButton";
import InputDamageFee from "../../../components/InputDamageFee";
import CollectFundButton from "../../../components/CollectFundButton";

const STATUS_TABS = ["approved", "paid", "completed"];

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("approved");

  const [modalBooking, setModalBooking] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [ackModalBooking, setAckModalBooking] = useState<any | null>(null);
  const [ackLoading, setAckLoading] = useState(false);

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
        isDamage_paid,
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

  const handleAcknowledge = async () => {
    if (!ackModalBooking) return;
    setAckLoading(true);

    // Update lessor_confirmed and is_acknowledge
    const { error } = await supabase
      .from("bookings")
      .update({ lessor_confirmed: true, is_acknowledge: true })
      .eq("id", ackModalBooking.id);

    setAckLoading(false);
    setAckModalBooking(null);

    if (error) {
      alert("Failed to acknowledge: " + error.message);
    } else {
      alert("Acknowledged successfully.");
      fetchUserBookings();
    }
  };

  const handleReleasePayment = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);

    if (error) {
      alert("Failed to release payment: " + error.message);
    } else {
      alert("Payment released!");
      fetchUserBookings();
    }
  };

  // Add this function:
  const handleSubmitDamageFee = async (bookingId: string, fee: number) => {
    const { error } = await supabase
      .from("bookings")
      .update({ damage_fee: fee })
      .eq("id", bookingId);

    if (error) {
      alert("Failed to submit damage fee: " + error.message);
    } else {
      alert(`Damage fee submitted: ${fee}`);
      fetchUserBookings();
    }
  };

  const handleCollectFund = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);

    if (error) {
      alert("Failed to collect fund: " + error.message);
    } else {
      alert("Funds collected! Booking completed.");
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

                  {activeTab === "paid" &&
                    booking.image_proof_url &&
                    (() => {
                      const today = new Date();
                      const returnDate = booking.return_date
                        ? new Date(booking.return_date)
                        : null;
                      const lesseeConfirmed = booking.lessee_confirmed;
                      const lessorConfirmed = booking.lessor_confirmed;
                      const hasDamage = booking.has_damage;
                      const isAcknowledge = booking.is_acknowledge;
                      const totalConfirmed =
                        (lesseeConfirmed ? 1 : 0) + (lessorConfirmed ? 1 : 0);

                      if (returnDate && today >= returnDate) {
                        return (
                          <div>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>
                              Confirmation: {totalConfirmed}/2
                            </div>
                            {/* Only show ReleasePaymentButton if all conditions are met */}
                            {lesseeConfirmed &&
                              lessorConfirmed &&
                              hasDamage === false &&
                              isAcknowledge && (
                                <ReleasePaymentButton
                                  onClick={() =>
                                    handleReleasePayment(booking.id)
                                  }
                                />
                              )}

                            {lesseeConfirmed &&
                              lessorConfirmed &&
                              hasDamage === true &&
                              isAcknowledge && (
                                <>
                                  {booking.isDamage_paid ? (
                                    <CollectFundButton
                                      onClick={() =>
                                        handleCollectFund(booking.id)
                                      }
                                    />
                                  ) : (
                                    <>
                                      <InputDamageFee
                                        onSubmit={(fee) =>
                                          handleSubmitDamageFee(booking.id, fee)
                                        }
                                      />
                                      <span
                                        style={{
                                          display: "block",
                                          marginTop: 8,
                                          color: "#eab308",
                                          fontWeight: 500,
                                        }}
                                      >
                                        Input the amount of damage fee
                                      </span>
                                    </>
                                  )}
                                </>
                              )}

                            {/* Show Acknowledge button if has_damage is set and not acknowledged */}
                            {booking.has_damage !== null &&
                            !booking.is_acknowledge ? (
                              <button
                                className={styles.payButton}
                                style={{ background: "#2563eb" }}
                                onClick={() => setAckModalBooking(booking)}
                                disabled={ackLoading}
                              >
                                Acknowledge
                              </button>
                            ) : (
                              // Show waiting span if lessor has confirmed but not both parties yet
                              !lesseeConfirmed &&
                              totalConfirmed < 2 && (
                                <span
                                  style={{ color: "#43a047", fontWeight: 500 }}
                                >
                                  Waiting for lessee confirmation...
                                </span>
                              )
                            )}
                            {lesseeConfirmed &&
                              lessorConfirmed &&
                              hasDamage === false &&
                              isAcknowledge && (
                                <span
                                  style={{ color: "#43a047", fontWeight: 500 }}
                                >
                                  Both parties confirmed. You can now release
                                  payment.
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
      <AcknowledgeModal
        open={!!ackModalBooking}
        hasDamage={ackModalBooking?.has_damage ?? null}
        loading={ackLoading}
        onConfirm={handleAcknowledge}
        onCancel={() => setAckModalBooking(null)}
      />
    </Layout>
  );
}
