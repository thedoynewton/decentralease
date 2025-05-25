import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/router";
import { supabase } from "../../../supabase/supabase-client";
import { useState } from "react";
import styles from "../../styles/LesseeHome.module.css";
import Layout from "../../../components/Layout";

export default function Home() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const handleDisconnect = async () => {
    if (address) {
      await supabase
        .from("users_duplicate")
        .update({ is_signed_in: false })
        .eq("wallet_address", address);
    }
    disconnect();
    setStatus("Disconnected. Redirecting...");
    setTimeout(() => router.push("/"), 800);
  };

  return (
    <Layout>
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to Decentralease!</h1>
      <p className={styles.subtitle}>
        {address
          ? <>Connected as <span className={styles.address}>{address.slice(0, 6)}...{address.slice(-4)}</span></>
          : "Connect your wallet to get started."}
      </p>
      {address && (
        <button
          className={styles.disconnectButton}
          onClick={handleDisconnect}
        >
          Disconnect Wallet
        </button>
      )}
      {status && (
        <div className={styles.status}>{status}</div>
      )}
      <div className={styles.buttonRow}>
        <button
          className={styles.actionButton}
          onClick={() => router.push("/Lesse/BrowseProperties")}
        >
          Browse Properties
        </button>
        <button
          className={styles.actionButtonGreen}
          onClick={() => router.push("/Lesse/MyLeases")}
        >
          My Leases
        </button>
      </div>
      <div className={styles.infoBox}>
        <strong>What would you like to do?</strong>
        <ul>
          <li>🔍 Explore available rental properties</li>
          <li>📄 View and manage your leases</li>
          <li>👤 Update your profile</li>
        </ul>
      </div>
    </div>
    </Layout>
  );
}