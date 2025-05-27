// Activity.tsx
import { useCallback, useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeActivity.module.css";
import { createClient } from "@supabase/supabase-js";
import { useAccount } from "wagmi";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// It's good practice to list statuses consistently, e.g., lowercase for DB, capitalized for display
const STATUS_TABS = ["pending", "approved", "paid", "completed"]; // Added 'cancelled' to tabs

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // Default to 'pending'

  // Refactored fetch logic into a useCallback for better reusability
  const fetchUserBookings = useCallback(async () => {
    if (!address) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();

      if (userError || !user) {
        console.error("User lookup failed:", userError?.message || "User not found");
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          total_amount,
          status,
          listing_id (
            title,
            image_url
          )
        `
        )
        .eq("lessee_id", user.id); // Filter by lessee_id

      if (bookingsError) {
        console.error("Booking fetch error:", bookingsError);
        setBookings([]);
      } else {
        setBookings(bookingsData || []);
      }
    } catch (error: any) {
      console.error("Unexpected error fetching bookings:", error.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [address]); // Depend on address

  useEffect(() => {
    fetchUserBookings();
  }, [fetchUserBookings]); // Re-fetch when fetchUserBookings changes (due to address)


  const handleCancelBooking = useCallback(async (bookingId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        const { error } = await supabase
          .from("bookings")
          .update({ status: "cancelled" }) // Set status to 'cancelled'
          .eq("id", bookingId); // Update the specific booking

        if (error) {
          console.error("Error cancelling booking:", error);
          alert(`Failed to cancel booking: ${error.message}`);
        } else {
          alert("Booking cancelled successfully!");
          // Re-fetch bookings to update the UI
          fetchUserBookings();
        }
      } catch (error: any) {
        console.error("Unexpected error during cancellation:", error);
        alert(`An error occurred: ${error.message}`);
      }
    }
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
          <strong>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Bookings</strong>
          {loading ? (
            <p>Loading...</p>
          ) : filteredBookings.length === 0 ? (
            <p>No {activeTab.toLowerCase()} bookings found.</p>
          ) : (
            <ul>
              {filteredBookings.map((booking) => (
                <li key={booking.id} className={styles.bookingItem}> {/* Added className for potential styling */}
                  {booking.listing_id?.image_url && (
                    // Using Next.js Image component for optimization
                    <img
                      src={booking.listing_id.image_url}
                      alt={booking.listing_id.title}
                      className={styles.bookingImage} // Added className for potential styling
                    />
                  )}
                  <div className={styles.bookingDetails}> {/* Added className for potential styling */}
                    <strong>{booking.listing_id?.title}</strong>
                    <div>Total Amount: {booking.total_amount} ETH</div>
                    <div>Status: {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</div>
                  </div>
                  {activeTab === "pending" && ( // Only show cancel for 'pending' bookings
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className={styles.cancelButton}
                      disabled={loading} // Disable button during loading
                    >
                      Cancel Booking
                    </button>
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