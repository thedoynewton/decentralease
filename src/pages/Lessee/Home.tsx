import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect, useRef } from "react";
import styles from "../../styles/LesseeHome.module.css";
import Layout from "../../../components/Layout";

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
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const loaderRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch listings with pagination
  const fetchListings = async (pageNum: number) => {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("listings")
      .select("id,created_at,title,rental_fee,image_url")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && data) {
      setListings(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListings(page);
    // eslint-disable-next-line
  }, [page]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [hasMore, loading]);

  const handleDisconnect = async () => {
    if (address) {
      await supabase
        .from("users_duplicate")
        .update({ is_signed_in: false })
        .eq("wallet_address", address);
    }
    disconnect();
    setStatus("Disconnected. Redirecting...");
    setTimeout(() => router.push("/"), 800);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Rental Listings</h1>       

        <h2 className={styles.sectionTitle}>Latest Listings</h2>
        <div className={styles.listingsGrid}>
          {listings.map(listing => (
            <div key={listing.id} className={styles.listingCard}>
              <img
                src={listing.image_url}
                alt={listing.title}
                className={styles.listingImage}
              />
              <div className={styles.listingInfo}>
                <div className={styles.listingTime}>{timeAgo(listing.created_at)}</div>
                <div className={styles.listingTitle}>{listing.title}</div>
                <div className={styles.listingFee}>Rental Fee: <b>{listing.rental_fee} ETH</b></div>
              </div>
            </div>
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