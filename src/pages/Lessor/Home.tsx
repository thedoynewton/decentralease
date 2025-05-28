import { useEffect, useState, useRef } from "react";
import { useAccount } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import styles from "../../styles/LessorHome.module.css";
import { Filter, Bell } from "@deemlol/next-icons";
import { useRouter } from "next/router";
import SendOffer from "../../../components/SendOffer";
import Layout from "../../../components/LessorLayout";

interface Post {
  id: string;
  title: string;
  description: string;
  image_url: string;
  location: string;
  pickup_date: string;
  return_date: string;
  category_id: number;
  subcategory_id: number;
  user_id: string;
  created_at?: string;
}

interface Category {
  id: number;
  name: string;
}

interface Notification {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

const PAGE_SIZE = 6;

export default function LessorHome() {
  const { address } = useAccount();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSendOffer, setShowSendOffer] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  // User id state
  const [userId, setUserId] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch notifications for dropdown and badge
  useEffect(() => {
    if (!userId) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,message,created_at,is_read")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.is_read).length);
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleNotificationClick = async () => {
    setShowDropdown((prev) => !prev);
    // Optionally, mark all as read when opening dropdown:
    if (!showDropdown && userId) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setUnreadCount(0);
      // Optionally, refresh notifications after marking as read
      const { data } = await supabase
        .from("notifications")
        .select("id,message,created_at,is_read")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setNotifications(data || []);
    }
  };

  const handleDropdownRoute = () => {
    setShowDropdown(false);
    router.push("/Lessor/Inbox");
  };

  // Fetch user id for the connected wallet
  useEffect(() => {
    const fetchUserId = async () => {
      if (!address) {
        setUserId(null);
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();
      setUserId(data?.id ?? null);
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

  // Fetch posts with pagination and filter/search, EXCLUDE user's own posts
  const fetchPosts = async (pageNum: number) => {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("posts")
      .select(
        "id,title,description,image_url,location,pickup_date,return_date,category_id,subcategory_id,user_id,created_at"
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    // Exclude connected user's own posts
    if (userId) {
      query = query.neq("user_id", userId);
    }

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }
    if (search) {
      const { data, error } = await query;
      let filtered = data || [];
      if (search) {
        filtered = filtered.filter(
          (post: any) =>
            post.title.toLowerCase().includes(search.toLowerCase()) ||
            (post.description &&
              post.description.toLowerCase().includes(search.toLowerCase()))
        );
      }
      setPosts((prev) => (pageNum === 1 ? filtered : [...prev, ...filtered]));
      setHasMore(filtered.length === PAGE_SIZE);
      setLoading(false);
      return;
    }

    const { data, error } = await query;
    if (!error && data) {
      setPosts((prev) => (pageNum === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
    setPosts([]);
  }, [selectedCategory, search, userId]);

  useEffect(() => {
    fetchPosts(page);
    // eslint-disable-next-line
  }, [page, selectedCategory, search, userId]);

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

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowSendOffer(true);
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Share & Earn</h1>
          <div style={{ position: "relative" }}>
            <button
              className={styles.notificationButton}
              onClick={handleNotificationClick}
              style={{ position: "relative" }}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className={styles.notificationBadge}>{unreadCount}</span>
              )}
            </button>
            {showDropdown && (
              <div className={styles.notificationDropdown}>
                <div className={styles.notificationDropdownHeader}>
                  Notifications
                </div>
                {notifications.length === 0 && (
                  <div className={styles.notificationDropdownEmpty}>
                    No notifications
                  </div>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={styles.notificationDropdownItem}
                    onClick={handleDropdownRoute}
                  >
                    <div className={styles.notificationDropdownMsg}>
                      {n.message}
                    </div>
                    <div className={styles.notificationDropdownTime}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
                <div
                  className={styles.notificationDropdownFooter}
                  onClick={handleDropdownRoute}
                >
                  View all in Inbox
                </div>
              </div>
            )}
          </div>
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
          {posts.map((post) => (
            <div
              key={post.id}
              className={styles.postCard}
              onClick={() => handlePostClick(post)}
            >
              <div className={styles.imageWrapper}>
                <img src={post.image_url} alt={post.title} />
              </div>
              <div className={styles.postInfo}>
                <h3>{post.title}</h3>
                <p className={styles.location}>{post.location}</p>
                <div className={styles.dates}>
                  <span>
                    Pickup:{" "}
                    {post.pickup_date
                      ? new Date(post.pickup_date).toLocaleDateString()
                      : ""}
                  </span>
                  <span>
                    Return:{" "}
                    {post.return_date
                      ? new Date(post.return_date).toLocaleDateString()
                      : ""}
                  </span>
                </div>
                <button
                  className={styles.sendOfferButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPost(post);
                    setShowSendOffer(true);
                  }}
                >
                  Send Offer
                </button>
              </div>
            </div>
          ))}
        </div>
        {loading && <div className={styles.loading}>Loading...</div>}
        {!hasMore && posts.length > 0 && (
          <div className={styles.loading}>No more posts.</div>
        )}
        <div ref={loaderRef} style={{ height: 1 }} />
        {posts.length === 0 && !loading && (
          <div className={styles.noPosts}>No posts found.</div>
        )}

        <SendOffer
          isOpen={showSendOffer}
          onClose={() => {
            setShowSendOffer(false);
            setSelectedPost(null);
          }}
          postInfo={
            selectedPost
              ? {
                  id: selectedPost.id,
                  title: selectedPost.title,
                  description: selectedPost.description,
                  user_id: selectedPost.user_id,
                }
              : null
          }
        />
      </div>
    </Layout>
  );
}
