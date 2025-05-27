import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect, useRef } from "react";
import styles from "../../styles/LesseeHome.module.css";
import Layout from "../../../components/LesseeLayout";
import Link from "next/link";

import { Search, Bell } from "@deemlol/next-icons";

// Helper to format time ago
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

const PAGE_SIZE = 6;

export default function Home() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    const fetchUserId = async () => {
      if (!address) return;
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();

      if (error) {
        console.error("Error fetching user ID:", error);
        return;
      }

      setUserId(data.id);
      setPage(1); // Reset pagination when user changes
      setListings([]);
    };

    fetchUserId();
  }, [address]);

  // Fetch listings with pagination
  const fetchListings = async (pageNum: number) => {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("listings")
      .select("id,created_at,title,rental_fee,image_url")
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setListings((prev) => (pageNum === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    if (page === 1) {
      setListings([]);
    }
    fetchListings(page);
    // eslint-disable-next-line
  }, [userId, page]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [hasMore, loading]);

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.topBar}>
          <h1 className={styles.title}>Rental Listings</h1>
          <div className={styles.iconGroup}>
            <Search size={24} className={styles.icon} />
            <Bell size={24} className={styles.icon} />
          </div>
        </div>

        <div className={styles.listingsGrid}>
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/Lessee/Listing/${listing.id}`}
              className={styles.listingCard}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <img
                src={listing.image_url}
                alt={listing.title}
                className={styles.listingImage}
              />
              <div className={styles.listingInfo}>
                <div className={styles.listingTime}>
                  {timeAgo(listing.created_at)}
                </div>
                <div className={styles.listingTitle}>{listing.title}</div>
                <div className={styles.listingFee}>
                  Rental Fee: <b>{listing.rental_fee} ETH</b>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {loading && <div className={styles.status}>Loading...</div>}
        {!hasMore && listings.length > 0 && (
          <div className={styles.status}>No more listings.</div>
        )}
        <div ref={loaderRef} style={{ height: 1 }} />
        {listings.length === 0 && !loading && (
          <div className={styles.noListings}>No listings found.</div>
        )}
      </div>
    </Layout>
  );
}
