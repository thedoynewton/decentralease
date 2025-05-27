import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '../../../components/Layout';
import { supabase } from '../../../supabase/supabase-client';
import styles from '../../styles/ProfileSettings.module.css';

interface UserSettings {
  name: string;
  email: string;
  phone: string;
  location: string;
  notification_email: boolean;
  notification_sms: boolean;
  auto_approve_bookings: boolean;
  availability_weekends: boolean;
  availability_weekdays: boolean;
  minimum_rental_days: number;
}

export default function ProfileSettings() {
  const router = useRouter();
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    location: '',
    notification_email: true,
    notification_sms: true,
    auto_approve_bookings: false,
    availability_weekends: true,
    availability_weekdays: true,
    minimum_rental_days: 1
  });

  useEffect(() => {
    async function fetchSettings() {
      if (!address) return;

      try {
        setLoading(true);
        setError(null);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', address.toLowerCase())
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('User not found');

        setSettings({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          location: userData.location || '',
          notification_email: userData.notification_email ?? true,
          notification_sms: userData.notification_sms ?? true,
          auto_approve_bookings: userData.auto_approve_bookings ?? false,
          availability_weekends: userData.availability_weekends ?? true,
          availability_weekdays: userData.availability_weekdays ?? true,
          minimum_rental_days: userData.minimum_rental_days || 1
        });

      } catch (err: any) {
        console.error('Error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [address]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', address.toLowerCase())
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: settings.name,
          email: settings.email,
          phone: settings.phone,
          location: settings.location,
          notification_email: settings.notification_email,
          notification_sms: settings.notification_sms,
          auto_approve_bookings: settings.auto_approve_bookings,
          availability_weekends: settings.availability_weekends,
          availability_weekdays: settings.availability_weekdays,
          minimum_rental_days: settings.minimum_rental_days
        })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push('/Lessor/Profile');
      }, 2000);

    } catch (err: any) {
      console.error('Error:', err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading settings...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Profile Settings</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Personal Information</h2>
            
            <div className={styles.formGroup}>
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={settings.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={settings.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={settings.location}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Notifications</h2>

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="notification_email"
                  checked={settings.notification_email}
                  onChange={handleChange}
                />
                Receive email notifications
              </label>
            </div>

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="notification_sms"
                  checked={settings.notification_sms}
                  onChange={handleChange}
                />
                Receive SMS notifications
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Booking Preferences</h2>

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="auto_approve_bookings"
                  checked={settings.auto_approve_bookings}
                  onChange={handleChange}
                />
                Auto-approve booking requests
              </label>
            </div>

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="availability_weekends"
                  checked={settings.availability_weekends}
                  onChange={handleChange}
                />
                Available on weekends
              </label>
            </div>

            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  name="availability_weekdays"
                  checked={settings.availability_weekdays}
                  onChange={handleChange}
                />
                Available on weekdays
              </label>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="minimum_rental_days">Minimum Rental Days</label>
              <input
                type="number"
                id="minimum_rental_days"
                name="minimum_rental_days"
                value={settings.minimum_rental_days}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>Settings saved successfully!</div>}

          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  );
} 