import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import styles from "../src/styles/SignMessage.module.css";
import { supabase } from "../supabase/supabase-client";
import { useRouter } from "next/router";

export function SignMessage() {
  const [message, setMessage] = useState("Hello from Decentralease!");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const { address } = useAccount();
  const { data, isPending, isSuccess, signMessage, error } = useSignMessage();
  const router = useRouter();

  useEffect(() => {
    const authenticate = async () => {
      if (isSuccess && address && data) {
        // Check if user exists
        const { data: user, error: fetchError } = await supabase
          // .from("users")
          .from("users")
          .select("id")
          .eq("wallet_address", address)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          setAuthStatus("Supabase error: " + fetchError.message);
          return;
        }

        if (!user) {
          // New user: insert and route to CreateProfile
          const { error: upsertError } = await supabase
            // .from("users")
            .from("users")
            .upsert(
              [
                {
                  wallet_address: address,
                },
              ],
              { onConflict: "wallet_address" }
            );

          if (upsertError) {
            setAuthStatus("Supabase error: " + upsertError.message);
          } else {
            setAuthStatus("New user! Redirecting to CreateProfile...");
            router.push("/CreateProfile");
          }
        } else {
          // Existing user: update sign-in status and route to Home
          await supabase
            // .from("users")
            .from("users")
            .update({ is_signed_in: true })
            .eq("wallet_address", address);

          setAuthStatus("Welcome back! Redirecting to Home...");
          router.push("/Lessee/Home");
        }
      }
    };
    authenticate();
  }, [isSuccess, address, data]);

  return (
    <div className={styles.container}>
     
      <div className={styles.connectButtonContainer}>
        <ConnectButton />
      </div>
      <div className={styles.inputRow}>
        <button
          onClick={() => signMessage({ message })}
          disabled={isPending}
          className={styles.button}
        >
          {isPending ? "Signing..." : "Sign Message"}
        </button>
      </div>
      {isSuccess && (
        <div className={styles.signature}>
          <strong>Loading...</strong>
        </div>
      )}
      {error && <div className={styles.error}>Error: {error.message}</div>}
    </div>
  );
}
