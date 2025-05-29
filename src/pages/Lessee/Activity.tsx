// Activity.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../../../components/LesseeLayout";
import styles from "../../styles/LesseeActivity.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import BookingEscrowABI from "../../abi/BookingEscrow.json";
const ESCROW_ADDRESS = "0xa2fABFAe8ADAA44d5b02584D4579F69feCD51617";
const STATUS_TABS = ["declined", "pending", "approved", "paid", "completed"];

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [payTxHash, setPayTxHash] = useState<`0x${string}` | undefined>(
    undefined
  );
  const { writeContract, isPending } = useWriteContract();
  const { isLoading: isPayLoading, isSuccess: isPaySuccess } =
    useWaitForTransactionReceipt({
      hash: payTxHash,
    });

  const [confirmTxHash, setConfirmTxHash] = useState<`0x${string}` | undefined>(
    undefined
  );
  const { writeContract: writeConfirm, isPending: isConfirmPending } =
    useWriteContract();
  const { isLoading: isConfirmLoading, isSuccess: isConfirmSuccess } =
    useWaitForTransactionReceipt({
      hash: confirmTxHash,
    });

  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

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
        setBookings([]);
        setLoading(false);
        return;
      }

      // Updated query to fetch lessor wallet and fee breakdown
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          total_amount,
          rental_fee,
          security_deposit,
          platform_fee,
          status,
          image_proof_url,
          return_date,
          lessee_confirmed,
          lessor_confirmed,
          listing_id (
            title,
            image_url,
            user_id,
            users (
              wallet_address
            )
          )
        `
        )
        .eq("lessee_id", user.id);

      if (bookingsError) {
        setBookings([]);
      } else {
        setBookings(bookingsData || []);
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

  const handleCancelBooking = useCallback(
    async (bookingId: string) => {
      if (window.confirm("Are you sure you want to cancel this booking?")) {
        try {
          const { error } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", bookingId);

          if (error) {
            alert(`Failed to cancel booking: ${error.message}`);
          } else {
            alert("Booking cancelled successfully!");
            fetchUserBookings();
          }
        } catch (error: any) {
          alert(`An error occurred: ${error.message}`);
        }
      }
    },
    [fetchUserBookings]
  );

  // Pay Now handler for approved bookings (calls contract, then updates status)
  const handlePayNow = useCallback(
    async (booking: any) => {
      try {
        const lessorWallet = booking.listing_id?.users?.wallet_address;
        if (!lessorWallet) {
          alert("Lessor wallet address not found.");
          return;
        }
        const rentalFee = booking.rental_fee || "0";
        const securityDeposit = booking.security_deposit || "0";
        const platformFee = booking.platform_fee || "0";
        const total = (
          Number(rentalFee) +
          Number(securityDeposit) +
          Number(platformFee)
        ).toString();

        setPayingBookingId(booking.id);
        await writeContract({
          address: ESCROW_ADDRESS,
          abi: BookingEscrowABI.abi,
          functionName: "payBooking",
          args: [
            lessorWallet,
            parseEther(rentalFee),
            parseEther(securityDeposit),
            parseEther(platformFee),
          ],
          value: parseEther(total),
        });
        // wagmi will emit events and update isPaySuccess
      } catch (err: any) {
        alert("Smart contract payment failed: " + (err?.message || err));
        setPayingBookingId(null);
      }
    },
    [writeContract]
  );

  useEffect(() => {
    const updateStatus = async () => {
      if (isPaySuccess && payingBookingId) {
        await supabase
          .from("bookings")
          .update({ status: "paid" })
          .eq("id", payingBookingId);
        fetchUserBookings();
        setPayTxHash(undefined);
        setPayingBookingId(null);
      }
    };
    updateStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaySuccess, payingBookingId]);

  // Confirm Return handler (calls contract, then updates status)
  const handleConfirmReturn = useCallback(
    async (booking: any) => {
      try {
        const tx = await writeConfirm({
          address: ESCROW_ADDRESS,
          abi: BookingEscrowABI.abi,
          functionName: "confirmReturnByLessee",
          args: [booking.id],
        });
        // As above, you may need to set the hash if available
      } catch (err: any) {
        alert("Smart contract confirm failed: " + (err?.message || err));
      }
    },
    [writeConfirm]
  );

  useEffect(() => {
    const updateStatus = async () => {
      if (isConfirmSuccess) {
        // Find the booking that is still paid
        const booking = bookings.find((b: any) => b.status === "paid");
        if (booking) {
          await supabase
            .from("bookings")
            .update({ lessee_confirmed: true })
            .eq("id", booking.id);
        }
        fetchUserBookings();
        setConfirmTxHash(undefined);
      }
    };
    updateStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmSuccess]);

  const filteredBookings = bookings.filter(
    (b: any) => b.status && b.status.toLowerCase() === activeTab.toLowerCase()
  );

  // Handler to trigger file input
  const handleUploadProof = (bookingId: string) => {
    if (fileInputRefs.current[bookingId]) {
      fileInputRefs.current[bookingId]!.value = "";
      fileInputRefs.current[bookingId]!.click();
    }
  };

  // Handler for file change
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    bookingId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(bookingId);

    // Optional: You may want to fetch a transactionId for this booking
    // For demo, let's use booking.id as part of the file path
    const fileExt = file.name.split(".").pop();
    const filePath = `booking_${bookingId}_${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("booking-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Failed to upload image.");
      setUploadingId(null);
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("booking-images")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      alert("Failed to get image URL.");
      setUploadingId(null);
      return;
    }
    // Update bookings table with proof_of_handover_url
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ image_proof_url: publicUrl })
      .eq("id", bookingId);

    if (updateError) {
      alert("Failed to update booking with proof.");
    } else {
      alert("Proof of handover uploaded!");
      fetchUserBookings();
    }
    setUploadingId(null);
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
                  {activeTab === "pending" && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className={styles.cancelButton}
                      disabled={loading}
                    >
                      Cancel Booking
                    </button>
                  )}
                  {activeTab === "approved" && (
                    <button
                      onClick={() => handlePayNow(booking)}
                      className={styles.payButton}
                      disabled={isPending || isPayLoading}
                    >
                      {isPending || isPayLoading ? "Paying..." : "Pay Now"}
                    </button>
                  )}
                  {activeTab === "paid" && (
                    <>
                      {(() => {
                        const today = new Date();
                        const returnDate = booking.return_date
                          ? new Date(booking.return_date)
                          : null;
                        const lesseeConfirmed = booking.lessee_confirmed;
                        const lessorConfirmed = booking.lessor_confirmed;
                        const totalConfirmed =
                          (lesseeConfirmed ? 1 : 0) + (lessorConfirmed ? 1 : 0);
                        // If status is paid and no image proof, show upload button
                        if (
                          booking.status === "paid" &&
                          !booking.image_proof_url
                        ) {
                          return (
                            <>
                              <button
                                className={styles.payButton}
                                style={{ background: "#43a047" }}
                                onClick={() => handleUploadProof(booking.id)}
                                disabled={uploadingId === booking.id}
                              >
                                {uploadingId === booking.id
                                  ? "Uploading..."
                                  : "Upload Proof of Handover"}
                              </button>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                ref={(el) => {
                                  fileInputRefs.current[booking.id] = el;
                                }}
                                onChange={(e) =>
                                  handleFileChange(e, booking.id)
                                }
                                disabled={uploadingId === booking.id}
                              />
                            </>
                          );
                        }
                        // If status is paid, image proof exists, and today < return date, show 'In use'
                        if (
                          booking.status === "paid" &&
                          booking.image_proof_url &&
                          returnDate &&
                          today < returnDate
                        ) {
                          return (
                            <span style={{ color: "#43a047", fontWeight: 500 }}>
                              In use
                            </span>
                          );
                        }
                        // If status is paid, image proof exists, and today >= return date, show confirm/confirmation UI
                        if (
                          booking.status === "paid" &&
                          booking.image_proof_url &&
                          returnDate &&
                          today >= returnDate
                        ) {
                          // If both confirmed and status is still "paid", update to "completed"
                          if (lesseeConfirmed && lessorConfirmed) {
                            supabase
                              .from("bookings")
                              .update({ status: "completed" })
                              .eq("id", booking.id)
                              .then(() => fetchUserBookings());
                          }
                          return (
                            <div>
                              <div style={{ marginBottom: 8, fontWeight: 500 }}>
                                Confirmation: {totalConfirmed}/2
                              </div>
                              {!lesseeConfirmed && (
                                <button
                                  className={styles.payButton}
                                  style={{ background: "#2563eb" }}
                                  onClick={() => handleConfirmReturn(booking)}
                                  disabled={
                                    isConfirmPending || isConfirmLoading
                                  }
                                >
                                  {isConfirmPending || isConfirmLoading
                                    ? "Confirming..."
                                    : "Confirm Return"}
                                </button>
                              )}
                              {lesseeConfirmed && totalConfirmed < 2 && (
                                <span
                                  style={{ color: "#43a047", fontWeight: 500 }}
                                >
                                  Waiting for lessor confirmation...
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
                        // Fallback
                        return null;
                      })()}
                    </>
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
