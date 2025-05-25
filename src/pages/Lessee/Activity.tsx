import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";
import { createClient } from "@supabase/supabase-js";
import { useAccount } from "wagmi";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const STATUS_TABS = ["Pending", "approved", "paid", "completed"];

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Pending");

  useEffect(() => {
    if (!address) {
      setBookings([]);
      setLoading(false);
      return;
    }

    async function fetchUserBookings() {
      setLoading(true);

      const { data: user, error: userError } = await supabase
        .from("users_duplicate")
        .select("id")
        .eq("wallet_address", address)
        .single();

      if (userError || !user) {
        console.error("User lookup failed:", userError);
        setBookings([]);
        setLoading(false);
        return;
      }

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings_duplicate")
        .select(`
          id,
          total_amount,
          status,
          listing_id (
            title,
            image_url
          )
        `)
        .in("status", STATUS_TABS)
        .eq("lessee_id", user.id);

      if (bookingsError) {
        console.error("Booking fetch error:", bookingsError);
        setBookings([]);
      } else {
        setBookings(bookingsData || []);
      }

      setLoading(false);
    }

    fetchUserBookings();
  }, [address]);

  const filteredBookings = bookings.filter(
    (b) => b.status.toLowerCase() === activeTab.toLowerCase()
  );

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Activity</h1>

        {/* Tabs */}
        <div className={styles.tabContainer} style={{ marginBottom: "1rem" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "0.5rem 1rem",
                marginRight: "0.5rem",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor: activeTab === tab ? "#0070f3" : "#f0f0f0",
                color: activeTab === tab ? "#fff" : "#000",
                cursor: "pointer",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.infoBox}>
          <strong>{activeTab} Bookings</strong>
          {loading ? (
            <p>Loading...</p>
          ) : filteredBookings.length === 0 ? (
            <p>No {activeTab.toLowerCase()} bookings found.</p>
          ) : (
            <ul>
              {filteredBookings.map((booking) => (
                <li key={booking.id} style={{ marginBottom: "1rem" }}>
                  {booking.listing_id?.image_url && (
                    <img
                      src={booking.listing_id.image_url}
                      alt={booking.listing_id.title}
                      style={{
                        width: "120px",
                        height: "auto",
                        borderRadius: "8px",
                      }}
                    />
                  )}
                  <div>
                    <strong>{booking.listing_id?.title}</strong>
                  </div>
                  <div>Total Amount: ${booking.total_amount}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
