import { useState, useCallback, ChangeEvent, FormEvent, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';

// Import the CSS module
import styles from '../../styles/LessorPost.module.css';
import { supabase } from '../../../supabase/supabase-client';

// Add a debounce utility function
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
  dailyRate: number;
  availableFrom: string;
  availableTo: string;
  images: File[];
  condition: string;
  securityDeposit: number;
}

interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
}

export default function LessorPost() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    subCategory: '',
    location: '',
    dailyRate: 0,
    availableFrom: '',
    availableTo: '',
    images: [],
    condition: '',
    securityDeposit: 0,
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);

  const [allCategories, setAllCategories] = useState<SupabaseCategory[]>([]);
  const [allSubCategories, setAllSubCategories] = useState<SupabaseSubCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // State for location search
  const [locationInputValue, setLocationInputValue] = useState(formData.location);
  const debouncedLocationInput = useDebounce(locationInputValue, 500);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<string | null>(null);

  const getTodayDateString = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayDate = getTodayDateString();

  // Fetch Categories and Subcategories on component mount
  useEffect(() => {
    async function fetchCategoriesAndSubcategories() {
      setIsLoadingCategories(true);
      setFetchError(null);
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name');

        if (categoriesError) throw categoriesError;
        setAllCategories(categoriesData || []);

        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('subcategories')
          .select('id, name, category_id');

        if (subcategoriesError) throw subcategoriesError;
        setAllSubCategories(subcategoriesData || []);

      } catch (error: any) {
        console.error('Error fetching categories or subcategories:', error.message);
        setFetchError(`Failed to load categories: ${error.message}`);
      } finally {
        setIsLoadingCategories(false);
      }
    }

    fetchCategoriesAndSubcategories();
  }, []);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCategoryChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const selectedCategoryName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category: selectedCategoryName,
      subCategory: '',
    }));
  }, []);

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
    (subCat) => subCat.name === formData.subCategory && subCat.category_id === selectedCategoryId
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
      .from('post-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image to Supabase:', error);
      throw new Error(`Failed to upload image ${file.name}: ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(filePath);

    if (publicUrlData) {
      return [publicUrlData.publicUrl];
    } else {
      console.warn(`Could not get public URL for ${filePath}`);
      throw new Error(`Could not get public URL for uploaded image.`);
    }
  };

  const getUserId = useCallback(async (walletAddress: string): Promise<string> => {
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (fetchError) {
      console.error('Error fetching user ID:', fetchError);
      throw new Error(`Failed to fetch user ID for wallet address ${walletAddress}: ${fetchError.message}. Make sure the user exists.`);
    }

    if (!userData) {
      throw new Error(`User with wallet address ${walletAddress} not found.`);
    }

    return userData.id;
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(null);

    if (!isConnected || !address) {
      alert('Please connect your wallet to create a listing.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.title || !formData.description || !formData.category || !formData.location ||
      !formData.availableFrom || !formData.availableTo || formData.images.length === 0 ||
      !formData.dailyRate || !formData.condition || !formData.securityDeposit) {
      alert('Please fill in all required fields and upload exactly one image.');
      setIsSubmitting(false);
      return;
    }

    if (!selectedCategoryId) {
      alert('Invalid category selected. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (formData.subCategory && !selectedSubCategoryId) {
      alert('Invalid subcategory selected. Please try again.');
      setIsSubmitting(false);
      return;
    }

    if (new Date(formData.availableFrom) > new Date(formData.availableTo)) {
      alert('Available To date cannot be earlier than Available From date.');
      setIsSubmitting(false);
      return;
    }

    try {
      const userId = await getUserId(address);
      console.log('Using user ID:', userId);
      
      const imageUrls = await uploadImagesToSupabase(formData.images);
      console.log('Image uploaded to storage:', imageUrls[0]);

      const { data, error } = await supabase
        .from('listings')
        .insert([
          {
            user_id: userId,
            title: formData.title,
            description: formData.description,
            category_id: selectedCategoryId,
            subcategory_id: selectedSubCategoryId || null,
            location: formData.location,
            daily_rate: formData.dailyRate,
            available_from: formData.availableFrom,
            available_to: formData.availableTo,
            image_url: imageUrls[0],
            condition: formData.condition,
            security_deposit: formData.securityDeposit,
          },
        ])
        .select();

      if (error) {
        console.error('Error inserting listing data into Supabase:', error);
        throw new Error(`Failed to create listing: ${error.message}`);
      }

      console.log('Listing successfully created in Supabase:', data);
      setSubmitSuccess(true);

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        subCategory: '',
        location: '',
        dailyRate: 0,
        availableFrom: '',
        availableTo: '',
        images: [],
        condition: '',
        securityDeposit: 0,
      });
      setImagePreviews([]);
      setLocationInputValue('');
      setLocationSuggestions([]);

      router.push('/Lessor/Home');

    } catch (error: any) {
      console.error('Submission error:', error);
      setSubmitSuccess(false);
      alert(`Error: ${error.message || 'Something went wrong during submission.'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [address, formData, isConnected, selectedCategoryId, selectedSubCategoryId, getUserId, router]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Listing | DeCentralease</title>
      </Head>

      <form onSubmit={handleSubmit} className={styles.form}>
        <h1 className={styles.title}>Create New Listing</h1>

        {isLoadingCategories && <p>Loading categories...</p>}
        {fetchError && <p className={styles.error}>{fetchError}</p>}

        <div className={styles.formGroup}>
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., Professional DSLR Camera with Lenses"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Provide a detailed description of your item"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleCategoryChange}
            required
            disabled={isLoadingCategories}
          >
            <option value="">Select a Category</option>
            {allCategories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {selectedCategoryId && (
          <div className={styles.formGroup}>
            <label htmlFor="subCategory">Subcategory</label>
            <select
              id="subCategory"
              name="subCategory"
              value={formData.subCategory}
              onChange={handleChange}
              required
            >
              <option value="">Select a Subcategory</option>
              {filteredSubCategories.map((subCat) => (
                <option key={subCat.id} value={subCat.name}>{subCat.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            placeholder="Enter your location"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="dailyRate">Daily Rate (ETH)</label>
          <input
            type="number"
            id="dailyRate"
            name="dailyRate"
            value={formData.dailyRate}
            onChange={handleChange}
            required
            step="0.001"
            min="0"
            placeholder="0.00"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="securityDeposit">Security Deposit (ETH)</label>
          <input
            type="number"
            id="securityDeposit"
            name="securityDeposit"
            value={formData.securityDeposit}
            onChange={handleChange}
            required
            step="0.001"
            min="0"
            placeholder="0.00"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="condition">Item Condition</label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            required
          >
            <option value="">Select Condition</option>
            <option value="New">New</option>
            <option value="Like New">Like New</option>
            <option value="Very Good">Very Good</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="availableFrom">Available From</label>
          <input
            type="date"
            id="availableFrom"
            name="availableFrom"
            value={formData.availableFrom}
            onChange={handleChange}
            required
            min={todayDate}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="availableTo">Available To</label>
          <input
            type="date"
            id="availableTo"
            name="availableTo"
            value={formData.availableTo}
            onChange={handleChange}
            required
            min={formData.availableFrom}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="images">Upload Image</label>
          <input
            type="file"
            id="images"
            name="images"
            accept="image/*"
            onChange={handleImageUpload}
            required
          />
          {imagePreviews.length > 0 && (
            <div className={styles.imagePreview}>
              <Image
                src={imagePreviews[0]}
                alt="Preview"
                width={200}
                height={200}
                objectFit="cover"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={!isConnected || isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Listing'}
        </button>

        {submitSuccess === true && (
          <p className={styles.success}>Listing created successfully!</p>
        )}
        {submitSuccess === false && (
          <p className={styles.error}>Failed to create listing. Please try again.</p>
        )}
      </form>
    </div>
  );
} 