import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import styles from "../../../styles/ListingDetails.module.css";
import stylesModal from "../../../styles/BookingModal.module.css";
import { supabase } from "../../../../supabase/supabase-client";
import Layout from "../../../../components/LesseeLayout";

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default function ListingDetail() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const [listing, setListing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [agreeToConditions, setAgreeToConditions] = useState(false);
  const [conditionsModalOpen, setConditionsModalOpen] = useState(false);
  const PLATFORM_FEE = 0.05;

  useEffect(() => {
    if (!address) return;
    const fetchUser = async () => {
      const { data } = await supabase
        .from("users")
        .select("id,name,phone,location")
        .eq("wallet_address", address)
        .single();
      setUser(data);
    };
    fetchUser();
  }, [address]);

  useEffect(() => {
    if (!id) return;
    const fetchListing = async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setListing(data);
    };
    fetchListing();
  }, [id]);

  useEffect(() => {
    if (pickupDate && returnDate) {
      const return_date = new Date(returnDate);
      const pickup_date = new Date(pickupDate);
      const diffTime = Math.abs(return_date.getTime() - pickup_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const rentalTotal = Number(listing?.rental_fee) * diffDays;
      const total =
        rentalTotal + Number(listing?.security_deposit) + PLATFORM_FEE;
      setTotalAmount(total);
    }
  }, [pickupDate, returnDate, listing]);

  // Function to insert booking
  const handleBooking = async () => {
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const rentalFee = (Number(listing.rental_fee) * days).toString();
  const securityDeposit = (Number(listing.security_deposit) || 0).toString();
  const totalAmount = (
    Number(rentalFee) +
    Number(securityDeposit) +
    PLATFORM_FEE
  ).toString();

  // Check for duplicate booking
  const { data: existing, error: checkError } = await supabase
    .from("bookings")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("lessee_id", user?.id)
    .eq("pickup_date", pickupDate)
    .eq("return_date", returnDate);

  if (checkError) {
    alert("Error checking for existing bookings.");
    return checkError;
  }
  if (existing && existing.length > 0) {
    alert("You have already booked this listing for these dates.");
    return { message: "Duplicate booking" };
  }

  // Insert booking and get the new booking id
  const { data: bookingData, error } = await supabase.from("bookings").insert([
    {
      listing_id: listing.id,
      lessee_name: user?.name || "",
      lessee_phone: user?.phone || "",
      lessee_location: user?.location || "",
      pickup_date: pickupDate,
      return_date: returnDate,
      rental_fee: rentalFee,
      security_deposit: securityDeposit,
      platform_fee: PLATFORM_FEE.toString(),
      total_amount: totalAmount,
      listing_title: listing.title,
      category: String(listing.category_id),
      subcategory: String(listing.subcategory_id),
      lessee_id: user?.id,
    },
  ]).select().single();

  if (error || !bookingData) {
    alert("Failed to create booking.");
    return error || { message: "No booking data returned" };
  }

  // Insert notification for the lessor with booking_id as related_id
  const { error: notifError } = await supabase.from("notifications").insert([
    {
      user_id: listing.user_id,
      type: "booking_request",
      message: `You have a new booking request for "${listing.title}"`,
      booking_id: bookingData.id,
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ]);

  if (notifError) {
    console.error("Notification insert error:", notifError);
  }

  return null;
};

  if (!listing) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.status}>Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div
          className={styles.listingCard}
          style={{ maxWidth: 500, margin: "0 auto" }}
        >
          <img
            src={listing.image_url}
            alt={listing.title}
            className={styles.listingImage}
            style={{ maxHeight: 250, objectFit: "cover" }}
          />
          <div className={styles.listingInfo}>
            <div className={styles.listingTime}>
              {timeAgo(listing.created_at)}
            </div>
            <div className={styles.listingTitle}>{listing.title}</div>
            <div className={styles.listingFee}>
              Rental Fee: <b>{listing.rental_fee} ETH</b>
            </div>
            <div className={styles.listingFee}>
              Security Deposit: <b>{listing.security_deposit} ETH</b>
            </div>
            <div className={styles.listingFee}>
              Late Return Fee: <b>{listing.late_return_fee} ETH</b>
            </div>
            <div className={styles.listingDescription}>
              <b>Description:</b> {listing.description}
            </div>
            <div className={styles.listingConditions}>
              <b>Conditions:</b> {listing.conditions}
            </div>
          </div>
          <button
            className={styles.bookNowButton}
            onClick={() => {
              if (!isConnected) {
                alert("Please connect your wallet first");
                return;
              }
              setModalOpen(true);
            }}
          >
            {isConnected ? "Book Now" : "Connect Wallet to Book"}
          </button>
        </div>
        {modalOpen && (
          <div className={stylesModal.modalOverlay}>
            <div className={stylesModal.modalContent}>
              <h2>Book Item</h2>
              <div className={stylesModal.formGroup}>
                <label>
                  Pickup Date:
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className={styles.modalInput}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </label>
              </div>
              <div className={stylesModal.formGroup}>
                <label>
                  Return Date:
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className={styles.modalInput}
                    min={pickupDate || new Date().toISOString().split("T")[0]}
                    disabled={!pickupDate}
                  />
                </label>
              </div>
              {totalAmount > 0 && (
                <div className={stylesModal.costBreakdown}>
                  <h3>Cost Summary</h3>
                  <p>Rental Fee ({listing.rental_fee} ETH/day)</p>
                  <p>Security Deposit: {listing.security_deposit} ETH</p>
                  <p>Platform Fee: {PLATFORM_FEE} ETH</p>
                  <p className={stylesModal.total}>
                    Total Amount: {totalAmount.toFixed(3)} ETH
                  </p>
                </div>
              )}

              <div className={stylesModal.conditionsGroup}>
                <label className={stylesModal.checkbox}>
                  <input
                    type="checkbox"
                    checked={agreeToConditions}
                    onChange={(e) => setAgreeToConditions(e.target.checked)}
                  />
                  I agree to the{" "}
                  <a
                    href="#"
                    style={{ color: "#3182ce", textDecoration: "underline" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setConditionsModalOpen(true);
                    }}
                  >
                    rental conditions
                  </a>
                </label>
              </div>

              <div className={stylesModal.buttonGroup}>
                <button
                  className={stylesModal.confirmButton}
                  onClick={() => setShowConfirmation(true)}
                  disabled={
                    !pickupDate ||
                    !returnDate ||
                    !agreeToConditions ||
                    !isConnected
                  }
                >
                  {isConnected ? "Confirm Booking" : "Connect Wallet"}
                </button>
                <button
                  className={stylesModal.cancelButton}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {conditionsModalOpen && (
          <div className={stylesModal.modalOverlay}>
            <div
              className={`${stylesModal.modalContent} ${stylesModal.conditionsModal}`}
            >
              <h2>Rental Conditions</h2>
              <div className={stylesModal.conditionsContent}>
                {listing.conditions}
              </div>
              <div className={stylesModal.buttonGroup}>
                <button
                  className={stylesModal.confirmButton}
                  onClick={() => setConditionsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmation && (
          <div className={stylesModal.modalOverlay}>
            <div className={stylesModal.modalContent}>
              <h2>Confirm Booking</h2>
              <p style={{ margin: "1rem 0" }}>
                Are you sure you want to book <b>{listing.title}</b> from{" "}
                <b>{pickupDate}</b> to <b>{returnDate}</b> for a total of{" "}
                <b>{totalAmount.toFixed(3)} ETH</b>?
              </p>
              <div className={stylesModal.buttonGroup}>
                <button
                  className={stylesModal.confirmButton}
                  onClick={async () => {
                    setShowConfirmation(false);
                    alert("Booking confirmed!");
                    const error = await handleBooking();
                    if (!error) setModalOpen(false);
                  }}
                >
                  Yes, Book Asset
                </button>
                <button
                  className={stylesModal.cancelButton}
                  onClick={() => setShowConfirmation(false)}
                >
                  No, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
