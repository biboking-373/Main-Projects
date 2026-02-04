<script>
  import { onMount } from 'svelte';
  import { link, push } from 'svelte-spa-router';
  import { bookingsAPI } from '../../lib/api.js';
  import Navbar from '../../components/Navbar.svelte';

  const { params } = $props();
  
  let booking = $state(null);
  let loading = $state(true);
  let cancelling = $state(false);

  onMount(async () => {
    await loadBooking();
  });

  async function loadBooking() {
    try {
      loading = true;
      const data = await bookingsAPI.getById(params.id);
      console.log('Loaded booking details:', data);
      // API might return { booking: {...} } or just the booking object
      booking = data?.booking || data;
    } catch (err) {
      console.error('Failed to load booking:', err);
      booking = null;
    } finally {
      loading = false;
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      cancelling = true;
      await bookingsAPI.cancel(params.id);
      alert('Booking cancelled successfully!');
      push('/customer/bookings');
    } catch (err) {
      alert('Failed to cancel booking: ' + (err.response?.data?.message || err.message));
    } finally {
      cancelling = false;
    }
  }

  function handlePrint() {
    window.print();
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function calculateNights() {
    if (!booking) return 0;
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  }

  // Check if booking needs payment
  function needsPayment() {
  if (!booking) return false;
  const status = booking.status?.toLowerCase();
  const paymentStatus = booking.payment_status?.toLowerCase();
  
  // Show pay button only if booking is active and payment is not completed
  const isActiveBooking = status === 'pending' || status === 'confirmed';
  const isPaymentIncomplete = !paymentStatus || paymentStatus !== 'completed';
  
  return isActiveBooking && isPaymentIncomplete;
}
</script>

<Navbar />

<div class="booking-details-page">
  <div class="container">
    <a href="/customer/bookings" use:link class="back-link">← Back to Bookings</a>

    {#if loading}
      <div class="loading">Loading booking details...</div>
    {:else if booking}
      <div class="booking-details">
        <div class="booking-header">
          <div>
            <h1>Booking Details</h1>
            <p class="booking-id">Booking #{booking.id}</p>
          </div>
          <span class="status {booking.status?.toLowerCase()}">
            {booking.status || 'Pending'}
          </span>
        </div>

        <div class="details-grid">
          <div class="detail-card">
            <h3>Room Information</h3>
            <div class="info-item">
              <span class="label">Room Number</span>
              <span class="value">{booking.room_number || booking.room_id}</span>
            </div>
            <div class="info-item">
              <span class="label">Room Type</span>
              <span class="value">{booking.room_type || 'Standard'}</span>
            </div>
            {#if booking.number_of_guests}
              <div class="info-item">
                <span class="label">Guests</span>
                <span class="value">{booking.number_of_guests}</span>
              </div>
            {/if}
            {#if booking.adults !== undefined}
              <div class="info-item">
                <span class="label">Adults</span>
                <span class="value">{booking.adults}</span>
              </div>
            {/if}
            {#if booking.children !== undefined && booking.children > 0}
              <div class="info-item">
                <span class="label">Children</span>
                <span class="value">{booking.children}</span>
              </div>
            {/if}
          </div>

          <div class="detail-card">
            <h3>Stay Details</h3>
            <div class="info-item">
              <span class="label">Check-in</span>
              <span class="value">{formatDate(booking.check_in)}</span>
            </div>
            <div class="info-item">
              <span class="label">Check-out</span>
              <span class="value">{formatDate(booking.check_out)}</span>
            </div>
            <div class="info-item">
              <span class="label">Duration</span>
              <span class="value">{calculateNights()} nights</span>
            </div>
          </div>

          <div class="detail-card">
            <h3>Payment Information</h3>
            <div class="info-item">
              <span class="label">Total Amount</span>
              <span class="value price">${booking.total_price || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="label">Payment Status</span>
              <span class="value payment-status {booking.payment_status?.toLowerCase() || 'pending'}">
                {booking.payment_status || 'Pending'}
              </span>
            </div>
          </div>

          <div class="detail-card">
            <h3>Booking Information</h3>
            <div class="info-item">
              <span class="label">Booked On</span>
              <span class="value">{formatDate(booking.booking_date || booking.created_at)}</span>
            </div>
            <div class="info-item">
              <span class="label">Status</span>
              <span class="value">{booking.status || 'Pending'}</span>
            </div>
          </div>
        </div>

        <div class="actions-section">
          {#if needsPayment()}
            <a href="/customer/payment/{booking.id}" use:link class="btn-pay">
              💳 Pay Now - ${booking.total_price}
            </a>
          {/if}
          
          {#if booking.status === 'Confirmed' || booking.status === 'Pending' || booking.status === 'confirmed' || booking.status === 'pending'}
            <button 
              class="btn-cancel" 
              onclick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </button>
          {/if}
          
          <button class="btn-print" onclick={handlePrint}>Print Details</button>
        </div>
      </div>
    {:else}
      <div class="error">Booking not found</div>
    {/if}
  </div>
</div>

<style>
  .booking-details-page {
    min-height: calc(100vh - 70px);
    background: #f5f7fa;
    padding: 2rem 1rem;
  }
  
  .container {
    max-width: 1000px;
    margin: 0 auto;
  }
  
  .back-link {
    display: inline-block;
    color: #667eea;
    margin-bottom: 2rem;
    font-weight: 600;
    text-decoration: none;
  }

  .back-link:hover {
    text-decoration: underline;
  }
  
  .booking-details {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .booking-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 2px solid #e1e8ed;
  }
  
  .booking-header h1 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
  }
  
  .booking-id {
    margin: 0;
    color: #7f8c8d;
  }
  
  .status {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    text-transform: capitalize;
  }
  
  .status.confirmed {
    background: #d4edda;
    color: #155724;
  }
  
  .status.pending {
    background: #fff3cd;
    color: #856404;
  }
  
  .status.cancelled {
    background: #f8d7da;
    color: #721c24;
  }
  
  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .detail-card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
  }
  
  .detail-card h3 {
    margin: 0 0 1rem 0;
    color: #2c3e50;
    font-size: 1.1rem;
  }
  
  .info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  
  .info-item:last-child {
    margin-bottom: 0;
  }
  
  .label {
    color: #7f8c8d;
    font-size: 0.9rem;
  }
  
  .value {
    color: #2c3e50;
    font-weight: 600;
    text-align: right;
  }
  
  .value.price {
    color: #667eea;
    font-size: 1.5rem;
  }

  .value.payment-status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
    text-transform: capitalize;
  }

  .value.payment-status.pending {
    background: #fff3cd;
    color: #856404;
  }

  .value.payment-status.completed {
    background: #d4edda;
    color: #155724;
  }

  .value.payment-status.failed {
    background: #f8d7da;
    color: #721c24;
  }
  
  .actions-section {
    display: flex;
    gap: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e1e8ed;
  }
  
  .btn-pay {
    flex: 1;
    padding: 0.85rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    background: #27ae60;
    color: white;
    text-decoration: none;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1rem;
  }

  .btn-pay:hover {
    background: #229954;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
  }

  .btn-cancel, .btn-print {
    flex: 1;
    padding: 0.85rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }
  
  .btn-cancel {
    background: #e74c3c;
    color: white;
  }
  
  .btn-cancel:hover:not(:disabled) {
    background: #c0392b;
  }
  
  .btn-cancel:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-print {
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
  }
  
  .btn-print:hover {
    background: #667eea;
    color: white;
  }
  
  .loading, .error {
    text-align: center;
    padding: 3rem;
    color: #7f8c8d;
  }

  .error {
    background: #fff3cd;
    border-radius: 8px;
    color: #856404;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    .details-grid {
      grid-template-columns: 1fr;
    }
    
    .actions-section {
      flex-direction: column;
    }
  }
</style>