import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { supabase } from "../supabase/supabase-client";
import styles from "../src/styles/SendOffer.module.css";

interface ListingItem {
  id: string;
  user_id: string;
  category_id: number;
  subcategory_id: number;
  title: string;
  rental_fee: number;
  security_deposit: number;
  late_return_fee: number;
  conditions: string;
  description: string;
  image_url: string | null;
  created_at: string;
}

interface Post {
  id: string;
  description: string;
  user_name?: string;
  user_id?: string;
}

interface SendOfferProps {
  isOpen: boolean;
  onClose: () => void;
  postInfo: Post | null;
}

export default function SendOffer({
  isOpen,
  onClose,
  postInfo,
}: SendOfferProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(
    null
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { address } = useAccount();
  const [postUserName, setPostUserName] = useState<string | null>(null);

  // Fetch the user name for the post's user_id
  useEffect(() => {
    const fetchUserName = async () => {
      if (postInfo?.user_id) {
        const { data, error } = await supabase
          .from("users")
          .select("name")
          .eq("id", postInfo.user_id)
          .single();
        if (data && data.name) {
          setPostUserName(data.name);
        } else {
          setPostUserName(null);
        }
      } else {
        setPostUserName(null);
      }
    };
    fetchUserName();
  }, [postInfo?.user_id]);

  useEffect(() => {
    const fetchListings = async () => {
      if (!address) {
        setError(
          "No wallet connected. Please connect your wallet to view your listings."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get user ID from wallet address
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", address)
          .single();

        if (userError) {
          setError("Failed to find user account with this wallet address.");
          return;
        }

        if (!userData || !userData.id) {
          setError(
            "User not found. Please ensure your wallet is correctly connected."
          );
          return;
        }

        // Fetch listings for the user
        const { data, error: fetchError } = await supabase
          .from("listings")
          .select(
            `
            id, user_id, category_id, subcategory_id, title, rental_fee, 
            security_deposit, late_return_fee, conditions, description, image_url, created_at
          `
          )
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        if (data) {
          const formattedListings: ListingItem[] = data.map((item) => ({
            id: item.id,
            user_id: item.user_id,
            category_id: item.category_id,
            subcategory_id: item.subcategory_id,
            title: item.title,
            rental_fee: item.rental_fee,
            security_deposit: item.security_deposit,
            late_return_fee: item.late_return_fee,
            conditions: item.conditions,
            description: item.description,
            image_url: item.image_url,
            created_at: item.created_at,
          }));
          setListings(formattedListings);
        }
      } catch (err: any) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchListings();
    }
  }, [isOpen, address]);

  const handleListingPress = (item: ListingItem) => {
    if (!postInfo) {
      console.error("No post information available");
      alert(
        "Cannot send offer. Post information is missing. Please try again."
      );
      return;
    }

    setSelectedListing(item);
    handleSendOffer(item);
  };

  const handleSendOffer = async (listing: ListingItem) => {
    if (!listing) {
      console.error("Listing is missing when attempting to send offer");
      alert("Cannot send offer. Listing information is missing.");
      return;
    }

    if (!postInfo) {
      console.error("Post info is missing when attempting to send offer");
      alert("Cannot send offer. Post information is missing.");
      return;
    }

    try {
      setLoading(true);

      // TODO: Implement offer creation in database
      console.log(
        "Sending offer for listing:",
        listing.title,
        "ID:",
        listing.id
      );
      console.log("To post:", postInfo.description, "ID:", postInfo.id);
      console.log("User ID:", postInfo.user_id);

      // Simulate success after delay
      setTimeout(() => {
        setLoading(false);
        setShowSuccessModal(true);
      }, 1000);
    } catch (err: any) {
      console.error("Error sending offer:", err);
      setLoading(false);
      alert("Failed to send offer. Please try again.");
    }
  };

  const filteredListings = listings.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
          {postInfo && (
            <div className={styles.postInfo}>
              <h2>Select a listing to offer to {postUserName || "User"}</h2>
              <p>{postInfo.description || "No description"}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className={styles.searchInput}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>
              {selectedListing ? "Sending offer..." : "Loading listings..."}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && !error && (
          <div className={styles.listingsGrid}>
            {filteredListings.length === 0 ? (
              <p className={styles.noListings}>No listings found</p>
            ) : (
              filteredListings.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.listingCard} ${
                    selectedListing?.id === item.id ? styles.selected : ""
                  }`}
                  onClick={() => handleListingPress(item)}
                >
                  <div className={styles.imageContainer}>
                    <img
                      src={item.image_url || "/placeholder.png"}
                      alt={item.title}
                      className={styles.listingImage}
                    />
                  </div>
                  <div className={styles.listingDetails}>
                    <h3>{item.title}</h3>
                    <p className={styles.rentalFee}>{item.rental_fee} / day</p>
                  </div>
                  <button className={styles.sendButton}>Send Offer</button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className={styles.successModal}>
            <div className={styles.successContent}>
              <div className={styles.successIcon}>✓</div>
              <h3>Offer Sent Successfully!</h3>
              <p>
                Your offer has been sent to {postInfo?.user_name || "the user"}.
              </p>
              <button
                className={styles.successButton}
                onClick={() => {
                  setShowSuccessModal(false);
                  onClose();
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
