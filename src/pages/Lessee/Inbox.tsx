import { useState, useEffect, useRef } from "react";
import Layout from "../../../components/LesseeLayout";
import styles from "../../styles/Inbox.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import BookingSummaryCard from "../../../components/BookingSummaryCard";
import MessageList from "../../../components/MessageList";
import MessageInput from "../../../components/MessageInput";

interface Booking {
  id: string;
  status: string;
  lessee_id: string;
  lessorName?: string;
  lessorProfileImageUrl?: string;
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
  const [approvedBookings, setApprovedBookings] = useState<Booking[]>([]);
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

  useEffect(() => {
    async function fetchApprovedBookings() {
      if (!isConnected || !address) {
        setLoading(false);
        setApprovedBookings([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", address)
          .single();

        if (userError) {
          throw new Error(`Error fetching user ID: ${userError.message}`);
        }

        if (!userData) {
          setApprovedBookings([]);
          setLoading(false);
          setError("No user found for the connected wallet address.");
          return;
        }

        const currentLesseeId = userData.id;

        const { data, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            `
            *,
            listings (
              user_id,
              title,
              users (
                name,
                profile_image_url
              )
            )
            `
          )
          .eq("lessee_id", currentLesseeId)
          .eq("status", "approved");

        if (bookingsError) {
          throw new Error(
            `Error fetching approved bookings: ${bookingsError.message}`
          );
        }

        const bookingsWithLessor =
          data?.map((booking: any) => ({
            ...booking,
            lessorName: booking.listings?.users?.name || "N/A",
            lessorProfileImageUrl:
              booking.listings?.users?.profile_image_url || null,
            updated_at: booking.updated_at,
            total_amount: booking.total_amount,
            pickup_date: booking.pickup_date,
            return_date: booking.return_date,
            listing_title: booking.listings?.title || "N/A",
          })) || [];

        setApprovedBookings(bookingsWithLessor);
        // Auto-select the first booking if available (desktop only)
        if (bookingsWithLessor.length > 0 && !isMobile) {
          setSelectedBooking(bookingsWithLessor[0]);
        }
      } catch (err: any) {
        console.error("Error fetching approved bookings:", err.message);
        setError(`Failed to fetch approved bookings: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchApprovedBookings();
    // eslint-disable-next-line
  }, [address, isConnected]);

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
          {!isConnected && <p>Connect your wallet to view bookings.</p>}
          {isConnected &&
            !loading &&
            !error &&
            approvedBookings.length === 0 && <p>No approved bookings found.</p>}
          <ul className={styles.bookingList}>
            {approvedBookings.map((booking) => (
              <li
                key={booking.id}
                className={`${styles.bookingItem} ${
                  selectedBooking?.id === booking.id ? styles.selected : ""
                }`}
                onClick={() => handleBookingClick(booking)}
              >
                <div className={styles.avatar}>
                  {booking.lessorProfileImageUrl ? (
                    <img
                      src={booking.lessorProfileImageUrl}
                      alt={booking.lessorName}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    booking.lessorName?.[0] || "?"
                  )}
                </div>
                <div>
                  <div className={styles.lessorName}>{booking.lessorName}</div>
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
                {selectedBooking.lessorProfileImageUrl ? (
                  <img
                    src={selectedBooking.lessorProfileImageUrl}
                    alt={selectedBooking.lessorName}
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
                    {selectedBooking.lessorName?.[0] || "?"}
                  </div>
                )}
                <div>
                  <div>{selectedBooking.lessorName}</div>
                </div>
              </div>
              <BookingSummaryCard booking={selectedBooking} />
              <p>
                <b>Status:</b> {selectedBooking.status}
              </p>
              <MessageList
                messages={messages}
                address={address}
                messagesEndRef={messagesEndRef}
                timeAgo={timeAgo}
              />
              <MessageInput
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                sending={sending}
                onSend={handleSendMessage}
              />
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
                {selectedBooking.lessorProfileImageUrl ? (
                  <img
                    src={selectedBooking.lessorProfileImageUrl}
                    alt={selectedBooking.lessorName}
                    className={styles.lessorProfileImage}
                  />
                ) : (
                  <div
                    className={`${styles.avatar} ${styles.lessorProfileAvatar}`}
                  >
                    {selectedBooking.lessorName?.[0] || "?"}
                  </div>
                )}
                <div className={styles.lessorProfileName}>
                  <div>{selectedBooking.lessorName}</div>
                </div>
              </div>
              <BookingSummaryCard booking={selectedBooking} />
              <p>
                <b>Status:</b> {selectedBooking.status}
              </p>
              <MessageList
                messages={messages}
                address={address}
                messagesEndRef={messagesEndRef}
                timeAgo={timeAgo}
              />
              <MessageInput
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                sending={sending}
                onSend={handleSendMessage}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
