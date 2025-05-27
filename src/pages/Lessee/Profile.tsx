import { useAccount, useDisconnect } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { User, PlusCircle } from "@deemlol/next-icons";

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

  useEffect(() => {
    // Set icon size based on window width (client-side only)
    const handleResize = () => {
      setIconSize(window.innerWidth <= 600 ? 20 : 28);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /// Fetch avatar and name from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;
      const { data, error } = await supabase
        .from("users")
        .select("profile_image_url, name")
        .eq("wallet_address", address)
        .single();
      if (!error) {
        setAvatarUrl(data?.profile_image_url || null);
        setName(data?.name || "Username");
      } else {
        setAvatarUrl(null);
        setName("Username");
      }
    };
    fetchProfile();
  }, [address]);

  // Mock profile data for demonstration
  const profile = {
    username: name,
    bio: "Web3 enthusiast. Lessee at Decentralease.",
    posts: 8,
    followers: 340,
    following: 180,
    postImages: [
      "/mock1.jpg",
      "/mock2.jpg",
      "/mock3.jpg",
      "/mock4.jpg",
      "/mock5.jpg",
      "/mock6.jpg",
      "/mock7.jpg",
      "/mock8.jpg",
    ],
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

  // Handler for avatar change (upload to Supabase Storage)
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
            <h2 className={styles.igUsername}>{profile.username}</h2>
            <div className={styles.igStats}>
              <span>
                <strong>{profile.posts}</strong> posts
              </span>
              <span>
                <strong>{profile.followers}</strong> followers
              </span>
              <span>
                <strong>{profile.following}</strong> following
              </span>
            </div>
            <p className={styles.igBio}>{profile.bio}</p>
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
        <div className={styles.igPostsGrid}>
          {profile.postImages.map((img, idx) => (
            <div key={idx} className={styles.igPostItem}>
              <img src={img} alt={`Post ${idx + 1}`} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
