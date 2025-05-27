import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { supabase } from "../supabase/supabase-client";
import styles from "../src/styles/Layout.module.css"; // Assuming this path

// Define a type for your navigation items for better type safety
interface NavItem {
  label: string;
  href: string;
  icon: string;
  isCreateButton?: boolean; // New property to identify the create button
  isSpacer?: boolean; // New property to identify the spacer
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { address } = useAccount();
  const [isLessor, setIsLessor] = useState(false);

  useEffect(() => {
    async function checkUserRole() {
      if (!address) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_lessor')
          .eq('wallet_address', address.toLowerCase())
          .single();
        
        if (error) throw error;
        setIsLessor(data?.is_lessor ?? false);
      } catch (err) {
        console.error('Error checking user role:', err);
      }
    }

    checkUserRole();
  }, [address]);

  const navItems: NavItem[] = [
    { 
      label: "Marketplace", 
      href: isLessor ? "/Lessor/Home" : "/Lessee/Home", 
      icon: "🛒" 
    },
    { 
      label: "Activity", 
      href: isLessor ? "/Lessor/Activity" : "/Lessee/Activity", 
      icon: "📊" 
    },
    { 
      label: "Inbox", 
      href: isLessor ? "/Lessor/Inbox" : "/Lessee/Inbox", 
      icon: "✉️" 
    },
    { 
      label: "Profile", 
      href: isLessor ? "/Lessor/Profile" : "/Lessee/Profile", 
      icon: "👤" 
    },
  ];

  // Define the Create Post button based on role
  const createPostButton: NavItem = {
    label: "Create",
    href: isLessor ? "/Lessor/LessorPost" : "/Lessee/LesseePost",
    icon: "+",
    isCreateButton: true,
  };

  // Define a spacer element
  const spacer: NavItem = {
    label: "",
    href: "#",
    icon: "",
    isSpacer: true,
  };

  // Combine nav items with the create button and spacers for the tabbar
  const tabbarItems = [
    navItems[0],
    navItems[1],
    spacer,
    navItems[2],
    navItems[3],
  ];

  return (
    <div className={styles.layout}>
      {/* Navbar (top navigation - desktop only) */}
      <nav className={styles.navbar}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${
              router.pathname === item.href ? styles.active : ""
            }`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <main className={styles.content}>{children}</main>

      {/* Tabbar (bottom navigation - mobile only) */}
      <div className={styles.tabbar}>
        {tabbarItems.map((item) => (
          // Conditionally render the FAB, a spacer, or a regular tab link
          item.isCreateButton ? (
            <Link
              key={item.href}
              href={item.href}
              className={styles.createPostButton}
            >
              <span className={styles.icon}>{item.icon}</span>
            </Link>
          ) : item.isSpacer ? (
            <div key="spacer" className={styles.tabbarSpacer} aria-hidden="true"></div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.tabLink} ${
                router.pathname === item.href ? styles.active : ""
              }`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          )
        ))}
        {/* The actual create post button is floated above the tabbar */}
        <Link href={createPostButton.href} className={styles.createPostButton}>
          <span className={styles.icon}>{createPostButton.icon}</span>
        </Link>
      </div>
    </div>
  );
}