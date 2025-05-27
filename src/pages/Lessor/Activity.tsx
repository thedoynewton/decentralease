import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Calendar, MapPin } from '@deemlol/next-icons';
import Layout from '../../../components/Layout';
import styles from '../../styles/LessorActivity.module.css';
import { supabase } from '../../../supabase/supabase-client';

interface Booking {
  id: string;
  listing_id: string;
  listing: {
    title: string;
    image_url: string;
    category: {
      name: string;
    };
  };
  pickup_date: string;
  return_date: string;
  total_amount: string;
  status: 'pending' | 'approved' | 'paid' | 'completed';
  lessee: {
    wallet_address: string;
    name: string;
  };
  transaction_hash?: string;
}

interface DatabaseBooking {
  id: string;
  listing_id: string;
  pickup_date: string;
  return_date: string;
  total_amount: string;
  status: 'pending' | 'approved' | 'paid' | 'completed';
  transaction_hash?: string;
  listings: {
    title: string;
    image_url: string;
    categories: {
      name: string;
    }[];
  }[];
  users: {
    wallet_address: string;
    name: string;
  }[];
}

export default function LessorActivity() {
  const { address, isConnected } = useAccount();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<'pending' | 'approved' | 'paid'>('pending');

  useEffect(() => {
    async function fetchBookings() {
      if (!isConnected || !address) return;

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching with address:', address); // Debug log

        // Get lessor ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address.toLowerCase())
          .single();

        if (userError) {
          console.error('User fetch error:', userError); // Debug log
          throw userError;
        }
        if (!userData) {
          console.error('No user found for address:', address); // Debug log
          throw new Error('User not found');
        }

        console.log('Found user ID:', userData.id); // Debug log

        // First check if the bookings table exists and has the right structure
        const { data: bookingsCheck, error: checkError } = await supabase
          .from('bookings')
          .select('id')
          .limit(1);

        if (checkError) {
          console.error('Bookings table check error:', checkError); // Debug log
          throw new Error('Error accessing bookings table');
        }

        // Fetch bookings with related data
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            listing_id,
            pickup_date,
            return_date,
            total_amount,
            status,
            transaction_hash,
            listings!inner (
              title,
              image_url,
              categories!inner (
                name
              )
            ),
            users!inner (
              wallet_address,
              name
            )
          `)
          .eq('lessor_id', userData.id)
          .eq('status', activeStatus);

        if (bookingsError) {
          console.error('Bookings fetch error:', bookingsError);
          throw bookingsError;
        }

        console.log('Raw bookings data:', bookingsData);

        // Transform the data to match the Booking interface
        const transformedBookings: Booking[] = (bookingsData || []).map((booking: any) => {
          console.log('Processing booking:', booking);
          return {
            id: booking.id,
            listing_id: booking.listing_id,
            pickup_date: booking.pickup_date,
            return_date: booking.return_date,
            total_amount: booking.total_amount,
            status: booking.status,
            transaction_hash: booking.transaction_hash,
            listing: {
              title: booking.listings?.[0]?.title || 'Unknown Listing',
              image_url: booking.listings?.[0]?.image_url || '',
              category: {
                name: booking.listings?.[0]?.categories?.[0]?.name || 'Uncategorized'
              }
            },
            lessee: {
              wallet_address: booking.users?.[0]?.wallet_address || 'Unknown',
              name: booking.users?.[0]?.name || 'Unknown User'
            }
          };
        });

        console.log('Transformed bookings:', transformedBookings);
        setBookings(transformedBookings);

      } catch (err: any) {
        console.error('Error in fetchBookings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [address, isConnected, activeStatus]);

  const handleStatusChange = async (bookingId: string, newStatus: 'approved' | 'paid' | 'completed') => {
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Update local state
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: newStatus }
            : booking
        )
      );

      // If approved, create a message
      if (newStatus === 'approved') {
        const { error: messageError } = await supabase
          .from('messages')
          .insert([{
            booking_id: bookingId,
            sender_id: address,
            content: 'Booking has been approved. Please proceed with payment.',
          }]);

        if (messageError) throw messageError;
      }

    } catch (err: any) {
      console.error('Error:', err.message);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className={styles.loading}>Loading bookings...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.error}>{error}</div>
      </Layout>
    );
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className={styles.error}>Please connect your wallet to view bookings.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Bookings</h1>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeStatus === 'pending' ? styles.activeTab : ''}`}
              onClick={() => setActiveStatus('pending')}
            >
              Pending
            </button>
            <button
              className={`${styles.tab} ${activeStatus === 'approved' ? styles.activeTab : ''}`}
              onClick={() => setActiveStatus('approved')}
            >
              Approved
            </button>
            <button
              className={`${styles.tab} ${activeStatus === 'paid' ? styles.activeTab : ''}`}
              onClick={() => setActiveStatus('paid')}
            >
              Paid
            </button>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className={styles.empty}>No {activeStatus} bookings found.</div>
        ) : (
          <div className={styles.bookingList}>
            {bookings.map((booking) => (
              <div key={booking.id} className={styles.bookingItem}>
                <div className={styles.bookingHeader}>
                  <div className={styles.bookingInfo}>
                    <h3 className={styles.bookingTitle}>{booking.listing.title}</h3>
                    <div className={styles.bookingCategory}>{booking.listing.category.name}</div>
                  </div>
                  <div className={styles.bookingStatus}>
                    {booking.status.toUpperCase()}
                  </div>
                </div>

                {booking.listing.image_url && (
                  <img 
                    src={booking.listing.image_url} 
                    alt={booking.listing.title}
                    className={styles.bookingImage}
                  />
                )}

                <div className={styles.bookingDetails}>
                  <div className={styles.bookingDates}>
                    <Calendar />
                    <span>
                      {new Date(booking.pickup_date).toLocaleDateString()} - {' '}
                      {new Date(booking.return_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.bookingAmount}>
                    Total: {booking.total_amount} ETH
                  </div>
                  <div className={styles.bookingLessee}>
                    Lessee: {booking.lessee.wallet_address}
                  </div>
                </div>

                {booking.status === 'pending' && (
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleStatusChange(booking.id, 'approved')}
                      className={`${styles.actionButton} ${styles.approveButton}`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(booking.id, 'completed')}
                      className={`${styles.actionButton} ${styles.rejectButton}`}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {booking.transaction_hash && (
                  <div className={styles.transactionHash}>
                    Transaction: {booking.transaction_hash}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 