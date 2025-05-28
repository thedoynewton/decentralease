// Activity.tsx
import { useCallback, useEffect, useState } from "react";
import styles from "../../styles/LesseeActivity.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import Layout from "../../../components/LessorLayout";

const STATUS_TABS = ["approved", "paid", "completed"];

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("approved");

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

  const handleConfirmReturn = async (bookingId: string) => {
    if (window.confirm("Confirm that you have returned the item?")) {
      const { error } = await supabase
        .from("bookings")
        .update({ lessor_confirmed: true })
        .eq("id", bookingId);

      if (error) {
        alert("Failed to confirm return: " + error.message);
      } else {
        alert("Return confirmed!");
        fetchUserBookings();
      }
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
                                onClick={() => handleConfirmReturn(booking.id)}
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
    </Layout>
  );
}
