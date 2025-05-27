import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect, useRef } from "react";
import styles from "../../styles/LesseeHome.module.css";
import Layout from "../../../components/LesseeLayout";
import Link from "next/link";
import { Search, Bell, Filter } from "@deemlol/next-icons";

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

  // For search/filter
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

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

  // Fetch categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("id, name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  // Fetch listings with pagination and filter/search
  const fetchListings = async (pageNum: number) => {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("listings")
      .select(
        "id,created_at,title,rental_fee,image_url"
      )
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }
    if (search) {
      const { data, error } = await query;
      let filtered = data || [];
      if (search) {
        filtered = filtered.filter(
          (listing: any) =>
            listing.title.toLowerCase().includes(search.toLowerCase()) ||
            (listing.description &&
              listing.description.toLowerCase().includes(search.toLowerCase()))
        );
      }
      setListings((prev) =>
        pageNum === 1 ? filtered : [...prev, ...filtered]
      );
      setHasMore(filtered.length === PAGE_SIZE);
      setLoading(false);
      return;
    }

    const { data, error } = await query;
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
  }, [userId, page, selectedCategory, search]);

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

  const handleNotificationClick = () => {
    alert("Notifications are not implemented yet.");
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Find Your Next Rental</h1>
          <button
            className={styles.notificationButton}
            onClick={handleNotificationClick}
          >
            <Bell size={24} />
          </button>
        </div>

        <div className={styles.searchFilterRow}>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={styles.searchBar}
          />
          <div className={styles.filterWrapper}>
            <button
              className={styles.filterButton}
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              <Filter size={22} color="#1976d2" />
            </button>
            {showCategoryDropdown && (
              <div className={styles.categoryDropdown}>
                <div
                  className={`${styles.categoryItem} ${
                    !selectedCategory ? styles.selected : ""
                  }`}
                  onClick={() => {
                    setSelectedCategory("");
                    setShowCategoryDropdown(false);
                    setPage(1);
                  }}
                >
                  All Categories
                </div>
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`${styles.categoryItem} ${
                      selectedCategory === category.id.toString()
                        ? styles.selected
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedCategory(category.id.toString());
                      setShowCategoryDropdown(false);
                      setPage(1);
                    }}
                  >
                    {category.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.postsGrid}>
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/Lessee/Listing/${listing.id}`}
              className={styles.postCard}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={listing.image_url}
                  alt={listing.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div className={styles.postInfo}>
                <h3>{listing.title}</h3>
                <div className={styles.location}>{listing.location}</div>
                <div className={styles.dates}>
                  <span>
                    {listing.pickup_date
                      ? `Pickup: ${new Date(
                          listing.pickup_date
                        ).toLocaleDateString()}`
                      : ""}
                  </span>
                  <span>
                    {listing.return_date
                      ? `Return: ${new Date(
                          listing.return_date
                        ).toLocaleDateString()}`
                      : ""}
                  </span>
                </div>
                <div className={styles.listingTime}>
                  {timeAgo(listing.created_at)}
                </div>
                <div className={styles.listingFee}>
                  Rental Fee: <b>{listing.rental_fee} ETH</b>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {loading && <div className={styles.loading}>Loading...</div>}
        {!hasMore && listings.length > 0 && (
          <div className={styles.loading}>No more listings.</div>
        )}
        <div ref={loaderRef} style={{ height: 1 }} />
        {listings.length === 0 && !loading && (
          <div className={styles.noPosts}>No listings found.</div>
        )}
      </div>
    </Layout>
  );
}
