// src/pages/Lessee/LesseePost.tsx
import {
  useState,
  useCallback,
  ChangeEvent,
  FormEvent,
  useEffect,
} from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";

// Import the CSS module
import styles from "../../styles/LesseePost.module.css";
import { supabase } from "../../../supabase/supabase-client";
import Layout from "../../../components/LesseeLayout";

// Add a debounce utility function
// This helps to limit API calls as the user types
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface SupabaseCategory {
  id: string;
  name: string;
}

interface SupabaseSubCategory {
  id: string;
  name: string;
  category_id: string;
}

interface FormData {
  title: string;
  description: string;
  category: string;
  subCategory: string;
  location: string;
  pickupDate: string;
  returnDate: string;
  images: File[];
}

interface LocationSuggestion {
  id: string;
  name: string; // The main text of the prediction
  address: string; // The full description/formatted address
}

export default function LesseePost() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    location: "", // Initialize as empty for immediate search interaction
    pickupDate: "",
    returnDate: "",
    images: [],
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);

  const [allCategories, setAllCategories] = useState<SupabaseCategory[]>([]);
  const [allSubCategories, setAllSubCategories] = useState<
    SupabaseSubCategory[]
  >([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for location search
  const [locationInputValue, setLocationInputValue] = useState(
    formData.location
  ); // Separate state for input to allow debouncing
  const debouncedLocationInput = useDebounce(locationInputValue, 500); // Debounce for 500ms
  const [locationSuggestions, setLocationSuggestions] = useState<
    LocationSuggestion[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(
    null
  );

  const getTodayDateString = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const todayDate = getTodayDateString();

  // --- Fetch Categories and Subcategories on component mount ---
  useEffect(() => {
    async function fetchCategoriesAndSubcategories() {
      setIsLoadingCategories(true);
      setFetchError(null);
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name");

        if (categoriesError) throw categoriesError;
        setAllCategories(categoriesData || []);

        const { data: subcategoriesData, error: subcategoriesError } =
          await supabase.from("subcategories").select("id, name, category_id");

        if (subcategoriesError) throw subcategoriesError;
        setAllSubCategories(subcategoriesData || []);
      } catch (error: any) {
        console.error(
          "Error fetching categories or subcategories:",
          error.message
        );
        setFetchError(`Failed to load categories: ${error.message}`);
      } finally {
        setIsLoadingCategories(false);
      }
    }

    fetchCategoriesAndSubcategories();
  }, []);

  const handleChange = useCallback(
    (
      e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleCategoryChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const selectedCategoryName = e.target.value;
      setFormData((prev) => ({
        ...prev,
        category: selectedCategoryName,
        subCategory: "",
      }));
    },
    []
  );

  const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFormData((prev) => ({
        ...prev,
        images: [file],
      }));
      setImagePreviews([URL.createObjectURL(file)]);
    } else {
      setFormData((prev) => ({ ...prev, images: [] }));
      setImagePreviews([]);
    }
  }, []);

  // Find the selected category and subcategory IDs
  const selectedCategoryId = allCategories.find(
    (cat) => cat.name === formData.category
  )?.id;

  const selectedSubCategoryId = allSubCategories.find(
    (subCat) =>
      subCat.name === formData.subCategory &&
      subCat.category_id === selectedCategoryId
  )?.id;

  const filteredSubCategories = allSubCategories.filter(
    (subCat) => subCat.category_id === selectedCategoryId
  );

  const uploadImagesToSupabase = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) {
      throw new Error("No image file selected for upload.");
    }
    const file = files[0];

    if (!address) throw new Error("Wallet address required for image upload.");

    const filePath = `${address}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image to Supabase:", error);
      throw new Error(`Failed to upload image ${file.name}: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(filePath);

    if (publicUrlData) {
      return [publicUrlData.publicUrl];
    } else {
      console.warn(`Could not get public URL for ${filePath}`);
      throw new Error(`Could not get public URL for uploaded image.`);
    }
  };

  const getUserId = useCallback(
    async (walletAddress: string): Promise<string> => {
      const { data: userData, error: fetchError } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single(); // Use single() because wallet_address should be unique

      if (fetchError) {
        // If no rows found (PGRST116), or any other error, log and throw
        console.error("Error fetching user ID:", fetchError);
        throw new Error(
          `Failed to fetch user ID for wallet address ${walletAddress}: ${fetchError.message}. Make sure the user exists.`
        );
      }

      if (!userData) {
        // This case should ideally be caught by fetchError above, but as a safeguard
        throw new Error(`User with wallet address ${walletAddress} not found.`);
      }

      return userData.id; // Return the UUID
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setSubmitSuccess(null);

      if (!isConnected || !address) {
        alert("Please connect your wallet to create a post.");
        setIsSubmitting(false);
        return;
      }

      if (
        !formData.title ||
        !formData.description ||
        !formData.category ||
        !formData.location ||
        !formData.pickupDate ||
        !formData.returnDate ||
        formData.images.length === 0
      ) {
        alert(
          "Please fill in all required fields and upload exactly one image."
        );
        setIsSubmitting(false);
        return;
      }

      // Ensure category and subcategory IDs are found
      if (!selectedCategoryId) {
        alert("Invalid category selected. Please try again.");
        setIsSubmitting(false);
        return;
      }
      // Only check subcategory ID if a subcategory was selected (it might be optional)
      if (formData.subCategory && !selectedSubCategoryId) {
        alert("Invalid subcategory selected. Please try again.");
        setIsSubmitting(false);
        return;
      }

      if (new Date(formData.pickupDate) > new Date(formData.returnDate)) {
        alert("Return date cannot be earlier than pickup date.");
        setIsSubmitting(false);
        return;
      }

      try {
        // Step 1: Get the user_id (UUID) based on the wallet address
        // THIS WILL THROW AN ERROR IF THE USER DOES NOT ALREADY EXIST IN YOUR 'users' TABLE!
        const userId = await getUserId(address);
        console.log("Using user ID:", userId);
        // Step 2: Upload image
        const imageUrls = await uploadImagesToSupabase(formData.images);
        console.log("Image uploaded to storage:", imageUrls[0]);

        // Step 3: Insert form data with the obtained user_id (UUID)
        const { data, error } = await supabase
          .from("posts")
          .insert([
            {
              user_id: userId,
              title: formData.title,
              description: formData.description,
              category_id: selectedCategoryId,
              subcategory_id: selectedSubCategoryId || null,
              location: formData.location,
              pickup_date: formData.pickupDate,
              return_date: formData.returnDate,
              image_url: imageUrls[0],
            },
          ])
          .select();

        if (error) {
          console.error("Error inserting post data into Supabase:", error);
          throw new Error(`Failed to create post: ${error.message}`);
        }

        console.log("Post successfully created in Supabase:", data);
        setSubmitSuccess(true);

        // Reset form
        setFormData({
          title: "",
          description: "",
          category: "",
          subCategory: "",
          location: "",
          pickupDate: "",
          returnDate: "",
          images: [],
        });
        setImagePreviews([]);
        setLocationInputValue(""); // Also reset location input
        setLocationSuggestions([]); // Clear suggestions
      } catch (error: any) {
        console.error("Submission error:", error);
        setSubmitSuccess(false);
        alert(
          `Error: ${error.message || "Something went wrong during submission."}`
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formData,
      isConnected,
      address,
      allCategories,
      allSubCategories,
      selectedCategoryId,
      selectedSubCategoryId,
      getUserId,
    ]
  );

  const handleGoBack = () => {
    router.back();
  };

  // --- MODIFIED: Location Search Functionality (uses our new API route) ---
  useEffect(() => {
    const fetchLocationSuggestions = async () => {
      if (debouncedLocationInput.trim() === "") {
        setLocationSuggestions([]);
        setIsSearchingLocation(false);
        setLocationSearchError(null);
        return;
      }

      setIsSearchingLocation(true);
      setLocationSearchError(null);

      try {
        const response = await fetch(
          `/api/places-autocomplete?input=${encodeURIComponent(
            debouncedLocationInput
          )}`
        );
        const data = await response.json();

        if (response.ok) {
          setLocationSuggestions(data.places || []);
        } else {
          console.error("API route error:", data.message);
          // setLocationSearchError(`Error fetching locations: ${data.message}`);
          setLocationSuggestions([]);
        }
      } catch (error: any) {
        console.error("Client-side fetch error:", error);
        setLocationSearchError(
          `Network error: ${error.message || "Could not fetch suggestions."}`
        );
        setLocationSuggestions([]);
      } finally {
        setIsSearchingLocation(false);
      }
    };

    fetchLocationSuggestions();
  }, [debouncedLocationInput]); // Trigger search when debounced input changes

  const handleLocationInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocationInputValue(e.target.value); // Update the input value immediately
    setFormData((prev) => ({ ...prev, location: e.target.value })); // Also update form data for immediate display
  };

  const handleSelectLocation = (suggestion: LocationSuggestion) => {
    setFormData((prev) => ({ ...prev, location: suggestion.address })); // Use full address for form data
    setLocationInputValue(suggestion.address); // Update input field with selected address
    setLocationSuggestions([]); // Hide suggestions after selection
  };
  // --- END: Location Search Functionality ---

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleGoBack} className={styles.backButton}>
            ← Back
          </button>
        </div>
          <h1 className={styles.title}>Create New Rental Post</h1>

        <form onSubmit={handleSubmit} autoComplete="off">
          {isLoadingCategories && <p>Loading categories...</p>}
          {fetchError && (
            <p className={`${styles.transactionStatus} ${styles.transactionStatusError}`}>
              {fetchError}
            </p>
          )}

          {/* Image Upload */}
          <div className={styles.formGroup}>
            <input
              type="file"
              id="images"
              name="images"
              accept="image/*"
              onChange={handleImageUpload}
              required
              style={{ display: "none" }}
            />
            <label htmlFor="images" className={styles.imageLabel}>
              {imagePreviews.length === 0 ? (
                <>
                  <span style={{ fontSize: 32, color: "#bbb" }}>+</span>
                  <span>Upload 1 photo</span>
                </>
              ) : (
                <div className={styles.imagePreviewContainer}>
                  <img
                    src={imagePreviews[0]}
                    alt="Preview"
                    className={styles.imagePreview}
                  />
                </div>
              )}
            </label>
          </div>

          {/* Title */}
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              Title:
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className={styles.input}
              placeholder="e.g., Want to ren aCanon EOS R5 camera"
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description:
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              className={styles.textarea}
              placeholder="Describe the item you want to rent"
            />
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              Category:
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
              required
              className={styles.select}
              disabled={isLoadingCategories}
            >
              <option value="">Select a Category</option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          {formData.category && (
            <div className={styles.formGroup}>
              <label htmlFor="subCategory" className={styles.label}>
                Subcategory:
              </label>
              <select
                id="subCategory"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                required
                className={styles.select}
                disabled={isLoadingCategories || filteredSubCategories.length === 0}
              >
                <option value="">Select a Subcategory</option>
                {filteredSubCategories.map((subCat) => (
                  <option key={subCat.id} value={subCat.name}>
                    {subCat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location Input with Suggestions */}
          <div className={styles.formGroup}>
            <label htmlFor="location" className={styles.label}>
              Location:
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={locationInputValue}
              onChange={handleLocationInputChange}
              required
              className={styles.input}
              placeholder="Search for a city or address"
              autoComplete="off"
            />
            {isSearchingLocation && (
              <p className={styles.suggestionStatus}>Searching...</p>
            )}
            {locationSearchError && (
              <p className={`${styles.suggestionStatus} ${styles.suggestionError}`}>
                {locationSearchError}
              </p>
            )}
            {locationSuggestions.length > 0 && (
              <ul className={styles.locationSuggestions}>
                {locationSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.id}
                    onClick={() => handleSelectLocation(suggestion)}
                    className={styles.locationSuggestionItem}
                  >
                    <strong className={styles.suggestionName}>
                      {suggestion.name}
                    </strong>
                    , {suggestion.address}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pickup Date */}
          <div className={styles.formGroup}>
            <label htmlFor="pickupDate" className={styles.label}>
              Preferred Pickup Date:
            </label>
            <input
              type="date"
              id="pickupDate"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={handleChange}
              required
              className={styles.input}
              min={todayDate}
            />
          </div>

          {/* Return Date */}
          <div className={styles.formGroup}>
            <label htmlFor="returnDate" className={styles.label}>
              Preferred Return Date:
            </label>
            <input
              type="date"
              id="returnDate"
              name="returnDate"
              value={formData.returnDate}
              onChange={handleChange}
              required
              className={styles.input}
              min={formData.pickupDate}
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={!isConnected || isSubmitting || isLoadingCategories}
          >
            {isSubmitting ? "Submitting..." : "Create Post"}
          </button>

          {submitSuccess === true && (
            <div className={`${styles.transactionStatus} ${styles.transactionStatusSuccess}`}>
              Post created successfully!
            </div>
          )}
          {submitSuccess === false && (
            <div className={`${styles.transactionStatus} ${styles.transactionStatusError}`}>
              Failed to create post. Please try again.
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}
