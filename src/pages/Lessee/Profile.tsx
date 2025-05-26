import { useAccount, useDisconnect } from "wagmi";
import { supabase } from "../../../supabase/supabase-client";
import { useState } from "react";
import { useRouter } from "next/router";

import Layout from "../../../components/Layout";
import styles from "../../styles/LesseeHome.module.css";

export default function Profile() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

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

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Welcome to Decentralease!</h1>
        <p className={styles.subtitle}>
          {address ? (
            <>
              Connected as{" "}
              <span className={styles.address}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </>
          ) : (
            "Connect your wallet to get started."
          )}
        </p>
        {address && (
          <button
            className={styles.disconnectButton}
            onClick={handleDisconnect}
          >
            Disconnect Wallet
          </button>
        )}
        {status && <div className={styles.status}>{status}</div>}
      </div>
    </Layout>
  );
}
