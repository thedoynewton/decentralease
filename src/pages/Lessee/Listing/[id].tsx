import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../../../supabase/supabase-client";
import Layout from "../../../../components/Layout";
import styles from "../../../styles/LesseeHome.module.css";

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
        <div className={styles.listingCard} style={{ maxWidth: 500, margin: "0 auto" }}>
          <img
            src={listing.image_url}
            alt={listing.title}
            className={styles.listingImage}
            style={{ maxHeight: 250, objectFit: "cover" }}
          />
          <div className={styles.listingInfo}>
            <div className={styles.listingTime}>{timeAgo(listing.created_at)}</div>
            <div className={styles.listingTitle}>{listing.title}</div>
            <div className={styles.listingFee}>Rental Fee: <b>{listing.rental_fee} ETH</b></div>
            <div className={styles.listingFee}>Security Deposit: <b>{listing.security_deposit} ETH</b></div>
            <div className={styles.listingFee}>Late Return Fee: <b>{listing.late_return_fee} ETH</b></div>
            <div className={styles.listingDescription}><b>Description:</b> {listing.description}</div>
            <div className={styles.listingConditions}><b>Conditions:</b> {listing.conditions}</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}