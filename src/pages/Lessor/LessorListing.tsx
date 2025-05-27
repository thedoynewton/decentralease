// Remove all isNewPost logic and always treat as "Create Listing"
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import styles from "../../styles/LessorListing.module.css";
import { supabase } from "../../../supabase/supabase-client";
import Layout from "../../../components/LessorLayout";

interface Category {
  id: number;
  name: string;
}
interface Subcategory {
  id: number;
  name: string;
  category_id: number;
}

export default function LessorListing() {
  const router = useRouter();
  const { address } = useAccount();
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    category_id: "",
    subcategory_id: "",
    rental_fee: "",
    security_deposit: "",
    late_return_fee: "",
    conditions: [""],
    description: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchUserId();
  }, [address]);

  const fetchUserId = async () => {
    if (address) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", address)
        .single();
      if (data) setUserId(data.id);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*");
    setCategories(data || []);
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data } = await supabase
      .from("subcategories")
      .select("*")
      .eq("category_id", categoryId);
    setSubcategories(data || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImages([file]);
      setImageUrls([URL.createObjectURL(file)]);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: "",
    }));
    fetchSubcategories(categoryId);
  };

  const handleConditionChange = (index: number, value: string) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = value;
    setFormData((prev) => ({ ...prev, conditions: newConditions }));
  };

  const addCondition = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [...prev.conditions, ""],
    }));
  };

  const removeCondition = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!userId) throw new Error("User not authenticated");
      if (!formData.title) throw new Error("Title is required");
      if (!formData.category_id) throw new Error("Category is required");
      if (!formData.subcategory_id) throw new Error("Subcategory is required");
      if (!formData.rental_fee) throw new Error("Rental fee is required");
      if (!formData.security_deposit) throw new Error("Security deposit is required");
      if (!formData.late_return_fee) throw new Error("Late return fee is required");
      if (!formData.description) throw new Error("Description is required");
      if (formData.conditions.some((c) => !c.trim())) throw new Error("All conditions must be filled out");

      let imageUrl = imageUrls[0];
      if (images.length > 0) imageUrl = await uploadImage(images[0]);
      if (!imageUrl) throw new Error("Please add at least one image");

      const postData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        rental_fee: formData.rental_fee.trim(),
        security_deposit: formData.security_deposit.trim(),
        late_return_fee: formData.late_return_fee.trim(),
        conditions: formData.conditions.filter((c) => c.trim()),
        image_url: imageUrl,
        category_id: parseInt(formData.category_id),
        subcategory_id: parseInt(formData.subcategory_id),
        user_id: userId,
      };

      // Always create a new listing
      const result = await supabase.from("listings").insert([postData]).select().single();
      if (result.error) throw new Error(result.error.message);
      router.push("/Lessor/Home");
    } catch (error: any) {
      alert(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    const { error } = await supabase.storage.from("listing-images").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("listing-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleBack = () => router.back();

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleBack} className={styles.backButton}>
            ← Back
          </button>
        </div>
          <h1 className={styles.title}>Create Listing</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.imageUpload}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              id="image-upload"
              className={styles.imageInput}
            />
            <label htmlFor="image-upload" className={styles.imageLabel}>
              {imageUrls.length === 0 ? (
                <>
                  <div className={styles.addPhotoIcon}>+</div>
                  Add photo
                </>
              ) : (
                <div className={styles.imagePreviewContainer}>
                  <img
                    src={imageUrls[0]}
                    alt="Preview"
                    className={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(0)}
                    className={styles.removeImageButton}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
            </label>
            <p className={styles.imageHelp}>Photo: {imageUrls.length}/1</p>
          </div>

          <input
            type="text"
            placeholder="e.g. Bicycle for rent"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            className={styles.input}
            required
          />

          <textarea
            placeholder="e.g. A well-maintained bicycle available for rent. Perfect for city rides."
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            className={styles.textarea}
            required
          />

          <select
            value={formData.category_id}
            onChange={handleCategoryChange}
            className={styles.select}
            required
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={formData.subcategory_id}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subcategory_id: e.target.value }))
            }
            className={styles.select}
            required
            disabled={!formData.category_id}
          >
            <option value="">Select Subcategory</option>
            {subcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </option>
            ))}
          </select>

          <div className={styles.feeSection}>
            <h3>Fees</h3>
            <input
              type="text"
              placeholder="Rental fee"
              value={formData.rental_fee}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, rental_fee: e.target.value }))
              }
              className={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Security deposit"
              value={formData.security_deposit}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, security_deposit: e.target.value }))
              }
              className={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Late return fee"
              value={formData.late_return_fee}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, late_return_fee: e.target.value }))
              }
              className={styles.input}
              required
            />
          </div>

          <div className={styles.conditionsSection}>
            <h3>Conditions</h3>
            {formData.conditions.map((condition, index) => (
              <div key={index} className={styles.conditionRow}>
                <input
                  type="text"
                  placeholder="Add condition"
                  value={condition}
                  onChange={(e) => handleConditionChange(index, e.target.value)}
                  className={styles.input}
                  required
                />
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addCondition}
              className={styles.addButton}
            >
              Add Condition
            </button>
          </div>         

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Listing"}
          </button>
        </form>
      </div>
    </Layout>
  );
}