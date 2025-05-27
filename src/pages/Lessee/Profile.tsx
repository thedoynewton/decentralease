import { useAccount, useDisconnect } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  User,
  PlusCircle,
  Email,
  Phone,
  MapPin,
  Filter,
  Menu,
  Copy,
} from "@deemlol/next-icons";

import Layout from "../../../components/Layout";
import styles from "../../styles/Profile.module.css";

export default function Profile() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { disconnect } = useDisconnect();
  const { address } = useAccount();
  const [status, setStatus] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState<string>("Username");
  const [iconSize, setIconSize] = useState(28);
  const [postImages, setPostImages] = useState<
    { image_url: string; title: string; category_id?: string | number }[]
  >([]);
  const [filteredImages, setFilteredImages] = useState<
    { image_url: string; title: string; category_id?: string | number }[]
  >([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [categoriesList, setCategoriesList] = useState<
    { id: string | number; name: string }[]
  >([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showMenuOptions, setShowMenuOptions] = useState(false);

  // Close menu options when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenuOptions(false);
      }
    }
    if (showMenuOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenuOptions]);

  // Copy wallet address to clipboard
  const handleCopyAddress = () => {
  if (!address) return;

  // Modern clipboard API
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    navigator.clipboard.writeText(address)
      .then(() => {
        setCopyStatus("Copied to clipboard!");
        setTimeout(() => setCopyStatus(null), 1500);
      })
      .catch(() => {
        setCopyStatus("Failed to copy.");
        setTimeout(() => setCopyStatus(null), 1500);
      });
  } else {
    // Fallback for older browsers (including iOS Safari)
    try {
      const textarea = document.createElement("textarea");
      textarea.value = address;
      textarea.style.position = "fixed"; // Prevent scrolling to bottom of page in MS Edge.
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopyStatus("Copied to clipboard!");
    } catch {
      setCopyStatus("Failed to copy.");
    }
    setTimeout(() => setCopyStatus(null), 1500);
  }
};

  // Fetch categories for dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name");
      if (!error && Array.isArray(data)) {
        setCategoriesList(data);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
        .select("image_url, title, category_id")
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

  // Filter by search and category
  useEffect(() => {
    let filtered = postImages;
    if (search) {
      filtered = filtered.filter((post) =>
        post.title?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (category) {
      filtered = filtered.filter(
        (post) => post.category_id?.toString() === category
      );
    }
    setFilteredImages(filtered);
  }, [search, category, postImages]);

  // Get unique categories for filter dropdown
  const categories = Array.from(
    new Set(postImages.map((post) => post.category_id).filter(Boolean))
  );

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
        {address && (
          <div className={styles.walletRow}>
            <div className={styles.walletAddress}>
              {address.slice(0, 6)}...{address.slice(-4)}
              <span
                className={styles.copyIconWrapper}
                onClick={handleCopyAddress}
                title="Copy address"
                tabIndex={0}
                style={{
                  cursor: "pointer",
                  marginLeft: 8,
                  display: "inline-flex",
                  verticalAlign: "middle",
                }}
                role="button"
                aria-label="Copy wallet address"
                onKeyPress={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleCopyAddress();
                }}
              >
                <Copy size={18} color="#1976d2" />
              </span>
            </div>
            <span
              className={styles.menuIconWrapper}
              onClick={() => setShowMenuOptions((v) => !v)}
              style={{ position: "relative", cursor: "pointer" }}
              tabIndex={0}
              aria-label="Open menu"
              role="button"
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") setShowMenuOptions((v) => !v);
              }}
            >
              <Menu size={28} color="#1976d2" />
              {showMenuOptions && (
                <div
                  ref={menuRef}
                  className={styles.menuDropdown}
                  style={{
                    position: "absolute",
                    top: "120%",
                    right: 0,
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                    minWidth: 160,
                    zIndex: 100,
                  }}
                >
                  <div
                    className={styles.menuDropdownItem}
                    onClick={() => {
                      setShowMenuOptions(false);
                      // Add your settings navigation here
                      setStatus("Settings clicked!"); // Example
                    }}
                  >
                    Settings
                  </div>
                  <div
                    className={styles.menuDropdownItem}
                    onClick={() => {
                      setShowMenuOptions(false);
                      handleDisconnect();
                    }}
                  >
                    Disconnect
                  </div>
                  <div
                    className={styles.menuDropdownItem}
                    onClick={() => {
                      setShowMenuOptions(false);
                      // Add your switch to lessor logic here
                      setStatus("Switch to lessor clicked!"); // Example
                    }}
                  >
                    Switch to lessor
                  </div>
                </div>
              )}
            </span>
          </div>
        )}
        {copyStatus && (
          <div className={styles.copyNotification}>{copyStatus}</div>
        )}
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
            <h2 className={styles.igUsername}>{profile.username}</h2>
            <div className={styles.mobileProfileNamePosts}>
              <span className={styles.mobilePostsCount}>
                <strong>{profile.posts}</strong> posts
              </span>
            </div>
            <div className={styles.igStats}>
              <span>
                <strong>{profile.posts}</strong> posts
              </span>
            </div>
            {status && <div className={styles.status}>{status}</div>}
          </div>
        </div>
        <div className={styles.aboutSection}>
          <h2 className={styles.aboutTitle}>About me</h2>
          <div>
            <Email
              size={18}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            <span>{email || "—"}</span>
          </div>
          <div>
            <Phone
              size={18}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            <span>{phone || "—"}</span>
          </div>
          <div>
            <MapPin
              size={18}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            <span>{location || "—"}</span>
          </div>
        </div>
        {/* Search bar and filter */}
        <div className={styles.searchFilterRow}>
          <input
            type="text"
            placeholder="Search posts title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchBar}
          />
          <div className={styles.filterWrapper}>
            <button
              type="button"
              className={styles.filterButton}
              onClick={() => setShowCategoryDropdown((v) => !v)}
              aria-label="Filter by category"
            >
              <Filter size={22} color="#1976d2" />
            </button>
            {showCategoryDropdown && (
              <div className={styles.categoryDropdown}>
                <div
                  className={
                    styles.categoryDropdownItem +
                    (!category ? " " + styles.selectedCategory : "")
                  }
                  onClick={() => {
                    setCategory("");
                    setShowCategoryDropdown(false);
                  }}
                >
                  All Categories
                </div>
                {categoriesList.map((cat) => (
                  <div
                    key={cat.id}
                    className={
                      styles.categoryDropdownItem +
                      (category === cat.id.toString()
                        ? " " + styles.selectedCategory
                        : "")
                    }
                    onClick={() => {
                      setCategory(cat.id.toString());
                      setShowCategoryDropdown(false);
                    }}
                  >
                    {cat.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.igPostsGrid}>
          {profile.postImages.length === 0 ? (
            <div
              style={{ gridColumn: "1/-1", textAlign: "center", color: "#888" }}
            >
              No posts found.
            </div>
          ) : (
            profile.postImages.map((img, idx) => (
              <div key={idx} className={styles.igPostItem}>
                <img
                  src={img.image_url}
                  alt={img.title || `Post ${idx + 1}`}
                  title={img.title}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
