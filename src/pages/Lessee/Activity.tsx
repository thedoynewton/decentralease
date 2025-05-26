import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";
import { createClient } from "@supabase/supabase-js";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"; // Removed usePrepareSendTransaction
import { parseEther } from "viem";

// Import your contract configuration
import {
  ESCROW_CONTRACT_ADDRESS,
  ESCROW_ABI,
} from "../../contracts/contractConfig"; // Adjust path if needed

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

  // State for Deposit transaction
  const [depositBookingId, setDepositBookingId] = useState<string | null>(null);
  const {
    data: depositHash,
    writeContract: depositFunds, // Renamed for clarity
    isPending: isDepositPending,
    isSuccess: isDepositTxSent,
    isError: isDepositTxError,
    error: depositTxError,
  } = useWriteContract();

  // State for Release transaction
  const [releaseBookingId, setReleaseBookingId] = useState<string | null>(null);
  const {
    data: releaseHash,
    writeContract: releaseFunds, // Renamed for clarity
    isPending: isReleasePending,
    isSuccess: isReleaseTxSent,
    isError: isReleaseTxError,
    error: releaseTxError,
  } = useWriteContract();

  // --- Watch for Deposit Transaction Receipt ---
  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositConfirmed,
    isError: isDepositConfirmError,
    error: depositConfirmError,
  } = useWaitForTransactionReceipt({
    hash: depositHash,
    query: {
      enabled: !!depositHash, // Only enable if a hash exists
    },
  });

  // --- Watch for Release Transaction Receipt ---
  const {
    isLoading: isReleaseConfirming,
    isSuccess: isReleaseConfirmed,
    isError: isReleaseConfirmError,
    error: releaseConfirmError,
  } = useWaitForTransactionReceipt({
    hash: releaseHash,
    query: {
      enabled: !!releaseHash, // Only enable if a hash exists
    },
  });

  // Effect to handle Deposit transaction success (sent to network)
  useEffect(() => {
    if (isDepositTxSent && depositBookingId && depositHash) {
      console.log(`Deposit transaction sent! Hash: ${depositHash}`);
      alert(
        `Deposit transaction sent for booking ${depositBookingId}. Waiting for confirmation...`
      );
      // No Supabase update here yet, wait for confirmation
    }

    if (isDepositTxError && depositBookingId) {
      console.error("Deposit transaction failed to send:", depositTxError);
      alert(`Deposit failed: ${depositTxError?.message || "Unknown error"}`);
      setDepositBookingId(null); // Clear pending booking ID on send error
    }
  }, [
    isDepositTxSent,
    isDepositTxError,
    depositTxError,
    depositHash,
    depositBookingId,
  ]);

  // Effect to handle Deposit transaction confirmation (mined on-chain)
  useEffect(() => {
    if (isDepositConfirmed && depositBookingId) {
      console.log(
        `Deposit confirmed for booking ${depositBookingId}! Hash: ${depositHash}`
      );
      const updateBookingStatus = async () => {
        const { error: updateError } = await supabase
          .from("bookings_duplicate")
          .update({ status: "paid" }) // Update to 'paid' after successful deposit
          .eq("id", depositBookingId);

        if (updateError) {
          console.error(
            "Failed to update booking status to 'paid':",
            updateError
          );
          alert(
            "Deposit confirmed, but failed to update booking status in database."
          );
        } else {
          console.log(`Booking ${depositBookingId} status updated to 'paid'.`);
          fetchUserBookings(); // Re-fetch bookings to refresh UI
          alert(
            `Deposit successful! Booking ${depositBookingId} is now 'paid'.`
          );
        }
        setDepositBookingId(null); // Clear state after processing
      };
      updateBookingStatus();
    }

    if (isDepositConfirmError && depositBookingId) {
      console.error(
        "Deposit transaction failed on-chain:",
        depositConfirmError
      );
      alert(
        `Deposit failed on-chain: ${
          depositConfirmError?.message || "Unknown error"
        }`
      );
      setDepositBookingId(null); // Clear state on confirmation error
    }
  }, [
    isDepositConfirmed,
    isDepositConfirmError,
    depositConfirmError,
    depositBookingId,
    depositHash,
    address,
  ]);

  // Effect to handle Release transaction success (sent to network)
  useEffect(() => {
    if (isReleaseTxSent && releaseBookingId && releaseHash) {
      console.log(`Release transaction sent! Hash: ${releaseHash}`);
      alert(
        `Release transaction sent for booking ${releaseBookingId}. Waiting for confirmation...`
      );
    }

    if (isReleaseTxError && releaseBookingId) {
      console.error("Release transaction failed to send:", releaseTxError);
      alert(`Release failed: ${releaseTxError?.message || "Unknown error"}`);
      setReleaseBookingId(null);
    }
  }, [
    isReleaseTxSent,
    isReleaseTxError,
    releaseTxError,
    releaseHash,
    releaseBookingId,
  ]);

  // Effect to handle Release transaction confirmation (mined on-chain)
  useEffect(() => {
    if (isReleaseConfirmed && releaseBookingId) {
      console.log(
        `Release confirmed for booking ${releaseBookingId}! Hash: ${releaseHash}`
      );
      const updateBookingStatus = async () => {
        const { error: updateError } = await supabase
          .from("bookings_duplicate")
          .update({ status: "completed" }) // Update to 'completed' after successful release
          .eq("id", releaseBookingId);

        if (updateError) {
          console.error(
            "Failed to update booking status to 'completed':",
            updateError
          );
          alert(
            "Release confirmed, but failed to update booking status in database."
          );
        } else {
          console.log(
            `Booking ${releaseBookingId} status updated to 'completed'.`
          );
          fetchUserBookings(); // Re-fetch bookings to refresh UI
          alert(
            `Release successful! Booking ${releaseBookingId} is now 'completed'.`
          );
        }
        setReleaseBookingId(null); // Clear state after processing
      };
      updateBookingStatus();
    }

    if (isReleaseConfirmError && releaseBookingId) {
      console.error(
        "Release transaction failed on-chain:",
        releaseConfirmError
      );
      alert(
        `Release failed on-chain: ${
          releaseConfirmError?.message || "Unknown error"
        }`
      );
      setReleaseBookingId(null); // Clear state on confirmation error
    }
  }, [
    isReleaseConfirmed,
    isReleaseConfirmError,
    releaseConfirmError,
    releaseBookingId,
    releaseHash,
    address,
  ]);

  // This function is defined here so it can be called from within effects
  // and other parts of the component where a fresh fetch is needed.
  async function fetchUserBookings() {
    setLoading(true);
    console.log("Fetching bookings for wallet address:", address); // Log the wallet address

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
    console.log("User found in DB:", user); // Log the user data

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings_duplicate")
      .select(
        `
      id,
      total_amount,
      status,
      contract_booking_id,
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
      console.log("Fetched bookings data:", bookingsData); // <--- IMPORTANT: Log the fetched data
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

  // --- Event Handlers for Contract Interactions ---

  // Changed parameter to accept the full booking object
  const handleDeposit = (booking: any) => {
    const amount = booking.total_amount;
    const contractBookingId = booking.contract_booking_id; // Get the numeric ID

    // Basic validation
    if (!contractBookingId) {
      alert("Error: Numeric contract booking ID is missing for this booking.");
      console.error("Missing contract_booking_id for booking:", booking.id);
      return;
    }
    if (!amount || amount <= 0) {
      alert("Invalid amount for deposit.");
      return;
    }

    // Set the booking ID we're processing for deposit (use original Supabase ID for UI state)
    setDepositBookingId(booking.id);

    try {
      depositFunds({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "deposit",
        args: [BigInt(contractBookingId)], // <--- Use the numeric contract_booking_id here
        value: parseEther(amount.toString()), // Amount to deposit
      });
      console.log(
        `Initiating deposit for Supabase ID: ${booking.id}, Contract ID: ${contractBookingId}, Amount: ${amount}`
      );
    } catch (e: any) {
      console.error("Error initiating deposit:", e);
      alert(`Error initiating deposit: ${e.message}`);
      setDepositBookingId(null);
    }
  };

  // Changed parameter to accept the full booking object
  const handleRelease = (booking: any) => {
    const contractBookingId = booking.contract_booking_id; // Get the numeric ID

    if (!contractBookingId) {
      alert("Error: Numeric contract booking ID is missing for this booking.");
      console.error("Missing contract_booking_id for booking:", booking.id);
      return;
    }

    // Set the booking ID we're processing for release (use original Supabase ID for UI state)
    setReleaseBookingId(booking.id);

    try {
      releaseFunds({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: "release",
        args: [BigInt(contractBookingId)], // <--- Use the numeric contract_booking_id here
      });
      console.log(
        `Initiating release for Supabase ID: ${booking.id}, Contract ID: ${contractBookingId}`
      );
    } catch (e: any) {
      console.error("Error initiating release:", e);
      alert(`Error initiating release: ${e.message}`);
      setReleaseBookingId(null);
    }
  };

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
                <li
                  key={booking.id}
                  style={{
                    marginBottom: "1rem",
                    border: "1px solid #eee",
                    padding: "10px",
                    borderRadius: "8px",
                  }}
                >
                  {booking.listing_id?.image_url && (
                    <img
                      src={booking.listing_id.image_url}
                      alt={booking.listing_id.title}
                      style={{
                        width: "120px",
                        height: "auto",
                        borderRadius: "8px",
                        marginBottom: "10px",
                      }}
                    />
                  )}
                  <div>
                    <strong>{booking.listing_id?.title}</strong>
                  </div>
                  <div>Total Amount: {booking.total_amount} ETH</div>
                  {/* Display Lessor Wallet Address */}
                  {booking.listing_id?.user_id?.wallet_address && (
                    <div>
                      Lessor Wallet:{" "}
                      <span style={{ fontSize: "0.9em", color: "#555" }}>
                        {booking.listing_id.user_id.wallet_address}
                      </span>
                    </div>
                  )}

                  {/* --- Buttons based on Booking Status --- */}

                  {/* Pay Now Button (for approved bookings) */}
                  {booking.status.toLowerCase() === "approved" && (
                    <button
                      onClick={
                        () => handleDeposit(booking) // <--- Pass the entire 'booking' object
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
                        opacity:
                          (isDepositPending &&
                            depositBookingId === booking.id) ||
                          (isDepositConfirming &&
                            depositBookingId === booking.id)
                            ? 0.6
                            : 1,
                      }}
                      disabled={
                        (isDepositPending && depositBookingId === booking.id) ||
                        (isDepositConfirming && depositBookingId === booking.id)
                      }
                    >
                      {isDepositPending && depositBookingId === booking.id
                        ? "Confirm Deposit..."
                        : isDepositConfirming && depositBookingId === booking.id
                        ? "Depositing..."
                        : "Pay Now (Deposit)"}
                    </button>
                  )}

                  {/* Confirm Completion Button (for paid bookings) */}
                  {booking.status.toLowerCase() === "paid" && (
                    <button
                      onClick={() => handleRelease(booking)} // <--- Pass the entire 'booking' object
                      style={{
                        marginTop: "10px",
                        padding: "0.7rem 1.2rem",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#0070f3", // Blue color for confirm button
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "1em",
                        fontWeight: "bold",
                        opacity:
                          (isReleasePending &&
                            releaseBookingId === booking.id) ||
                          (isReleaseConfirming &&
                            releaseBookingId === booking.id)
                            ? 0.6
                            : 1,
                      }}
                      disabled={
                        (isReleasePending && releaseBookingId === booking.id) ||
                        (isReleaseConfirming && releaseBookingId === booking.id)
                      }
                    >
                      {isReleasePending && releaseBookingId === booking.id
                        ? "Confirm Release..."
                        : isReleaseConfirming && releaseBookingId === booking.id
                        ? "Releasing Funds..."
                        : "Confirm Completion"}
                    </button>
                  )}

                  {/* --- Transaction Status Feedback --- */}
                  {/* Deposit Feedback */}
                  {depositBookingId === booking.id && isDepositPending && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#0070f3",
                      }}
                    >
                      Waiting for deposit wallet confirmation...
                    </p>
                  )}
                  {depositBookingId === booking.id &&
                    isDepositTxSent &&
                    !isDepositConfirming && (
                      <p
                        style={{
                          marginTop: "5px",
                          fontSize: "0.85em",
                          color: "#0070f3",
                        }}
                      >
                        Deposit sent! Waiting for block confirmation...
                        <br />
                        Hash: {depositHash?.slice(0, 6)}...
                        {depositHash?.slice(-4)}
                      </p>
                    )}
                  {depositBookingId === booking.id && isDepositConfirmed && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#28a745",
                      }}
                    >
                      Deposit Confirmed! Booking status updated.
                    </p>
                  )}
                  {depositBookingId === booking.id && isDepositTxError && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#dc3545",
                      }}
                    >
                      Deposit failed: {depositTxError?.message}
                    </p>
                  )}
                  {depositBookingId === booking.id && isDepositConfirmError && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#dc3545",
                      }}
                    >
                      Deposit failed on-chain: {depositConfirmError?.message}
                    </p>
                  )}

                  {/* Release Feedback */}
                  {releaseBookingId === booking.id && isReleasePending && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#0070f3",
                      }}
                    >
                      Waiting for release wallet confirmation...
                    </p>
                  )}
                  {releaseBookingId === booking.id &&
                    isReleaseTxSent &&
                    !isReleaseConfirming && (
                      <p
                        style={{
                          marginTop: "5px",
                          fontSize: "0.85em",
                          color: "#0070f3",
                        }}
                      >
                        Release sent! Waiting for block confirmation...
                        <br />
                        Hash: {releaseHash?.slice(0, 6)}...
                        {releaseHash?.slice(-4)}
                      </p>
                    )}
                  {releaseBookingId === booking.id && isReleaseConfirmed && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#28a745",
                      }}
                    >
                      Release Confirmed! Booking status updated.
                    </p>
                  )}
                  {releaseBookingId === booking.id && isReleaseTxError && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#dc3545",
                      }}
                    >
                      Release failed: {releaseTxError?.message}
                    </p>
                  )}
                  {releaseBookingId === booking.id && isReleaseConfirmError && (
                    <p
                      style={{
                        marginTop: "5px",
                        fontSize: "0.85em",
                        color: "#dc3545",
                      }}
                    >
                      Release failed on-chain: {releaseConfirmError?.message}
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
