import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import styles from "../../styles/Inbox.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import BookingSummaryCard from "../../../components/BookingSummaryCard";

interface Booking {
  id: string;
  status: string;
  lessee_id: string;
  lesseeName?: string;
  lesseeProfileImageUrl?: string;
  updated_at: string;
  total_amount?: number;
  pickup_date?: string;
  return_date?: string;
  listing_title?: string;
}

export default function LessorInbox() {
  const { address, isConnected } = useAccount();
  const [approvedBookings, setApprovedBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isMobile] = useState(false); // You can implement proper mobile detection if needed

  useEffect(() => {
    async function fetchApprovedBookings() {
      if (!isConnected || !address) {
        setLoading(false);
        return;
      }

      try {
        // First get the user's ID from their wallet address
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('User not found');

        // Then get all bookings for listings owned by this user
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            listings!inner(
              title,
              user_id
            ),
            users!bookings_lessee_id_fkey(
              name,
              profile_image_url
            )
          `)
          .eq('listings.user_id', userData.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        const bookingsWithLessee = data?.map((booking: any) => ({
          ...booking,
          lesseeName: booking.users?.name || "N/A",
          lesseeProfileImageUrl: booking.users?.profile_image_url || null,
          updated_at: booking.updated_at,
          total_amount: booking.total_amount,
          pickup_date: booking.pickup_date,
          return_date: booking.return_date,
          listing_title: booking.listings?.title || "N/A",
        })) || [];

        setApprovedBookings(bookingsWithLessee);
        // Auto-select the first booking if available (desktop only)
        if (bookingsWithLessee.length > 0 && !isMobile) {
          setSelectedBooking(bookingsWithLessee[0]);
        }
      } catch (err: any) {
        console.error("Error fetching approved bookings:", err.message);
        setError(`Failed to fetch approved bookings: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchApprovedBookings();
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <Layout>
        <div className={styles.container}>
          <h1>Inbox</h1>
          <p>Please connect your wallet to view your bookings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <h1>Inbox</h1>
        {loading ? (
          <p>Loading bookings...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : approvedBookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          <div className={styles.bookingsList}>
            {approvedBookings.map((booking) => (
              <div
                key={booking.id}
                className={`${styles.bookingItem} ${
                  selectedBooking?.id === booking.id ? styles.selected : ""
                }`}
                onClick={() => setSelectedBooking(booking)}
              >
                <div className={styles.avatar}>
                  {booking.lesseeProfileImageUrl ? (
                    <img
                      src={booking.lesseeProfileImageUrl}
                      alt={booking.lesseeName}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    booking.lesseeName?.[0] || "?"
                  )}
                </div>
                <div>
                  <div className={styles.lesseeName}>{booking.lesseeName}</div>
                  <div style={{ fontSize: "0.85em", color: "#888" }}>
                    {new Date(booking.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedBooking && (
          <div className={styles.bookingDetails}>
            <BookingSummaryCard booking={selectedBooking} />
            <div className={styles.lesseeInfo}>
              <div className={styles.avatar}>
                {selectedBooking.lesseeProfileImageUrl ? (
                  <img
                    src={selectedBooking.lesseeProfileImageUrl}
                    alt={selectedBooking.lesseeName}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  selectedBooking.lesseeName?.[0] || "?"
                )}
              </div>
              <div>
                <div className={styles.lesseeName}>{selectedBooking.lesseeName}</div>
                <div className={styles.bookingStatus}>
                  Status: {selectedBooking.status}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 