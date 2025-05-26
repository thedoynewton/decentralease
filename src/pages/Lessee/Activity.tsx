import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";
import { createClient } from "@supabase/supabase-js";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi"; // Removed usePrepareSendTransaction
import { parseEther } from "viem";

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

  // State to temporarily store the bookingId after initiating a transaction
  // This is used for updating Supabase after the transaction is sent/confirmed.
  const [currentBookingIdForTx, setCurrentBookingIdForTx] = useState<string | null>(null);

  // useSendTransaction hook
  const {
    data: hash,
    sendTransaction, // This is the function you'll call directly
    isPending, // True while wallet confirmation is open/transaction is being sent
    isSuccess: isSendSuccess, // True if transaction was successfully sent to the network
    isError: isSendError, // True if there was an error sending the transaction (e.g., user rejected)
    error: sendError,
  } = useSendTransaction();

  // useWaitForTransactionReceipt hook to check if the transaction is mined
  const {
    isLoading: isConfirming, // True while waiting for transaction to be mined
    isSuccess: isConfirmed, // True if transaction is mined and confirmed
    isError: isConfirmError, // True if transaction failed on-chain
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: hash,
    query: {
      // Only enable this query if we have a hash to watch
      enabled: !!hash,
    },
  });

  // Effect to handle the result of the transaction (sent to network)
  useEffect(() => {
    if (isSendSuccess && currentBookingIdForTx && hash) {
      console.log(`Transaction sent successfully! Hash: ${hash}`);
      // At this point, the transaction is on the network, but not necessarily mined.
      // We can update the UI or show a pending message.
      // The Supabase update will happen once 'isConfirmed' is true.
      alert(`Transaction sent to network. Waiting for confirmation: ${hash}`);
    }

    if (isSendError) {
      console.error("Transaction failed to send:", sendError);
      alert(`Transaction failed: ${sendError?.message || "Unknown error"}`);
      setCurrentBookingIdForTx(null); // Clear pending booking ID on send error
    }
  }, [isSendSuccess, isSendError, sendError, hash, currentBookingIdForTx]);

  // Effect to handle the result of the transaction (mined and confirmed)
  useEffect(() => {
    if (isConfirmed && currentBookingIdForTx) {
      console.log(`Transaction confirmed on-chain! Hash: ${hash}`);
      // Now update the booking status in Supabase
      const updateBookingStatus = async () => {
        // Optionally show loading state during update
        // setLoading(true); // You might want a finer-grained loading for just the Supabase update
        const { error: updateError } = await supabase
          .from("bookings_duplicate")
          .update({ status: "paid" })
          .eq("id", currentBookingIdForTx);

        if (updateError) {
          console.error("Failed to update booking status in DB:", updateError);
          alert("Payment confirmed on-chain, but failed to update booking status in database.");
        } else {
          console.log(`Booking ${currentBookingIdForTx} status updated to 'paid' in DB.`);
          // Re-fetch bookings to update UI
          fetchUserBookings(); // Call fetchUserBookings to refresh the list
          alert(`Payment successful and confirmed! Booking ${currentBookingIdForTx} is now 'paid'.`);
        }
        // setLoading(false);
      };
      updateBookingStatus();
      setCurrentBookingIdForTx(null); // Clear booking ID after successful confirmation and DB update
    }

    if (isConfirmError && currentBookingIdForTx) {
      console.error("Transaction failed on-chain:", confirmError);
      alert(`Transaction failed on-chain: ${confirmError?.message || "Unknown error"}`);
      setCurrentBookingIdForTx(null); // Clear booking ID on confirmation error
      // You might want to revert the booking status or log for manual review here
    }
  }, [isConfirmed, isConfirmError, confirmError, currentBookingIdForTx, hash, address]); // Added address for fetchUserBookings dependency

  // This function is defined here so it can be called from within effects
  // and other parts of the component where a fresh fetch is needed.
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
      .select(
        `
        id,
        total_amount,
        status,
        listing_id (
          title,
          image_url,
          user_id (
            wallet_address
          )
        )
      `
      )
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

  // Initial fetch on component mount or address change
  useEffect(() => {
    if (address) {
      fetchUserBookings();
    } else {
      setBookings([]);
      setLoading(false);
    }
  }, [address]);

  const filteredBookings = bookings.filter(
    (b) => b.status.toLowerCase() === activeTab.toLowerCase()
  );

  // The handlePayNow function now directly calls sendTransaction
  const handlePayNow = (bookingId: string, amount: number, lessorWallet: string) => {
    if (!lessorWallet || !amount) {
      alert("Invalid payment details provided.");
      return;
    }

    // Set the booking ID we're attempting to pay for
    setCurrentBookingIdForTx(bookingId);

    // Call sendTransaction directly
    try {
      sendTransaction({
        to: lessorWallet as `0x${string}`, // Ensure correct type for wagmi
        value: parseEther(amount.toString()), // Convert amount to wei (bigint)
      });
      console.log("Transaction initiated for booking:", bookingId);
      // Wallet prompt will appear. Status will be handled by useEffects.
    } catch (e: any) {
      console.error("Error initiating transaction (caught locally):", e);
      alert(`Error initiating transaction: ${e.message}`);
      setCurrentBookingIdForTx(null); // Clear booking ID on local error
    }
  };

  const isAnyTransactionActive = isPending || isConfirming;

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
                <li key={booking.id} style={{ marginBottom: "1rem", border: "1px solid #eee", padding: "10px", borderRadius: "8px" }}>
                  {booking.listing_id?.image_url && (
                    <img
                      src={booking.listing_id.image_url}
                      alt={booking.listing_id.title}
                      style={{
                        width: "120px",
                        height: "auto",
                        borderRadius: "8px",
                        marginBottom: "10px"
                      }}
                    />
                  )}
                  <div>
                    <strong>{booking.listing_id?.title}</strong>
                  </div>
                  <div>Total Amount: {booking.total_amount} ETH</div> {/* Added ETH for clarity */}
                  {/* Display Lessor Wallet Address */}
                  {booking.listing_id?.user_id?.wallet_address && (
                    <div>
                      Lessor Wallet:{" "}
                      <span style={{ fontSize: "0.9em", color: "#555" }}>
                        {booking.listing_id.user_id.wallet_address}
                      </span>
                    </div>
                  )}

                  {/* Pay Now Button (conditionally rendered) */}
                  {booking.status.toLowerCase() === "approved" && (
                    <button
                      onClick={() =>
                        handlePayNow(
                          booking.id,
                          booking.total_amount,
                          booking.listing_id.user_id.wallet_address
                        )
                      }
                      style={{
                        marginTop: "10px",
                        padding: "0.7rem 1.2rem",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#28a745", // Green color for pay button
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "1em",
                        fontWeight: "bold",
                        // Disable button if any transaction is active OR if THIS booking is the one being processed
                        opacity: isAnyTransactionActive || currentBookingIdForTx === booking.id ? 0.6 : 1,
                      }}
                      // Disable button if any transaction is active OR if THIS booking is the one being processed
                      disabled={isAnyTransactionActive || currentBookingIdForTx === booking.id}
                    >
                      {currentBookingIdForTx === booking.id && isPending
                        ? "Confirm in wallet..."
                        : currentBookingIdForTx === booking.id && isConfirming
                          ? "Sending..."
                          : "Pay Now"}
                    </button>
                  )}
                  {/* Transaction status feedback for the current booking */}
                  {currentBookingIdForTx === booking.id && isPending && (
                    <p style={{ marginTop: "5px", fontSize: "0.85em", color: "#0070f3" }}>
                      Waiting for wallet confirmation...
                    </p>
                  )}
                  {currentBookingIdForTx === booking.id && isSendSuccess && !isConfirming && (
                    <p style={{ marginTop: "5px", fontSize: "0.85em", color: "#0070f3" }}>
                      Transaction sent! Waiting for block confirmation...
                      <br />Hash: {hash?.slice(0, 6)}...{hash?.slice(-4)}
                    </p>
                  )}
                  {currentBookingIdForTx === booking.id && isConfirmed && (
                    <p style={{ marginTop: "5px", fontSize: "0.85em", color: "#28a745" }}>
                      Payment Confirmed!
                    </p>
                  )}
                  {currentBookingIdForTx === booking.id && isSendError && (
                    <p style={{ marginTop: "5px", fontSize: "0.85em", color: "#dc3545" }}>
                      Transaction failed: {sendError?.message}
                    </p>
                  )}
                  {currentBookingIdForTx === booking.id && isConfirmError && (
                    <p style={{ marginTop: "5px", fontSize: "0.85em", color: "#dc3545" }}>
                      Transaction failed on-chain: {confirmError?.message}
                    </p>
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