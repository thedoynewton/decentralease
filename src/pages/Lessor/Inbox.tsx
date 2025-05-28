import { useState, useEffect, useRef, useMemo } from "react";
import styles from "../../styles/Inbox.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import BookingSummaryCard from "../../../components/BookingSummaryCard";
import MessageList from "../../../components/MessageList";
import MessageInput from "../../../components/MessageInput";
import Layout from "../../../components/LessorLayout";

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

// --- Time ago utility ---
function timeAgo(dateString?: string) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

export default function Inbox() {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const isMobile = useIsMobile();

  // Message state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [bookingNotifications, setBookingNotifications] = useState<any[]>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);

  // Add these handlers above the return statement
  const handleApprove = async () => {
    if (!selectedBooking) return;
    // Update booking status to 'approved'
    await supabase
      .from("bookings")
      .update({ status: "approved" })
      .eq("id", selectedBooking.id);
    setSelectedBooking({ ...selectedBooking, status: "approved" });
    // Optionally, refetch bookings here
  };

  const handleDecline = async () => {
    if (!selectedBooking) return;
    // Update booking status to 'declined'
    await supabase
      .from("bookings")
      .update({ status: "declined" })
      .eq("id", selectedBooking.id);
    setSelectedBooking({ ...selectedBooking, status: "declined" });
    // Optionally, refetch bookings here
  };

  // Fetch all booking_request notifications for this lessor
  useEffect(() => {
    async function fetchBookingNotifications() {
      setLoading(true);
      if (!address) {
        setBookingNotifications([]);
        setLoading(false);
        return;
      }
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();
      if (!userData) {
        setBookingNotifications([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userData.id)
        .eq("type", "booking_request")
        .order("created_at", { ascending: false });
      setBookingNotifications(data || []);
      setLoading(false);
    }
    fetchBookingNotifications();
  }, [address]);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);

      if (!isConnected || !address) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Get lessor's user id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();

      if (userError) {
        setError(`Error fetching user ID: ${userError.message}`);
        setBookings([]);
        setLoading(false);
        return;
      }

      if (!userData) {
        setError("No user found for the connected wallet address.");
        setBookings([]);
        setLoading(false);
        return;
      }

      // Fetch all bookings where the listing belongs to the connected user (lessor)
      const { data, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          listings (
            user_id,
            title
          ),
          users (
            id,
            name,
            profile_image_url
            )
          `
        )
        .eq("listings.user_id", userData.id);

      if (bookingsError) {
        setError(`Error fetching bookings: ${bookingsError.message}`);
        setBookings([]);
        setLoading(false);
        return;
      }

      const bookingsWithTitle =
        data
          ?.filter(
            (booking: any) =>
              booking.listings && booking.listings.user_id === userData.id
          )
          .map((booking: any) => ({
            ...booking,
            listing_title: booking.listings?.title || "N/A",
            lesseeName: booking.users?.name || "Unknown",
            lesseeProfileImageUrl: booking.users?.profile_image_url || null,
          })) || [];

      const prioritizedBookings = bookingsWithTitle.sort((a: any, b: any) => {
        const aNotif = bookingNotifications.find(
          (n) =>
            n.booking_id === a.id && n.type === "booking_request" && !n.is_read
        );
        const bNotif = bookingNotifications.find(
          (n) =>
            n.booking_id === b.id && n.type === "booking_request" && !n.is_read
        );
        if (aNotif && !bNotif) return -1;
        if (!aNotif && bNotif) return 1;
        return 0;
      });

      setBookings(prioritizedBookings);
      setLoading(false);
    }

    fetchBookings();
  }, [address, isConnected, bookingNotifications]);

  // Combine booking request notification with messages for the selected booking
  const combinedMessages = useMemo(() => {
    if (!selectedBooking) return messages;
    const notif = bookingNotifications.find(
      (n) => n.booking_id === selectedBooking.id
    );
    if (notif) {
      return [
        {
          id: notif.id,
          booking_id: notif.booking_id,
          sender_id: "system",
          content: notif.message,
          created_at: notif.created_at,
          isNotification: true,
        },
        ...messages,
      ];
    }
    return messages;
  }, [selectedBooking, bookingNotifications, messages]);

  async function handleSendMessage(e: React.FormEvent, imageUrl?: string) {
    e.preventDefault();
    if ((!messageInput.trim() && !imageUrl) || !selectedBooking || !address)
      return;
    setSending(true);
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", address)
      .single();
    if (!userData) return setSending(false);
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          booking_id: selectedBooking.id,
          sender_id: userData.id,
          content: imageUrl ? "" : messageInput,
          image_url: imageUrl || null,
        },
      ])
      .select();
    if (!error && data) {
      setMessages((prev) => [...prev, data[0]]);
      setMessageInput("");
    }
    setSending(false);
  }

  // Add this useEffect to fetch messages when selectedBooking changes
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedBooking) {
        setMessages([]);
        return;
      }
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("booking_id", selectedBooking.id)
        .order("created_at", { ascending: true });
      if (!error) setMessages(data || []);
    }
    fetchMessages();
  }, [selectedBooking]);

  // Open modal on mobile when a booking is selected
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    if (isMobile) setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  return (
    <Layout>
      <div className={styles.messengerContainer}>
        {/* Sidebar: Bookings List */}
        <div className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Inbox</h2>
          {loading && <p>Loading...</p>}
          {error && <p className={styles.error}>Error: {error}</p>}
          {isConnected && !loading && !error && bookings.length === 0 && (
            <p>No booking requests yet.</p>
          )}
          <ul className={styles.bookingList}>
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className={`${styles.bookingItem} ${
                  selectedBooking?.id === booking.id ? styles.selected : ""
                }`}
                onClick={() => handleBookingClick(booking)}
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
                  <div className={styles.lessorName}>{booking.lesseeName}</div>
                  <div style={{ fontSize: "0.85em", color: "#888" }}>
                    {timeAgo(booking.updated_at)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Main: Booking Details (desktop only) */}
        {!isMobile && selectedBooking && (
          <div className={styles.main}>
            <div className={styles.bookingDetails}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                {selectedBooking.lesseeProfileImageUrl ? (
                  <img
                    src={selectedBooking.lesseeProfileImageUrl}
                    alt={selectedBooking.lesseeName}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      objectFit: "cover",
                      marginRight: 16,
                    }}
                  />
                ) : (
                  <div className={styles.avatar} style={{ marginRight: 16 }}>
                    {selectedBooking.lesseeName?.[0] || "?"}
                  </div>
                )}
                <div>
                  <div>{selectedBooking.lesseeName}</div>
                </div>
              </div>
              <BookingSummaryCard booking={selectedBooking} />
              <p>
                <b>Status:</b> {selectedBooking.status}
              </p>
              <MessageList
                messages={combinedMessages}
                address={address}
                messagesEndRef={messagesEndRef}
                timeAgo={timeAgo}
              />
              {selectedBooking.status === "Pending" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    className={styles.approveButton}
                    onClick={handleApprove}
                  >
                    Approve
                  </button>
                  <button
                    className={styles.declineButton}
                    onClick={handleDecline}
                  >
                    Decline
                  </button>
                </div>
              ) : selectedBooking.status === "declined" ? (
                <div
                  style={{ marginTop: 16, color: "#e11d48", fontWeight: 500 }}
                >
                  The booking request is declined.
                </div>
              ) : (
                <MessageInput
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  sending={sending}
                  onSend={handleSendMessage}
                />
              )}
            </div>
          </div>
        )}

        {/* Modal for mobile */}
        {isMobile && modalOpen && selectedBooking && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div
              className={styles.modalContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.backButton}
                onClick={closeModal}
                aria-label="Back"
              >
                &#8592;
              </button>
              <div className={styles.lessorProfileContainer}>
                {selectedBooking.lesseeProfileImageUrl ? (
                  <img
                    src={selectedBooking.lesseeProfileImageUrl}
                    alt={selectedBooking.lesseeName}
                    className={styles.lessorProfileImage}
                  />
                ) : (
                  <div
                    className={`${styles.avatar} ${styles.lessorProfileAvatar}`}
                  >
                    {selectedBooking.lesseeName?.[0] || "?"}
                  </div>
                )}
                <div className={styles.lessorProfileName}>
                  <div>{selectedBooking.lesseeName}</div>
                </div>
              </div>
              <BookingSummaryCard booking={selectedBooking} />
              <p>
                <b>Status:</b> {selectedBooking.status}
              </p>
              <MessageList
                messages={combinedMessages}
                address={address}
                messagesEndRef={messagesEndRef}
                timeAgo={timeAgo}
              />
              {selectedBooking.status === "Pending" ? (
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button
                    className={styles.approveButton}
                    onClick={handleApprove}
                  >
                    Approve
                  </button>
                  <button
                    className={styles.declineButton}
                    onClick={handleDecline}
                  >
                    Decline
                  </button>
                </div>
              ) : selectedBooking.status === "declined" ? (
                <div
                  style={{ marginTop: 16, color: "#e11d48", fontWeight: 500 }}
                >
                  The booking request is declined.
                </div>
              ) : (
                <MessageInput
                  messageInput={messageInput}
                  setMessageInput={setMessageInput}
                  sending={sending}
                  onSend={handleSendMessage}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
