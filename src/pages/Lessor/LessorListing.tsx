import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import styles from '../../styles/LessorListing.module.css';
import { supabase } from '../../../supabase/supabase-client';
import Layout from '../../../components/LessorLayout';

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  name: string;
  category_id: number;
}

interface Post {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category_id: number;
  subcategory_id: number;
  rental_fee: string;
  security_deposit: string;
  late_return_fee: string;
  conditions: string[];
  user_id: string;
}

export default function LessorPost() {
  const router = useRouter();
  const { id } = router.query; // Get the id from the URL
  const { address } = useAccount();
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [isNewPost] = useState(() => id === 'new');

  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    subcategory_id: '',
    rental_fee: '',
    security_deposit: '',
    late_return_fee: '',
    conditions: [''],
    description: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchUserId();
  }, [address]);

  // Fetch existing post data if editing
  useEffect(() => {
    if (!isNewPost && id) {
      fetchPost();
    }
  }, [id, isNewPost]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title,
          category_id: data.category_id.toString(),
          subcategory_id: data.subcategory_id.toString(),
          rental_fee: data.rental_fee,
          security_deposit: data.security_deposit,
          late_return_fee: data.late_return_fee,
          conditions: data.conditions,
          description: data.description,
        });
        if (data.image_url) {
          setImageUrls([data.image_url]);
        }
        // Fetch subcategories for the selected category
        fetchSubcategories(data.category_id.toString());
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const fetchUserId = async () => {
    if (address) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address)
        .single();

      if (data) {
        setUserId(data.id);
      }
    }
  };

  const fetchCategories = async () => {
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*');
    setCategories(categoriesData || []);
  };

  const fetchSubcategories = async (categoryId: string) => {
    const { data: subcategoriesData } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoryId);
    setSubcategories(subcategoriesData || []);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Only take the first file
      const file = e.target.files[0];
      setImages([file]);
      
      // Create preview URL for the single image
      const url = URL.createObjectURL(file);
      setImageUrls([url]);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    setFormData(prev => ({ ...prev, category_id: categoryId, subcategory_id: '' }));
    fetchSubcategories(categoryId);
  };

  const handleConditionChange = (index: number, value: string) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = value;
    setFormData(prev => ({ ...prev, conditions: newConditions }));
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, '']
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Debug log current state
      console.log('Current form data:', formData);
      console.log('Current user ID:', userId);

      // Validate required fields
      if (!formData.title) throw new Error('Title is required');
      if (!formData.category_id) throw new Error('Category is required');
      if (!formData.subcategory_id) throw new Error('Subcategory is required');
      if (!formData.rental_fee) throw new Error('Rental fee is required');
      if (!formData.security_deposit) throw new Error('Security deposit is required');
      if (!formData.late_return_fee) throw new Error('Late return fee is required');
      if (!formData.description) throw new Error('Description is required');
      if (formData.conditions.some(condition => !condition.trim())) {
        throw new Error('All conditions must be filled out');
      }

      let imageUrl = imageUrls[0];
      
      // Upload new image if selected
      if (images.length > 0) {
        imageUrl = await uploadImage(images[0]);
      }

      if (!imageUrl) {
        throw new Error('Please add at least one image');
      }

      // Format data to match database schema exactly
      const postData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        rental_fee: formData.rental_fee.trim(),
        security_deposit: formData.security_deposit.trim(),
        late_return_fee: formData.late_return_fee.trim(),
        conditions: formData.conditions.filter(c => c.trim()),
        image_url: imageUrl,
        category_id: parseInt(formData.category_id),
        subcategory_id: parseInt(formData.subcategory_id),
        user_id: userId
      };

      // Debug log the final data being sent
      console.log('Final data being sent to database:', postData);

      let result;
      if (isNewPost) {
        // Create new listing
        result = await supabase
          .from('listings')
          .insert([postData])
          .select()
          .single();
      } else {
        // Update existing listing
        result = await supabase
          .from('listings')
          .update(postData)
          .eq('id', id)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Supabase Error:', result.error);
        console.error('Error Code:', result.error.code);
        console.error('Error Message:', result.error.message);
        console.error('Error Details:', result.error.details);
        throw new Error(result.error.message);
      }

      console.log('Success! Created/Updated listing:', result.data);
      router.push('/Lessor/Home');
    } catch (error) {
      console.error('Full error object:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        alert(error.message);
      } else {
        console.error('Unknown error type:', error);
        alert('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('listings')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('listings')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleBack = () => {
    router.back();
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button onClick={handleBack} className={styles.backButton}>
            ← Back
          </button>
          <h1>{isNewPost ? 'Create Listing' : 'Edit Listing'}</h1>
        </div>

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
                <div className={styles.imagePreviewGrid}>
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
                </div>
              )}
            </label>
            <p className={styles.imageHelp}>Photo: {imageUrls.length}/1</p>
          </div>

          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={styles.input}
            required
          />

          <select
            value={formData.category_id}
            onChange={handleCategoryChange}
            className={styles.select}
            required
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={formData.subcategory_id}
            onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
            className={styles.select}
            required
            disabled={!formData.category_id}
          >
            <option value="">Select Subcategory</option>
            {subcategories.map(subcategory => (
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
              onChange={(e) => setFormData(prev => ({ ...prev, rental_fee: e.target.value }))}
              className={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Security deposit"
              value={formData.security_deposit}
              onChange={(e) => setFormData(prev => ({ ...prev, security_deposit: e.target.value }))}
              className={styles.input}
              required
            />
            <input
              type="text"
              placeholder="Late return fee"
              value={formData.late_return_fee}
              onChange={(e) => setFormData(prev => ({ ...prev, late_return_fee: e.target.value }))}
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

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={styles.textarea}
            required
          />

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (isNewPost ? 'Creating...' : 'Updating...') : (isNewPost ? 'Create Listing' : 'Update Listing')}
          </button>
        </form>
      </div>
    </Layout>
  );
}
