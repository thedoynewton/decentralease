import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../../supabase/supabase-client';
import Layout from '../../../components/Layout';
import styles from '../../styles/Activity.module.css';

interface Booking {
  id: string;
  listing_title: string;
  pickup_date: string;
  return_date: string;
  total_amount: string;
  status: string;
  lessee_name: string;
  lessee_wallet_address: string;
  image_url: string | null;
  category_name: string;
  transaction_hash?: string;
}

export default function Activity() {
  const { address } = useAccount();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Paid'>('Pending');

  useEffect(() => {
    async function fetchBookings() {
      if (!address) return;

      try {
        setLoading(true);
        
        // Get user ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address.toLowerCase())
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('User not found');

        // Get bookings with listing and lessee details
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            listings!inner(
              title,
              image_url,
              categories(name)
            ),
            users!bookings_lessee_id_fkey(
              name,
              wallet_address
            )
          `)
          .eq('listings.user_id', userData.id)
          .eq('status', activeTab.toLowerCase())
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedBookings = data?.map(booking => ({
          id: booking.id,
          listing_title: booking.listings.title,
          pickup_date: booking.pickup_date,
          return_date: booking.return_date,
          total_amount: booking.total_amount,
          status: booking.status,
          lessee_name: booking.users.name,
          lessee_wallet_address: booking.users.wallet_address,
          image_url: booking.listings.image_url,
          category_name: booking.listings.categories.name,
          transaction_hash: booking.transaction_hash
        }));

        setBookings(formattedBookings || []);
      } catch (error: any) {
        console.error('Error fetching bookings:', error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [address, activeTab]);

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.title}>Activity</h1>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'Pending' ? styles.active : ''}`}
            onClick={() => setActiveTab('Pending')}
          >
            Pending
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'Approved' ? styles.active : ''}`}
            onClick={() => setActiveTab('Approved')}
          >
            Approved
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'Paid' ? styles.active : ''}`}
            onClick={() => setActiveTab('Paid')}
          >
            Paid
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className={styles.empty}>
            No {activeTab.toLowerCase()} bookings found
          </div>
        ) : (
          <div className={styles.bookingsList}>
            {bookings.map((booking) => (
              <div key={booking.id} className={styles.bookingCard}>
                {booking.image_url && (
                  <img
                    src={booking.image_url}
                    alt={booking.listing_title}
                    className={styles.bookingImage}
                  />
                )}
                <div className={styles.bookingInfo}>
                  <h3 className={styles.bookingTitle}>{booking.listing_title}</h3>
                  <p className={styles.bookingCategory}>{booking.category_name}</p>
                  <div className={styles.bookingDates}>
                    <span>From: {new Date(booking.pickup_date).toLocaleDateString()}</span>
                    <span>To: {new Date(booking.return_date).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.bookingAmount}>
                    Total Amount: {booking.total_amount} ETH
                  </div>
                  <div className={styles.lesseInfo}>
                    <p>Lessee: {booking.lessee_name}</p>
                    <p className={styles.lesseeWallet}>
                      Wallet: {booking.lessee_wallet_address.slice(0, 6)}...
                      {booking.lessee_wallet_address.slice(-4)}
                    </p>
                  </div>
                  {booking.transaction_hash && (
                    <div className={styles.transactionHash}>
                      Tx: {booking.transaction_hash.slice(0, 6)}...
                      {booking.transaction_hash.slice(-4)}
                    </div>
                  )}
                  <div className={`${styles.status} ${styles[booking.status.toLowerCase()]}`}>
                    {booking.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 