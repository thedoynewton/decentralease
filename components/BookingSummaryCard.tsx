import styles from "../src/styles/BookingSummary.module.css";
import React from "react";

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

export default function BookingSummaryCard({ booking }: { booking: Booking }) {
  return (
    <div className={styles.bookingSummaryCard}>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Listing:</span>
        <span className={styles.summaryValue}>{booking.listing_title}</span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Total Amount:</span>
        <span className={styles.summaryValue}>
          {booking.total_amount !== undefined && booking.total_amount !== null
            ? `${booking.total_amount.toLocaleString()} ETH`
            : "-"}
        </span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Pickup Date:</span>
        <span className={styles.summaryValue}>
          {booking.pickup_date
            ? new Date(booking.pickup_date).toLocaleDateString()
            : "-"}
        </span>
      </div>
      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Return Date:</span>
        <span className={styles.summaryValue}>
          {booking.return_date
            ? new Date(booking.return_date).toLocaleDateString()
            : "-"}
        </span>
      </div>
    </div>
  );
}