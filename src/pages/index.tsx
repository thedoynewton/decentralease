import { ConnectButton } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { SignMessage } from "../../components/SignMessage";
import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { supabase } from "../../supabase/supabase-client";

const Home: NextPage = () => {
  const { address } = useAccount();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      if (!address) return;
      const { data, error } = await supabase
        .from("users_duplicate")
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

      <main className={styles.main}>
        <ConnectButton />
        {address && <SignMessage />}
        <h1 className={styles.title}>
          Welcome to{" "}
          <a href="https://decentralease.vercel.app/">Decentralease</a>
        </h1>
      </main>

      <footer className={styles.footer}>
        <a href="https://rainbow.me" rel="noopener noreferrer" target="_blank">
          Made with ❤️ by your frens at 🌈
        </a>
      </footer>
    </div>
  );
};

export default Home;
