import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../src/styles/Layout.module.css";

const navItems = [
  { label: "Marketplace", href: "/Lessee/Home", icon: "🛒" },   // Shopping cart for marketplace
  { label: "Activity", href: "/Lessee/Activity", icon: "📊" },  // Bar chart for activity
  { label: "Inbox", href: "/Lessee/Inbox", icon: "✉️" },        // Envelope for inbox
  { label: "Profile", href: "/Lessee/Profile", icon: "👤" },     // User for profile
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`${styles.navLink} ${router.pathname === item.href ? styles.active : ""}`}>
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </nav>
      <main className={styles.content}>{children}</main>
      <div className={styles.tabbar}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={`${styles.tabLink} ${router.pathname === item.href ? styles.active : ""}`}>
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}