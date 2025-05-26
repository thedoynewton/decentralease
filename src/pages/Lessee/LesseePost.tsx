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
import { useAccount } from "wagmi";
import { useRouter } from "next/router";

// Import the CSS module
import styles from "../../styles/LesseePost.module.css";
import { supabase } from "../../../supabase/supabase-client";

// Define types for fetched data
interface SupabaseCategory {
  id: string; // UUID for ID
  name: string;
}

interface SupabaseSubCategory {
  id: string; // UUID for ID
  name: string;
  category_id: string; // Now explicitly category_id (UUID)
}

interface FormData {
  title: string;
  description: string;
  category: string; // Storing category_name for display and DB insertion
  subCategory: string; // Storing subCategory_name for display and DB insertion
  location: string;
  pickupDate: string;
  returnDate: string;
  images: File[]; // Still an array, but we'll enforce a max length of 1
}

export default function LesseePost() {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    subCategory: "",
    location: "Davao City, Philippines",
    pickupDate: "",
    returnDate: "",
    images: [], // Initialize as an empty array
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

  const router = useRouter();

  const handleGoBack = () => {
    router.back(); // This navigates to the previous page in the browser history
    // Alternatively, to go to a specific page:
    // router.push('/Lessee/Home'); // Or any other path
  };

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

  // --- MODIFIED: Handle Single Image Upload ---
  const handleImageUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]; // Get only the first file
      setFormData((prev) => ({
        ...prev,
        images: [file], // Replace existing images with the new single file
      }));
      // Clear previous previews and set the new one
      setImagePreviews([URL.createObjectURL(file)]);
    } else {
      // If no file is selected (e.g., user cancels dialog)
      setFormData((prev) => ({ ...prev, images: [] }));
      setImagePreviews([]);
    }
  }, []);

  const selectedCategoryId = allCategories.find(
    (cat) => cat.name === formData.category
  )?.id;

  const filteredSubCategories = allSubCategories.filter(
    (subCat) => subCat.category_id === selectedCategoryId
  );

  // --- MODIFIED: Supabase Image Upload (expecting a single file) ---
  const uploadImagesToSupabase = async (files: File[]): Promise<string[]> => {
    // We expect only one file in the array now
    if (files.length === 0) {
      throw new Error("No image file selected for upload.");
    }
    const file = files[0]; // Get the single file

    if (!address) throw new Error("Wallet address required for image upload.");

    const filePath = `${address}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("rental-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image to Supabase:", error);
      throw new Error(`Failed to upload image ${file.name}: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("rental-images")
      .getPublicUrl(filePath);

    if (publicUrlData) {
      return [publicUrlData.publicUrl]; // Return an array with the single URL
    } else {
      console.warn(`Could not get public URL for ${filePath}`);
      throw new Error(`Could not get public URL for uploaded image.`);
    }
  };

  // --- Main Form Submission Logic ---
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

      // Client-side validation: ensure at least one image is uploaded (which will be exactly 1 now)
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

      if (new Date(formData.pickupDate) > new Date(formData.returnDate)) {
        alert("Return date cannot be earlier than pickup date.");
        setIsSubmitting(false);
        return;
      }

      try {
        // 1. Upload Images to Supabase Storage (now handles single image)
        const imageUrls = await uploadImagesToSupabase(formData.images); // This will return [singleUrl]
        console.log("Image uploaded to Supabase:", imageUrls[0]);

        // 2. Insert Post Data into Supabase Database Table
        const { data, error } = await supabase
          .from("posts") // Your actual table name
          .insert([
            {
              owner_address: address,
              title: formData.title,
              description: formData.description,
              category: formData.category,
              sub_category: formData.subCategory,
              location: formData.location,
              pickup_date: formData.pickupDate,
              return_date: formData.returnDate,
              image_urls: imageUrls, // Still stores as an array for flexibility in DB schema
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
          location: "Davao City, Philippines",
          pickupDate: "",
          returnDate: "",
          images: [],
        });
        setImagePreviews([]);
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
    [formData, isConnected, address]
  );

  return (
    <div className={styles.container}>
      <Head>
        <title>Create New Rental Post</title>
        <meta
          name="description"
          content="Create a new post for an asset you want to rent out."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.header}>
        <button onClick={handleGoBack} className={styles.backButton}>
          &larr; Back {/* This is the left arrow HTML entity */}
        </button>
        <h1 className={styles.title}>Create New Rental Post</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {isLoadingCategories && <p>Loading categories...</p>}
        {fetchError && (
          <p
            className={`${styles.transactionStatus} ${styles.transactionStatusError}`}
          >
            {fetchError}
          </p>
        )}

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
            placeholder="e.g., Canon EOS R5 with RF 24-70mm Lens"
          />
        </div>

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
            placeholder="Provide a detailed description of your asset, including condition, features, and any accessories."
          />
        </div>

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
              disabled={
                isLoadingCategories || filteredSubCategories.length === 0
              }
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

        <div className={styles.formGroup}>
          <label htmlFor="location" className={styles.label}>
            Location:
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            className={styles.input}
            placeholder="e.g., Davao City, Philippines"
          />
        </div>

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
          />
        </div>

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
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="images" className={styles.label}>
            Upload Image (Only 1):
          </label>{" "}
          {/* Updated label */}
          <input
            type="file"
            id="images"
            name="images"
            accept="image/*"
            // REMOVED 'multiple' attribute from here
            onChange={handleImageUpload}
            required
            className={styles.input}
          />
          {/* Displaying only one image preview */}
          {imagePreviews.length > 0 && (
            <div className={styles.imagePreviewContainer}>
              <Image
                key={imagePreviews[0]} // Use the URL as key for unique identification
                src={imagePreviews[0]}
                alt={`Uploaded Image`}
                width={100}
                height={100}
                className={styles.imagePreview}
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={!isConnected || isSubmitting || isLoadingCategories}
        >
          {isSubmitting ? "Submitting..." : "Create Post"}
        </button>

        {submitSuccess === true && (
          <div
            className={`${styles.transactionStatus} ${styles.transactionStatusSuccess}`}
          >
            Post created successfully!
          </div>
        )}
        {submitSuccess === false && (
          <div
            className={`${styles.transactionStatus} ${styles.transactionStatusError}`}
          >
            Failed to create post. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}
