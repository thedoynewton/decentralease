import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { SignMessage } from "../../components/SignMessage";
import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabase-client";

const Home: NextPage = () => {
  const { address } = useAccount();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  // Hide splash screen after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      if (!address) return;
      const { data, error } = await supabase
        .from("users")
        .select("is_signed_in, is_lessor")
        .eq("wallet_address", address)
        .single();

      if (data?.is_signed_in) {
        if (data.is_lessor) {
          router.replace("/Lessor/Home");
        } else {
          router.replace("/Lessee/Home");
        }
      }
    };
    checkUser();
  }, [address, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Decentralease</title>
        <meta name="apple-mobile-web-app-title" content="Decentralease" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Decentralease" />
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/icons/web-app-manifest-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/icons/web-app-manifest-512x512.png"
        />
      </Head>

      {showSplash ? (
        /* Splash Screen */
        <div className={styles.splashScreen}>
          <div className={styles.splashContent}>
            <img 
              src="/icons/Logo.png" 
              alt="Decentralease Logo" 
              className={styles.splashLogo}
            />
            <img 
              src="/icons/Decentralease.png" 
              alt="Decentralease" 
              className={styles.splashBrandName}
            />
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Loading...</p>
          </div>
        </div>
      ) : (
        /* Main Content */
        <main className={styles.main}>
          {/* Logo and Brand Name */}
          <div className={styles.brandContainer}>
            <img 
              src="/icons/Logo.png" 
              alt="Decentralease Logo" 
              className={styles.logo}
            />
            <img 
              src="/icons/Decentralease.png" 
              alt="Decentralease" 
              className={styles.brandName}
            />
          </div>
          
          {!address && <ConnectButton />}
          {address && <SignMessage />}
         
        </main>
      )}

     
    </div>
  );
};

export default Home;
