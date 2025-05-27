import { useEffect, useState } from "react";
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
}

interface Category {
  id: number;
  name: string;
}

export default function LessorHome() {
  const { address } = useAccount();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSendOffer, setShowSendOffer] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Fetch posts and categories
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch all posts
        const { data: postsData, error: postsError } = await supabase
          .from("posts")
          .select(
            `
            id,
            title,
            description,
            image_url,
            location,
            pickup_date,
            return_date,
            category_id,
            subcategory_id,
            user_id
          `
          )
          .order("created_at", { ascending: false });

        if (postsError) throw postsError;
        setPosts(postsData || []);
        setFilteredPosts(postsData || []);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name");

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter posts based on search and category
  useEffect(() => {
    let filtered = posts;

    if (search) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          post.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (post) => post.category_id.toString() === selectedCategory
      );
    }

    setFilteredPosts(filtered);
  }, [search, selectedCategory, posts]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowSendOffer(true);
  };

  const handleNotificationClick = () => {
    router.push("/Lessor/Notifications");
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Share & Earn</h1>
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
            onChange={(e) => setSearch(e.target.value)}
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
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : filteredPosts.length === 0 ? (
            <div className={styles.noPosts}>No items found</div>
          ) : (
            filteredPosts.map((post) => (
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
                      Pickup: {new Date(post.pickup_date).toLocaleDateString()}
                    </span>
                    <span>
                      Return: {new Date(post.return_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

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
