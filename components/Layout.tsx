import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../src/styles/Layout.module.css"; // Assuming this path

// Define a type for your navigation items for better type safety
interface NavItem {
  label: string;
  href: string;
  icon: string;
  isCreateButton?: boolean; // New property to identify the create button
  isSpacer?: boolean; // New property to identify the spacer
}

// Lessee navigation items
const lesseeNavItems: NavItem[] = [
  { label: "Marketplace", href: "/Lessee/Home", icon: "🛒" },
  { label: "Activity", href: "/Lessee/Activity", icon: "📊" },
  { label: "Inbox", href: "/Lessee/Inbox", icon: "✉️" },
  { label: "Profile", href: "/Lessee/Profile", icon: "👤" },
];

// Lessor navigation items
const lessorNavItems: NavItem[] = [
  { label: "Home", href: "/Lessor/Home", icon: "🏠" },
  { label: "Activity", href: "/Lessor/Activity", icon: "📊" },
  { label: "Inbox", href: "/Lessor/Inbox", icon: "✉️" },
  { label: "Profile", href: "/Lessor/Profile", icon: "👤" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // Determine if we're in the Lessor section based on the URL
  const isLessor = router.pathname.startsWith("/Lessor");
  
  // Use the appropriate nav items based on the role
  const navItems = isLessor ? lessorNavItems : lesseeNavItems;

  // Define the Create Post button based on role
  const createPostButton: NavItem = {
    label: "Create",
    href: isLessor ? "/Lessor/Post" : "/Lessee/LesseePost",
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
    navItems[0], // Home/Marketplace
    navItems[1], // Activity
    spacer,      // Spacer to push the FAB to the right
    navItems[2], // Inbox
    navItems[3], // Profile
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