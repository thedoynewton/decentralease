import { useAccount, useDisconnect } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { User, PlusCircle, Email, Phone, MapPin } from "@deemlol/next-icons";

import Layout from "../../../components/Layout";
import styles from "../../styles/Profile.module.css";

export default function Profile() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>("Username");
  const [iconSize, setIconSize] = useState(28);
  const [postImages, setPostImages] = useState<{ image_url: string; title: string }[]>([]);
  const [filteredImages, setFilteredImages] = useState<{ image_url: string; title: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    const handleResize = () => {
      setIconSize(window.innerWidth <= 600 ? 20 : 28);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch avatar, name, and extra profile info from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;
      const { data, error } = await supabase
        .from("users")
        .select("id, profile_image_url, name, email, phone, location")
        .eq("wallet_address", address)
        .single();
      if (!error && data) {
        setAvatarUrl(data?.profile_image_url || null);
        setName(data?.name || "Username");
        setUserId(data.id);
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
      } else {
        setAvatarUrl(null);
        setName("Username");
        setUserId(null);
        setEmail("");
        setPhone("");
        setLocation("");
      }
    };
    fetchProfile();
  }, [address]);

  // Fetch post images for the connected user using userId
  useEffect(() => {
    const fetchPosts = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("posts")
        .select("image_url, title")
        .eq("user_id", userId);
      if (!error && Array.isArray(data)) {
        setPostImages(data.filter((post) => post.image_url));
        setFilteredImages(data.filter((post) => post.image_url));
      } else {
        setPostImages([]);
        setFilteredImages([]);
      }
    };
    fetchPosts();
  }, [userId]);

  // Search function
  useEffect(() => {
    if (!search) {
      setFilteredImages(postImages);
    } else {
      setFilteredImages(
        postImages.filter((post) =>
          post.title?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, postImages]);

  const profile = {
    username: name,
    posts: postImages.length,
    postImages: filteredImages,
  };

  const handleDisconnect = async () => {
    if (address) {
      await supabase
        .from("users")
        .update({ is_signed_in: false })
        .eq("wallet_address", address);
    }
    disconnect();
    setStatus("Disconnected. Redirecting...");
    setTimeout(() => router.push("/"), 800);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${address}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setStatus("Failed to upload image.");
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("profile-images")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      setStatus("Failed to get image URL.");
      setUploading(false);
      return;
    }

    // Update user profile with new image URL
    const { error: updateError } = await supabase
      .from("users")
      .update({ profile_image_url: publicUrl })
      .eq("wallet_address", address);

    if (updateError) {
      setStatus("Failed to update profile image.");
      setUploading(false);
      return;
    }

    setAvatarUrl(publicUrl);
    setStatus("Profile photo updated!");
    setUploading(false);
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current && !uploading) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <Layout>
      <div className={styles.igProfileContainer}>
        <div className={styles.igProfileHeader}>
          <div
            className={styles.igAvatar}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f5f5f5",
              position: "relative",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.6 : 1,
            }}
            onClick={handleAvatarClick}
            title={uploading ? "Uploading..." : "Change profile photo"}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <User size={80} color="#bbb" />
            )}
            <span className={styles.plusIconWrapper}>
              <PlusCircle size={iconSize} color="#1976d2" />
            </span>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </div>
          <div className={styles.igProfileInfo}>
            <div className={styles.mobileProfileNamePosts}>
              <h2 className={styles.igUsername}>{profile.username}</h2>
              <span className={styles.mobilePostsCount}>
                <strong>{profile.posts}</strong> posts
              </span>
            </div>
            <div className={styles.igStats}>
              <span>
                <strong>{profile.posts}</strong> posts
              </span>
            </div>
            {address && (
              <button
                className={styles.disconnectButton}
                onClick={handleDisconnect}
                disabled={uploading}
              >
                Disconnect Wallet
              </button>
            )}
            {status && <div className={styles.status}>{status}</div>}
          </div>
        </div>
        <div className={styles.aboutSection}>
          <h2 className={styles.aboutTitle}>About me</h2>
          <div>
            <Email size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            <span>{email || "—"}</span>
          </div>
          <div>
            <Phone size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            <span>{phone || "—"}</span>
          </div>
          <div>
            <MapPin size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            <span>{location || "—"}</span>
          </div>
        </div>
        {/* Search bar */}
        <div style={{ margin: "1.5rem 0 1rem 0" }}>
          <input
            type="text"
            placeholder="Search posts title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchBar}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              outline: "none",
            }}
          />
        </div>
        <div className={styles.igPostsGrid}>
          {profile.postImages.length === 0 ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#888" }}>
              No posts found.
            </div>
          ) : (
            profile.postImages.map((img, idx) => (
              <div key={idx} className={styles.igPostItem}>
                <img src={img.image_url} alt={img.title || `Post ${idx + 1}`} title={img.title} />
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}