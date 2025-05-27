import { useAccount, useDisconnect } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

import Layout from "../../../components/Layout";
import styles from "../../styles/Profile.module.css";

export default function Profile() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [isLessor, setIsLessor] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');

  useEffect(() => {
    // Store current path to maintain similar view after role switch
    setCurrentPath(router.pathname);
  }, [router.pathname]);

  useEffect(() => {
    async function loadProfile() {
      if (!address) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_lessor')
          .eq('wallet_address', address.toLowerCase())
          .single();
        
        if (error) throw error;
        setIsLessor(data?.is_lessor ?? false);
      } catch (err: any) {
        console.error('Error loading profile:', err.message);
      }
    }

    loadProfile();
  }, [address]);

  const handleDisconnect = async () => {
    if (address) {
      await supabase
        .from("users")
        .update({ is_signed_in: false })
        .eq("wallet_address", address.toLowerCase());
    }
    disconnect();
    setStatus("Disconnected. Redirecting...");
    setTimeout(() => router.push("/"), 800);
  };

  const getRedirectPath = (newIsLessor: boolean) => {
    // Get the current route segment (e.g., 'marketplace', 'activity', etc.)
    const currentRoute = currentPath.split('/').pop()?.toLowerCase();

    if (currentRoute === 'marketplace') {
      // For marketplace, redirect to appropriate view
      return newIsLessor ? '/Lessor/LessorPost' : '/Lessee/Home';
    } else if (currentRoute === 'activity') {
      // For activity, keep in same section but switch role context
      return newIsLessor ? '/Lessor/Activity' : '/Lessee/Activity';
    } else if (currentRoute === 'inbox') {
      // For inbox, maintain inbox view in new role
      return newIsLessor ? '/Lessor/Inbox' : '/Lessee/Inbox';
    } else {
      // Default to home page of new role
      return newIsLessor ? '/Lessor/Home' : '/Lessee/Home';
    }
  };

  const handleSwitchRole = async () => {
    if (!isConnected || !address) {
      setStatus('Please connect your wallet first.');
      return;
    }

    try {
      // Update user role in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_lessor: !isLessor })
        .eq('wallet_address', address.toLowerCase());

      if (updateError) throw updateError;

      const newIsLessor = !isLessor;
      setIsLessor(newIsLessor);
      
      // Get appropriate redirect path based on current view
      const redirectPath = getRedirectPath(newIsLessor);
      router.push(redirectPath);
      
    } catch (err: any) {
      console.error('Error switching role:', err.message);
      setStatus('Failed to switch role. Please try again.');
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Welcome to Decentralease!</h1>
        <p className={styles.subtitle}>
          Connected as{" "}
          <span className={styles.address}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </p>

        <div className={styles.switchSection}>
          <h3 className={styles.sectionTitle}>Switch Account</h3>
          <button 
            className={`${styles.switchButton} ${isLessor ? styles.lessor : styles.lessee}`}
            onClick={handleSwitchRole}
          >
            Switch to {isLessor ? 'Lessee' : 'Lessor'} Mode
          </button>
        </div>

        <button
          className={styles.disconnectButton}
          onClick={handleDisconnect}
        >
          Disconnect Wallet
        </button>
        
        {status && <div className={styles.status}>{status}</div>}
      </div>
    </Layout>
  );
}
