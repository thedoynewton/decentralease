import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from '@deemlol/next-icons';
import Layout from '../../../components/Layout';
import styles from '../../styles/LessorHome.module.css';
import { supabase } from '../../../supabase/supabase-client';

interface Post {
  id: string;
  user_id: string;
  category_id: number;
  subcategory_id: number;
  title: string;
  description: string;
  location: string;
  pickup_date: string;
  return_date: string;
  image_url: string | null;
  created_at: string;
  categories?: { name: string };
  subcategories?: { name: string };
  users?: { name: string };
}

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

export default function LessorHome() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // First fetch the user's ID
  useEffect(() => {
    async function fetchUserId() {
      if (!isConnected || !address) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", address.toLowerCase())
          .single();

        if (error) throw error;
        setUserId(data?.id || null);
      } catch (err: any) {
        console.error("Error fetching user ID:", err.message);
        setError(err.message);
      }
    }

    fetchUserId();
  }, [address, isConnected]);

  // Then fetch posts once we have the user ID
  useEffect(() => {
    async function fetchPosts() {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("posts")
          .select(`
            *,
            categories (name),
            subcategories (name),
            users (name)
          `)
          .neq("user_id", userId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        if (data) {
          setPosts(data);
        }
      } catch (err: any) {
        console.error('Error:', err.message);
        setError(err.message);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [userId]);

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <Link href="/Lessor/LessorPost" className={styles.createButton}>
            Create Listing
          </Link>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading posts...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : !isConnected ? (
          <div className={styles.connect}>
            Please connect your wallet to view posts.
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <p>No posts available at the moment.</p>
          </div>
        ) : (
          <div className={styles.postsGrid}>
            {filteredPosts.map((post) => (
              <div key={post.id} className={styles.postCard}>
                {post.image_url && (
                  <div className={styles.imageContainer}>
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      layout="fill"
                      objectFit="cover"
                      className={styles.postImage}
                    />
                  </div>
                )}
                <div className={styles.postInfo}>
                  <div className={styles.postHeader}>
                    <span className={styles.userName}>{post.users?.name || 'Unknown User'}</span>
                    <span className={styles.timeAgo}>{timeAgo(post.created_at)}</span>
                  </div>
                  <h3 className={styles.postTitle}>{post.title}</h3>
                  <p className={styles.postDescription}>{post.description}</p>
                  <div className={styles.postMeta}>
                    <div className={styles.category}>
                      {post.categories?.name || 'Unknown Category'} - {post.subcategories?.name || 'Unknown Subcategory'}
                    </div>
                    <div className={styles.location}>{post.location}</div>
                    <div className={styles.dates}>
                      {new Date(post.pickup_date).toLocaleDateString()} - {new Date(post.return_date).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    className={styles.offerButton}
                    onClick={() => {
                      // TODO: Implement send offer functionality
                      console.log('Send offer for post:', post.id);
                    }}
                  >
                    Send Offer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 