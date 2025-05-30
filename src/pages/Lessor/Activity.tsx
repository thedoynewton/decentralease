// Activity.tsx
import { useCallback, useEffect, useState } from "react";
import styles from "../../styles/LesseeActivity.module.css";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import Layout from "../../../components/LessorLayout";
import AcknowledgeModal from "../../../components/AcknowledgeModal";
import ReleasePaymentButton from "../../../components/ReleasePaymentButton";
import InputDamageFee from "../../../components/InputDamageFee";
import DecentralEaseABI from "../../contract/DecentralEaseABI.json";
// import CollectFundButton from "../../../components/CollectFundButton";
// import CollectAllFundsButton from "../../../components/CollectAllFundsButton";

const STATUS_TABS = ["approved", "paid", "completed"];
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_DECENTRALEASE_CONTRACT_ADDRESS as `0x${string}`;

function trimTo10Decimals(value: string): string {
  if (!value.includes(".")) return value;
  const [whole, decimals] = value.split(".");
  return `${whole}.${decimals.slice(0, 10)}`;
}

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("approved");

  const [ackModalBooking, setAckModalBooking] = useState<any | null>(null);
  const [ackLoading, setAckLoading] = useState(false);

  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [releasingBookingId, setReleasingBookingId] = useState<string | null>(
    null
  );
  const [txError, setTxError] = useState<string | null>(null);

  const { writeContract } = useWriteContract();
  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: (pendingTx as `0x${string}`) ?? undefined,
  });

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
        security_deposit,
        status,
        image_proof_url,
        return_date,
        lessee_confirmed,
        lessor_confirmed,
        has_damage,
        is_acknowledge,
        isDamage_paid,
        input_damageFee,
        remaining_deposit,
        blockchain_booking_id,
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

  const handleAcknowledge = async () => {
    if (!ackModalBooking) return;
    setAckLoading(true);

    // Update lessor_confirmed and is_acknowledge
    const { error } = await supabase
      .from("bookings")
      .update({ lessor_confirmed: true, is_acknowledge: true })
      .eq("id", ackModalBooking.id);

    setAckLoading(false);
    setAckModalBooking(null);

    if (error) {
      alert("Failed to acknowledge: " + error.message);
    } else {
      alert("Acknowledged successfully.");
      fetchUserBookings();
    }
  };

  useEffect(() => {
    if (txReceipt && releasingBookingId) {
      supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", releasingBookingId)
        .then(() => fetchUserBookings());
      setPendingTx(null);
      setReleasingBookingId(null);
    }
  }, [txReceipt, releasingBookingId, fetchUserBookings]);

  const handleReleasePayment = async (bookingId: string) => {
    setTxError(null);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      setTxError("Booking not found.");
      return;
    }
    const blockchainBookingId = booking.blockchain_booking_id;
    if (
      blockchainBookingId === undefined ||
      blockchainBookingId === null ||
      !/^\d+$/.test(blockchainBookingId)
    ) {
      setTxError("Blockchain booking ID not found or invalid.");
      return;
    }
    try {
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: DecentralEaseABI,
          functionName: "releasePayment",
          args: [BigInt(blockchainBookingId)],
        },
        {
          onSuccess: (tx) => {
            setPendingTx(tx);
            setReleasingBookingId(bookingId);
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

  const handleSubmitDamageFee = async (
    bookingId: string,
    fee: string,
    securityDeposit: number
  ) => {
    // Always trim the string fee first!
    const trimmedFee = trimTo10Decimals(fee);
    const feeNum = parseFloat(trimmedFee);
    const payableFee = feeNum - securityDeposit;
    let message = "";
    let updateFields: any = {
      input_damageFee: trimmedFee,
    };

    if (payableFee > 0) {
      message = "Damage fee is greater than the security deposit.";
      updateFields.damage_fee = trimTo10Decimals(
        Math.abs(payableFee).toString()
      );
      updateFields.remaining_deposit = null;
    } else if (payableFee < 0) {
      message = "Damage fee is less than the security deposit.";
      updateFields.damage_fee = null;
      updateFields.remaining_deposit = trimTo10Decimals(
        Math.abs(payableFee).toString()
      );
    } else {
      message = "Damage fee is equal to the security deposit.";
      updateFields.damage_fee = null;
      updateFields.remaining_deposit = null;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateFields)
      .eq("id", bookingId);

    if (error) {
      alert("Failed to submit damage fee: " + error.message);
    } else {
      alert(
        `${message} (Submitted: ${
          updateFields.damage_fee ||
          updateFields.remaining_deposit ||
          trimmedFee
        })`
      );
      fetchUserBookings();
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

                  {activeTab === "paid" &&
                    booking.image_proof_url &&
                    (() => {
                      const today = new Date();
                      const returnDate = booking.return_date
                        ? new Date(booking.return_date)
                        : null;
                      const lesseeConfirmed = booking.lessee_confirmed;
                      const lessorConfirmed = booking.lessor_confirmed;
                      const hasDamage = booking.has_damage;
                      const isAcknowledge = booking.is_acknowledge;
                      const totalConfirmed =
                        (lesseeConfirmed ? 1 : 0) + (lessorConfirmed ? 1 : 0);

                      if (returnDate && today >= returnDate) {
                        return (
                          <div>
                            <div style={{ marginBottom: 8, fontWeight: 500 }}>
                              Confirmation: {totalConfirmed}/2
                            </div>
                            {/* Only show ReleasePaymentButton if all conditions are met */}
                            {lesseeConfirmed &&
                              lessorConfirmed &&
                              hasDamage === false &&
                              isAcknowledge && (
                                <ReleasePaymentButton
                                  onClick={() =>
                                    handleReleasePayment(booking.id)
                                  }
                                />
                              )}

                            {lesseeConfirmed &&
                              lessorConfirmed &&
                              hasDamage === true &&
                              isAcknowledge && (
                                <>
                                  {/* Add InputDamageFee here if damage fee is not yet paid */}
                                  {!booking.isDamage_paid && (
                                    <InputDamageFee
                                      onSubmit={(fee) =>
                                        handleSubmitDamageFee(
                                          booking.id,
                                          fee,
                                          booking.security_deposit
                                        )
                                      }
                                      disabled={!!booking.isDamage_paid}
                                      securityDeposit={booking.security_deposit}
                                    />
                                  )}
                                  {/* {booking.isDamage_paid &&
                                    booking.input_damageFee &&
                                    booking.security_deposit !== undefined &&
                                    !isNaN(
                                      parseFloat(booking.input_damageFee)
                                    ) &&
                                    !isNaN(
                                      parseFloat(booking.security_deposit)
                                    ) &&
                                    (() => {
                                      const inputFee = parseFloat(
                                        booking.input_damageFee
                                      );
                                      const deposit = parseFloat(
                                        booking.security_deposit
                                      );

                                      if (deposit < inputFee) {
                                        return (
                                          <div style={{ marginTop: 16 }}>
                                            <CollectAllFundsButton
                                              onClick={() =>
                                                handleCollectAllFunds(
                                                  booking.id
                                                )
                                              }
                                            />
                                          </div>
                                        );
                                      }
                                      if (deposit > inputFee) {
                                        return (
                                          <div style={{ marginTop: 16 }}>
                                            <CollectFundButton
                                              onClick={() =>
                                                handleCollectFund(booking.id)
                                              }
                                            />
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()} */}
                                </>
                              )}

                            {/* Show Acknowledge button if has_damage is set and not acknowledged */}
                            {booking.has_damage !== null &&
                            !booking.is_acknowledge ? (
                              <button
                                className={styles.payButton}
                                style={{ background: "#2563eb" }}
                                onClick={() => setAckModalBooking(booking)}
                                disabled={ackLoading}
                              >
                                Acknowledge
                              </button>
                            ) : (
                              // Show waiting span if lessor has confirmed but not both parties yet
                              !lesseeConfirmed &&
                              totalConfirmed < 2 && (
                                <span
                                  style={{ color: "#43a047", fontWeight: 500 }}
                                >
                                  Waiting for lessee confirmation...
                                </span>
                              )
                            )}
                            {lesseeConfirmed &&
                              lessorConfirmed &&
                              hasDamage === false &&
                              isAcknowledge && (
                                <span
                                  style={{ color: "#43a047", fontWeight: 500 }}
                                >
                                  Both parties confirmed. You can now release
                                  payment.
                                </span>
                              )}
                          </div>
                        );
                      }
                      return (
                        <span style={{ color: "#43a047", fontWeight: 500 }}>
                          In use
                        </span>
                      );
                    })()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <AcknowledgeModal
        open={!!ackModalBooking}
        hasDamage={ackModalBooking?.has_damage ?? null}
        loading={ackLoading}
        onConfirm={handleAcknowledge}
        onCancel={() => setAckModalBooking(null)}
      />
    </Layout>
  );
}
