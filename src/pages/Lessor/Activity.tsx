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
                  {activeTab === "paid" && booking.image_proof_url && (
                    <span style={{ color: "#43a047", fontWeight: 500 }}>
                      In use
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}