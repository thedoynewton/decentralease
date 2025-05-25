import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../../../supabase/supabase-client";
import Layout from "../../../../components/Layout";
import styles from "../../../styles/LesseeHome.module.css";
import { useAccount } from "wagmi";

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
  const { address } = useAccount();
  const router = useRouter();
  const { id } = router.query;
  const [listing, setListing] = useState<any>(null);
  const [carouselPage, setCarouselPage] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [agree, setAgree] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showConditionsModal, setShowConditionsModal] = useState(false);

  useEffect(() => {
    if (!address) return;
    const fetchUser = async () => {
      const { data } = await supabase
        .from("users_duplicate")
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

  // Function to insert booking
  const handleBooking = async () => {
    const platformFee = 0.05;
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const rentalFee = (Number(listing.rental_fee) * days).toString();
    const securityDeposit = (Number(listing.security_deposit) || 0).toString();
    const totalAmount = (Number(rentalFee) + Number(securityDeposit) + platformFee).toString();

    // Check for duplicate booking
  const { data: existing, error: checkError } = await supabase
    .from("bookings_duplicate")
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
  
    const { error } = await supabase.from("bookings_duplicate").insert([
      {
        listing_id: listing.id,
        lessee_name: user?.name || "",
        lessee_phone: user?.phone || "",
        lessee_location: user?.location || "",
        pickup_date: pickupDate,
        return_date: returnDate,
        rental_fee: rentalFee,
        security_deposit: securityDeposit,
        platform_fee: platformFee.toString(),
        total_amount: totalAmount,
        listing_title: listing.title,
        category: String(listing.category_id),
        subcategory: String(listing.subcategory_id),
        lessee_id: user?.id,
      },
    ]);
    return error;
  };

  useEffect(() => {
    if (pickupDate && returnDate && listing) {
      const start = new Date(pickupDate);
      const end = new Date(returnDate);
      const days = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
      const rentalFee = Number(listing.rental_fee) * days;
      const securityDeposit = Number(listing.security_deposit) || 0;
      const platformFee = 0.05;
      setTotal(rentalFee + securityDeposit + platformFee);
    } else {
      setTotal(null);
    }
  }, [pickupDate, returnDate, listing]);

  if (!listing) {
    return (
      <Layout>
        <div className={styles.container}>
          <div className={styles.status}>Loading...</div>
        </div>
      </Layout>
    );
  }

  const conditionsArray = Array.isArray(listing.conditions)
    ? listing.conditions
    : (listing.conditions || "")
        .split(/\r?\n|•|- /)
        .map((c: string) => c.trim())
        .filter(Boolean);

  // Carousel content
  const carouselPages = [
    <div>
      <div className={styles.listingDescription}>
        <b>Description:</b>
        <div style={{ marginTop: 6 }}>{listing.description}</div>
      </div>
    </div>,
    <div>
      <div className={styles.listingFee}>
        <b>Rental Fee:</b> {listing.rental_fee} ETH / day
      </div>
      <div className={styles.listingFee}>
        <b>Security Deposit:</b> {listing.security_deposit} ETH
      </div>
      <div className={styles.listingFee}>
        <b>Late Return Fee:</b> {listing.late_return_fee} ETH
      </div>
    </div>,
    <div>
      <div className={styles.listingConditions}>
        <b>Conditions:</b>
        <ul style={{ marginTop: 6, paddingLeft: 18 }}>
          {conditionsArray.length > 0 ? (
            conditionsArray.map((condition: string, idx: number) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {condition}
              </li>
            ))
          ) : (
            <li style={{ color: "#888" }}>No conditions listed.</li>
          )}
        </ul>
      </div>
    </div>,
  ];

  return (
    <Layout>
      <div className={styles.detailHeader}>
        <button
          className={styles.backButton}
          onClick={() => router.back()}
          aria-label="Back"
        >
          ←
        </button>
        <div className={styles.headerImageWrap}>
          <img
            src={listing.image_url}
            alt={listing.title}
            className={styles.headerImage}
          />
        </div>
      </div>
      <div className={styles.detailContent}>
        <div className={styles.detailTitleRow}>
          <div>
            <div className={styles.listingTitle}>{listing.title}</div>
            <div className={styles.listingFee}>
              {listing.rental_fee} ETH / day
            </div>
          </div>
          <div className={styles.listingTime}>
            {timeAgo(listing.created_at)}
          </div>
        </div>
        <div className={styles.carousel}>
          <div className={styles.carouselInner}>
            {carouselPages[carouselPage]}
          </div>
          <div className={styles.carouselDots}>
            {[0, 1, 2].map((idx) => (
              <span
                key={idx}
                className={carouselPage === idx ? styles.dotActive : styles.dot}
                onClick={() => setCarouselPage(idx)}
              />
            ))}
          </div>
          <div className={styles.carouselNav}>
            <button
              className={styles.carouselBtn}
              onClick={() => setCarouselPage((p) => Math.max(0, p - 1))}
              disabled={carouselPage === 0}
              aria-label="Previous"
            >
              ‹
            </button>
            <button
              className={styles.carouselBtn}
              onClick={() => setCarouselPage((p) => Math.min(2, p + 1))}
              disabled={carouselPage === 2}
              aria-label="Next"
            >
              ›
            </button>
          </div>
        </div>
        <button
          className={styles.actionButton}
          style={{
            margin: "24px auto 0 auto",
            display: "block",
            minWidth: 160,
          }}
          onClick={() => setShowModal(true)}
        >
          Book now
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Book Rental</h3>
            <label className={styles.modalLabel}>
              Pickup Date:
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className={styles.modalInput}
                min={new Date().toISOString().split("T")[0]}
              />
            </label>
            <label className={styles.modalLabel}>
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
            {total !== null && (
              <div className={styles.modalTotal}>
                Total: <b>{total} ETH</b>
                <div style={{ fontSize: "0.95em", color: "#888" }}>
                  (Rental Fee + Security Deposit + 0.05 ETH Platform Fee)
                </div>
              </div>
            )}
            <label className={styles.modalCheckboxLabel}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the {" "}
              <a
                href="#"
                style={{ color: "#3182ce", textDecoration: "underline" }}
                onClick={e => {
                  e.preventDefault();
                  setShowConditionsModal(true);
                }}
              >
                rental conditions
              </a>
            </label>
            <div className={styles.modalActions}>
              <button
                className={styles.actionButton}
                disabled={!pickupDate || !returnDate}
                onClick={async () => {
                  if (!agree) {
                    alert("Agree to the rental conditions first");
                    return;
                  }
                  const confirmBooking = window.confirm(
                    "Do you really want to book this asset?"
                  );
                  if (!confirmBooking) return;
                  const error = await handleBooking();
                  if (error) {
                    alert("Booking failed: " + error.message);
                  } else {
                    setShowModal(false);
                    setPickupDate("");
                    setReturnDate("");
                    setAgree(false);
                    setTotal(null);
                    alert("Booking confirmed!");
                  }
                }}
              >
                Confirm
              </button>
              <button
                className={styles.actionButtonGreen}
                style={{ background: "#e53e3e", marginLeft: 12 }}
                onClick={() => {
                  setShowModal(false);
                  setPickupDate("");
                  setReturnDate("");
                  setAgree(false);
                  setTotal(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rental Conditions Modal */}
      {showConditionsModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Rental Conditions</h3>
            <ul style={{ marginTop: 12, paddingLeft: 18 }}>
              {conditionsArray.length > 0 ? (
                conditionsArray.map((condition: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    {condition}
                  </li>
                ))
              ) : (
                <li style={{ color: "#888" }}>No conditions listed.</li>
              )}
            </ul>
            <div className={styles.modalActions}>
              <button
                className={styles.actionButton}
                onClick={() => setShowConditionsModal(false)}
                style={{ minWidth: 100, marginTop: 16 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
