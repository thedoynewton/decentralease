import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { supabase } from '../../../supabase/supabase-client';
import Layout from '../../../components/Layout';
import styles from '../../styles/Settings.module.css';

interface UserProfile {
  name: string;
  email: string;
  wallet_address: string;
  is_lessor: boolean;
  profile_image_url: string;
}

export default function Settings() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLessor, setIsLessor] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!address) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('users')
          .select('name, email, wallet_address, is_lessor, profile_image_url')
          .eq('wallet_address', address.toLowerCase())
          .single();
        
        if (error) throw error;

        setProfile(data);
        setIsLessor(data?.is_lessor ?? false);
      } catch (err: any) {
        console.error('Error loading profile:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [address]);

  const copyToClipboard = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      alert('Wallet address copied to clipboard!');
    }
  };

  const handleSwitchRole = async () => {
    if (!isConnected || !address || !profile) {
      alert('Please connect your wallet first.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_lessor: !isLessor })
        .eq('wallet_address', address.toLowerCase());

      if (error) throw error;

      setIsLessor(!isLessor);
      
      // Redirect to appropriate dashboard
      router.push(isLessor ? '/Lessee/Home' : '/Lessor/Home');
    } catch (err: any) {
      console.error('Error switching role:', err.message);
      alert('Failed to switch role. Please try again.');
    }
  };

  const handleLogout = async () => {
    if (!isConnected || !address) {
      alert('Wallet not connected.');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ is_signed_in: false })
        .eq('wallet_address', address.toLowerCase());

      if (error) throw error;

      router.replace('/');
    } catch (err: any) {
      console.error('Error during logout:', err.message);
      alert('Logout failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading profile...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.error}>{error}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => router.back()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.headerTitle}>Profile</h1>
          <button className={styles.verifyButton}>
            Verify Now
          </button>
        </div>

        <div className={styles.profileSection}>
          <div className={styles.imageContainer}>
            {profile?.profile_image_url ? (
              <Image
                src={profile.profile_image_url}
                alt={profile.name}
                width={100}
                height={100}
                className={styles.profileImage}
              />
            ) : (
              <div className={styles.profileImagePlaceholder}>
                {profile?.name?.[0] || '?'}
              </div>
            )}
          </div>
          <h2 className={styles.name}>{profile?.name || 'Loading...'}</h2>
          <p className={styles.username}>@{profile?.email?.split('@')[0] || ''}</p>
        </div>

        <div className={styles.menuSection}>
          <button className={styles.menuItem} onClick={() => router.push('/Profile/Edit')}>
            <svg className={styles.menuIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Edit Profile</span>
          </button>

          <button className={styles.menuItem} onClick={copyToClipboard}>
            <svg className={styles.menuIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 12V8h-4M4 12v4h4" />
              <path d="M12 20c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" />
            </svg>
            <span className={styles.walletAddress}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </span>
            <svg className={styles.copyIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          <button className={styles.menuItem} onClick={() => router.push('/Profile/Transactions')}>
            <svg className={styles.menuIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <path d="M16 3l-4 4-4-4" />
              <path d="M12 3v16" />
            </svg>
            <span>Transaction History</span>
          </button>
        </div>

        <div className={styles.switchSection}>
          <h3 className={styles.sectionTitle}>Switch Account</h3>
          <button 
            className={`${styles.switchButton} ${isLessor ? styles.lessor : styles.lessee}`}
            onClick={handleSwitchRole}
          >
            Switch to {isLessor ? 'Lessee' : 'Lessor'} Mode
          </button>
        </div>

        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </Layout>
  );
} 