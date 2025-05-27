import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../supabase/supabase-client';
import Layout from '../../../components/Layout';
import styles from '../../styles/LessorProfile.module.css';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  wallet_address: string;
  profile_image_url: string;
  is_lessor: boolean;
}

interface Listing {
  id: string;
  image_url: string;
}

export default function Profile() {
  const router = useRouter();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserAndListings() {
      if (!address) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', address.toLowerCase())
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('User not found');

        setUser(userData);

        // Fetch user's listings
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('id, image_url')
          .eq('user_id', userData.id);

        if (listingsError) throw listingsError;
        setListings(listingsData || []);

      } catch (err: any) {
        console.error('Error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUserAndListings();
  }, [address]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      if (!urlData) throw new Error('Failed to get image URL');

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setUser(prev => prev ? { ...prev, profile_image_url: urlData.publicUrl } : null);

    } catch (err: any) {
      console.error('Error uploading image:', err.message);
      alert('Failed to upload image');
    }
  };

  const handleSwitchRole = async () => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_lessor: false })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/Lessee/Home');
    } catch (err: any) {
      console.error('Error switching role:', err.message);
      alert('Failed to switch role');
    }
  };

  const handleDisconnect = async () => {
    if (address) {
      await supabase
        .from("users")
        .update({ is_signed_in: false })
        .eq("wallet_address", address.toLowerCase());
    }
    disconnect();
    router.push("/");
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading profile...</div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout>
        <div className={styles.error}>
          {error || 'Failed to load profile'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.profileSection}>
            <div className={styles.imageContainer}>
              {user.profile_image_url ? (
                <Image
                  src={user.profile_image_url}
                  alt={user.name}
                  fill
                  className={styles.profileImage}
                />
              ) : (
                <div className={styles.imageUploadPlaceholder}>
                  {user.name?.[0] || '?'}
                </div>
              )}
              <label className={styles.imageUploadButton}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                Change Photo
              </label>
            </div>

            <div className={styles.profileInfo}>
              <h1 className={styles.name}>{user.name}</h1>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{listings.length}</span>
                  <span className={styles.statLabel}>Listings</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <Link href="/Lessor/Settings" className={styles.settingsButton}>
              Edit Profile
            </Link>
            <button onClick={handleSwitchRole} className={styles.switchButton}>
              Switch to Lessee Mode
            </button>
            <button onClick={handleDisconnect} className={styles.disconnectButton}>
              Disconnect Wallet
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact Information</h2>
          <div className={styles.contactInfo}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Email:</span>
              <span className={styles.value}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Phone:</span>
              <span className={styles.value}>{user.phone}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Location:</span>
              <span className={styles.value}>{user.location}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Wallet:</span>
              <span className={styles.value}>
                {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>My Listings</h2>
          <div className={styles.listingsGrid}>
            {listings.map((listing) => (
              <div key={listing.id} className={styles.listingItem}>
                <Image
                  src={listing.image_url}
                  alt="Listing"
                  fill
                  className={styles.listingImage}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
} 