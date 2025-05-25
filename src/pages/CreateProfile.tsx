import { useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/router";
import { supabase } from "../../supabase/supabase-client";
import styles from "../styles/CreateProfile.module.css";

export default function CreateProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const { address } = useAccount();
  const router = useRouter();

  // Simple validators
  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone: string) =>
    /^\+?\d{7,15}$/.test(phone.replace(/[\s\-()]/g, ""));

  const validateName = (name: string) =>
    name.trim().length >= 2;

  const validateLocation = (location: string) =>
    location.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validations
    if (!validateName(name)) {
      setStatus("Please enter a valid name (at least 2 characters).");
      return;
    }
    if (!validateEmail(email)) {
      setStatus("Please enter a valid email address.");
      return;
    }
    if (!validatePhone(phone)) {
      setStatus("Please enter a valid phone number (7-15 digits).");
      return;
    }
    if (!validateLocation(location)) {
      setStatus("Please enter a valid location.");
      return;
    }
    if (!address) {
      setStatus("Wallet not connected.");
      return;
    }

    const { error } = await supabase
      .from("users_duplicate")
      .update({ name, email, phone, location, is_signed_in: true })
      .eq("wallet_address", address);

    if (error) {
      setStatus("Error: " + error.message);
    } else {
      setStatus("Profile created! Redirecting...");
      setTimeout(() => router.push("/Lessee/Home"), 500);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Create Profile</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>
            Full Name:
            <input
              type="text"
              value={name}
              required
              onChange={e => setName(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>
        <div className={styles.inputGroup}>
          <label>
            Email:
            <input
              type="email"
              value={email}
              required
              onChange={e => setEmail(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>
        <div className={styles.inputGroup}>
          <label>
            Phone:
            <input
              type="tel"
              value={phone}
              required
              pattern="\+?\d{7,15}"
              onChange={e => setPhone(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>
        <div className={styles.inputGroup}>
          <label>
            Location:
            <input
              type="text"
              value={location}
              required
              onChange={e => setLocation(e.target.value)}
              className={styles.input}
            />
          </label>
        </div>
        <button type="submit" className={styles.button}>Create Profile</button>
      </form>
      {status && <div className={styles.status}>{status}</div>}
    </div>
  );
}