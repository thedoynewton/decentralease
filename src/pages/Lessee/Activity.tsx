import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../../../components/LesseeLayout";
import styles from "../../styles/LesseeActivity.module.css";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import ConfirmReturnModal from "../../../components/ConfirmReturnModal";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DecentralEaseABI from "../../contract/DecentralEaseABI.json";
import { parseEther, Interface } from "ethers";

const STATUS_TABS = ["declined", "pending", "approved", "paid", "completed"];
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_DECENTRALEASE_CONTRACT_ADDRESS as `0x${string}`;
const PLATFORM_FEE = "0.0000045"; // in ETH

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [modalBooking, setModalBooking] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // For blockchain payment
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const { writeContract } = useWriteContract();
  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: (pendingTx as `0x${string}`) ?? undefined,
  });

  // Fetch bookings
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

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          total_amount,
          status,
          security_deposit,
          image_proof_url,
          return_date,
          lessee_confirmed,
          lessor_confirmed,
          has_damage,
          is_acknowledge,
          damage_fee,
          isDamage_paid,
          input_damageFee,
          remaining_deposit,
          blockchain_booking_id,
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

  // Listen for tx receipt and update booking with blockchain_booking_id
  useEffect(() => {
    if (txReceipt && payingBookingId) {
      try {
        const iface = new Interface(DecentralEaseABI as any);
        let blockchainBookingId: string | null = null;
        let isRemainingDepositReleased = false;
        let isDamageFeePaid = false;

        for (const log of txReceipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === "Paid") {
              blockchainBookingId = parsed.args.bookingId.toString();
            }
            if (parsed && parsed.name === "RemainingDepositReleased") {
              isRemainingDepositReleased = true;
            }
            if (parsed && parsed.name === "DamageFeePaid") {
              isDamageFeePaid = true;
            }
          } catch (e) {}
        }

        if (blockchainBookingId) {
          supabase
            .from("bookings")
            .update({
              status: "paid",
              blockchain_booking_id: blockchainBookingId,
            })
            .eq("id", payingBookingId)
            .then(() => fetchUserBookings());
        }

        // If RemainingDepositReleased or DamageFeePaid event is found, mark as completed
        if (isRemainingDepositReleased || isDamageFeePaid) {
          supabase
            .from("bookings")
            .update({ status: "completed" })
            .eq("id", payingBookingId)
            .then(() => fetchUserBookings());
        }
      } catch (e) {
        setTxError("Failed to parse blockchain booking ID.");
      }
      setPendingTx(null);
      setPayingBookingId(null);
    }
  }, [txReceipt, payingBookingId, fetchUserBookings]);

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

  // Pay Now handler for approved bookings (calls smart contract and updates blockchain_booking_id)
  const handlePayNow = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const lessor = booking.listing_id?.users?.wallet_address;
      if (!lessor) {
        alert("Lessor wallet address not found.");
        return;
      }

      // Use parseEther for all string values
      let rentalFee, securityDeposit, platformFee;
      try {
        rentalFee = parseEther(booking.total_amount?.toString() || "0");
        securityDeposit = parseEther(
          booking.security_deposit?.toString() || "0"
        );
        platformFee = parseEther(PLATFORM_FEE);
      } catch (e) {
        alert("Invalid fee values.");
        return;
      }
      const value = rentalFee + securityDeposit + platformFee;

      setTxError(null);

      try {
        writeContract(
          {
            address: CONTRACT_ADDRESS,
            abi: DecentralEaseABI,
            functionName: "pay",
            args: [lessor, rentalFee, securityDeposit],
            value,
          },
          {
            onSuccess: (tx) => {
              setPendingTx(tx);
              setPayingBookingId(bookingId);
            },
            onError: (err) => {
              setTxError(err.message || "Contract call failed");
            },
          }
        );
      } catch (err: any) {
        setTxError(err.message || "Contract call failed");
      }
    },
    [bookings, writeContract]
  );

  // When opening the modal, pass confirmation count and has_damage
  const handleConfirmReturn = (booking: any) => {
    const confirmationCount =
      (booking.lessee_confirmed ? 1 : 0) + (booking.lessor_confirmed ? 1 : 0);
    setModalBooking({ ...booking, confirmationCount });
  };

  // Handle modal actions
  const handleModalAction = async (hasDamage: boolean) => {
    if (!modalBooking) return;
    setModalLoading(true);
    // Update both lessee_confirmed and has_damage fields
    const { error } = await supabase
      .from("bookings")
      .update({ lessee_confirmed: true, has_damage: hasDamage })
      .eq("id", modalBooking.id);

    setModalLoading(false);
    setModalBooking(null);

    if (error) {
      alert("Failed to confirm return: " + error.message);
    } else {
      alert(
        hasDamage
          ? "Marked as returned with damage."
          : "Return confirmed with no damage."
      );
      fetchUserBookings();
    }
  };

  const handleAcknowledge = async () => {
    if (!modalBooking) return;
    setModalLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({ lessee_confirmed: true })
      .eq("id", modalBooking.id);

    setModalLoading(false);
    setModalBooking(null);

    if (error) {
      alert("Failed to acknowledge: " + error.message);
    } else {
      alert("Acknowledged successfully.");
      fetchUserBookings();
    }
  };

  const filteredBookings = bookings.filter(
    (b) => b.status.toLowerCase() === activeTab.toLowerCase()
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

  const handlePayDamageFee = async (bookingId: string) => {
    setTxError(null);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      alert("Booking not found.");
      setTxError("Booking not found.");
      return;
    }
    const blockchainBookingId = booking.blockchain_booking_id;
    const damageFee = booking.damage_fee;

    if (
      blockchainBookingId === undefined ||
      blockchainBookingId === null ||
      !/^\d+$/.test(blockchainBookingId)
    ) {
      alert(
        "Blockchain booking ID not found or invalid: " + blockchainBookingId
      );
      setTxError("Blockchain booking ID not found or invalid.");
      return;
    }
    if (
      damageFee === undefined ||
      damageFee === null ||
      isNaN(Number(damageFee))
    ) {
      alert("Damage fee not found or invalid: " + damageFee);
      setTxError("Damage fee not found or invalid.");
      return;
    }

    try {
      // alert(
      //   `Calling contract with bookingId: ${blockchainBookingId}, damageFee: ${damageFee}`
      // );
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: DecentralEaseABI,
          functionName: "payDamageFee",
          args: [BigInt(blockchainBookingId), parseEther(damageFee)],
          value: parseEther(damageFee),
        },
        {
          onSuccess: (tx) => {
            alert("Transaction sent: " + tx);
            setPendingTx(tx);
            setPayingBookingId(bookingId);
          },
          onError: (err) => {
            alert(
              "Contract call error: " + (err.message || "Contract call failed")
            );
            setTxError(err.message || "Contract call failed");
          },
        }
      );
    } catch (err: any) {
      alert("Catch error: " + (err.message || "Contract call failed"));
      setTxError(err.message || "Contract call failed");
    }
  };

  const handleReleaseRemainingBalance = async (bookingId: string) => {
    setTxError(null);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      setTxError("Booking not found.");
      return;
    }
    const blockchainBookingId = booking.blockchain_booking_id;
    const remainingDeposit = booking.remaining_deposit;

    if (
      blockchainBookingId === undefined ||
      blockchainBookingId === null ||
      !/^\d+$/.test(blockchainBookingId)
    ) {
      setTxError("Blockchain booking ID not found or invalid.");
      return;
    }
    if (
      remainingDeposit === undefined ||
      remainingDeposit === null ||
      isNaN(Number(remainingDeposit))
    ) {
      setTxError("Remaining deposit not found or invalid.");
      return;
    }

    try {
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: DecentralEaseABI,
          functionName: "releaseRemainingDeposit",
          args: [
            BigInt(blockchainBookingId),
            parseEther(remainingDeposit.toString()),
          ],
        },
        {
          onSuccess: (tx) => {
            setPendingTx(tx);
            setPayingBookingId(bookingId);
          },
          onError: (err) => {
            setTxError(err.message || "Contract call failed");
          },
        }
      );
    } catch (err: any) {
      setTxError(err.message || "Contract call failed");
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
                      onClick={() => handlePayNow(booking.id)}
                      className={styles.payButton}
                      disabled={loading || !!pendingTx}
                    >
                      {pendingTx && payingBookingId === booking.id
                        ? "Processing..."
                        : "Pay Now"}
                    </button>
                  )}
                  {txError && payingBookingId === booking.id && (
                    <div className={styles.error}>{txError}</div>
                  )}
                  {activeTab === "paid" && (
                    <>
                      {booking.image_proof_url ? (
                        (() => {
                          const today = new Date();
                          const returnDate = booking.return_date
                            ? new Date(booking.return_date)
                            : null;
                          const lesseeConfirmed = booking.lessee_confirmed;
                          const lessorConfirmed = booking.lessor_confirmed;
                          const isAcknowledge = booking.is_acknowledge;
                          const totalConfirmed =
                            (lesseeConfirmed ? 1 : 0) +
                            (lessorConfirmed ? 1 : 0);

                          if (returnDate && today >= returnDate) {
                            return (
                              <div>
                                <div
                                  style={{ marginBottom: 8, fontWeight: 500 }}
                                >
                                  Confirmation: {totalConfirmed}/2
                                </div>
                                {/* Always show Confirm Return if not acknowledged */}
                                {!isAcknowledge && (
                                  <button
                                    className={styles.payButton}
                                    style={{ background: "#2563eb" }}
                                    onClick={() => handleConfirmReturn(booking)}
                                    disabled={uploadingId === booking.id}
                                  >
                                    Confirm Return
                                  </button>
                                )}
                                {isAcknowledge && (
                                  <>
                                    {booking.has_damage === true ? (
                                      booking.remaining_deposit !== null ? (
                                        <div style={{ marginTop: 8 }}>
                                          <span
                                            style={{
                                              color: "#eab308",
                                              fontWeight: 500,
                                            }}
                                          >
                                            Remaining balance:{" "}
                                            {parseFloat(
                                              booking.remaining_deposit
                                            ).toFixed(10)}{" "}
                                            ETH
                                          </span>
                                          {booking.isDamage_paid ? (
                                            <span
                                              style={{
                                                color: "#43a047",
                                                fontWeight: 500,
                                                marginLeft: 12,
                                              }}
                                            >
                                              Damage fee paid successfully!
                                            </span>
                                          ) : (
                                            <button
                                              className={styles.payButton}
                                              style={{
                                                background: "#2563eb",
                                                marginLeft: 12,
                                              }}
                                              onClick={() =>
                                                handleReleaseRemainingBalance(
                                                  booking.id
                                                )
                                              }
                                              disabled={
                                                !!pendingTx &&
                                                payingBookingId === booking.id
                                              }
                                            >
                                              {pendingTx &&
                                              payingBookingId === booking.id
                                                ? "Processing..."
                                                : "Release Remaining Deposit"}
                                            </button>
                                          )}
                                        </div>
                                      ) : booking.damage_fee &&
                                        !isNaN(
                                          parseFloat(booking.damage_fee)
                                        ) &&
                                        parseFloat(booking.damage_fee) > 0 ? (
                                        <div style={{ marginTop: 8 }}>
                                          <span
                                            style={{
                                              color: "#eab308",
                                              fontWeight: 500,
                                            }}
                                          >
                                            Damage Fee:{" "}
                                            {parseFloat(
                                              booking.damage_fee
                                            ).toFixed(10)}{" "}
                                            ETH
                                          </span>
                                          {booking.isDamage_paid ? (
                                            <span
                                              style={{
                                                color: "#43a047",
                                                fontWeight: 500,
                                                marginLeft: 12,
                                              }}
                                            >
                                              Damage fee paid successfully!
                                            </span>
                                          ) : (
                                            <button
                                              className={styles.payButton}
                                              style={{
                                                background: "#eab308",
                                                marginLeft: 12,
                                              }}
                                              onClick={() =>
                                                handlePayDamageFee(booking.id)
                                              }
                                              disabled={
                                                !!pendingTx &&
                                                payingBookingId === booking.id
                                              }
                                            >
                                              {pendingTx &&
                                              payingBookingId === booking.id
                                                ? "Processing..."
                                                : "Pay Damage Fee"}
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <span
                                          style={{
                                            color: "#64748b",
                                            fontWeight: 500,
                                          }}
                                        >
                                          Waiting for lessor to set damage
                                          fee...
                                        </span>
                                      )
                                    ) : booking.has_damage === false ? (
                                      <span
                                        style={{
                                          color: "#43a047",
                                          fontWeight: 500,
                                        }}
                                      >
                                        No damage fee required
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span style={{ color: "#43a047", fontWeight: 500 }}>
                              In use
                            </span>
                          );
                        })()
                      ) : (
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
                            onChange={(e) => handleFileChange(e, booking.id)}
                            disabled={uploadingId === booking.id}
                          />
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Modal for confirm return */}
      <ConfirmReturnModal
        open={!!modalBooking}
        imageUrl={modalBooking?.image_proof_url || ""}
        loading={modalLoading}
        hasDamage={
          modalBooking?.has_damage === undefined ||
          modalBooking?.has_damage === null
            ? null
            : modalBooking?.has_damage === true ||
              modalBooking?.has_damage === 1 ||
              modalBooking?.has_damage === "true"
            ? true
            : false
        }
        confirmationCount={modalBooking?.confirmationCount ?? 0}
        isAcknowledge={modalBooking?.is_acknowledge ?? false}
        onClose={() => setModalBooking(null)}
        onAction={handleModalAction}
        onAcknowledge={handleAcknowledge}
      />
    </Layout>
  );
}
