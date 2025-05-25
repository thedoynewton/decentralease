import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../../../supabase/supabase-client";
import Layout from "../../../../components/Layout";
import styles from "../../../styles/ListingDetails.module.css";
import stylesModal from "../../../styles/BookingModal.module.css";

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
  const { id } = router.query;
  const [listing, setListing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const PLATFORM_FEE = 0.05;

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

  const handleBooking = () => {
    console.log({
      listingId: id,
      pickupDate,
      returnDate,
      totalAmount,
    });
    setModalOpen(false);
    // Add your booking logic here
  };

  const today = new Date().toISOString().split("T")[0];

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
            onClick={() => setModalOpen(true)}
          >
            Book Now
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
              <div className={stylesModal.buttonGroup}>
                <button
                  className={stylesModal.confirmButton}
                  onClick={handleBooking}
                  disabled={!pickupDate || !returnDate}
                >
                  Confirm Booking
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
      </div>
    </Layout>
  );
}
