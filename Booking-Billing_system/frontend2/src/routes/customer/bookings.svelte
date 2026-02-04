<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { bookingsAPI } from '../../lib/api.js';
  import Navbar from '../../components/Navbar.svelte';

  let bookings = $state([]);
  let loading = $state(true);
  let filter = $state('all');

  onMount(async () => {
    await loadBookings();
  });

  async function loadBookings() {
    try {
      loading = true;
      const data = await bookingsAPI.getMyBookings();
      console.log('Loaded bookings:', data);
      // API returns { bookings: [...], count: N }
      bookings = data?.bookings || [];
    } catch (err) {
      console.error('Failed to load bookings:', err);
      bookings = [];
    } finally {
      loading = false;
    }
  }

  let filteredBookings = $derived(
    Array.isArray(bookings) 
      ? bookings.filter(booking => {
          if (filter === 'all') return true;
          if (filter === 'upcoming') {
            return new Date(booking.check_in) > new Date();
          }
          if (filter === 'past') {
            return new Date(booking.check_out) < new Date();
          }
          return booking.status?.toLowerCase() === filter;
        })
      : []
  );

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<Navbar />

<div class="bookings-page">
  <div class="container">
    <div class="page-header">
      <h1>My Bookings</h1>
      <p>View and manage all your reservations</p>
    </div>

    <div class="filters">
      <button 
        class="filter-btn {filter === 'all' ? 'active' : ''}" 
        onclick={() => filter = 'all'}
      >
        All
      </button>
      <button 
        class="filter-btn {filter === 'upcoming' ? 'active' : ''}" 
        onclick={() => filter = 'upcoming'}
      >
        Upcoming
      </button>
      <button 
        class="filter-btn {filter === 'confirmed' ? 'active' : ''}" 
        onclick={() => filter = 'confirmed'}
      >
        Confirmed
      </button>
      <button 
        class="filter-btn {filter === 'pending' ? 'active' : ''}" 
        onclick={() => filter = 'pending'}
      >
        Pending
      </button>
      <button 
        class="filter-btn {filter === 'past' ? 'active' : ''}" 
        onclick={() => filter = 'past'}
      >
        Past
      </button>
    </div>

    {#if loading}
      <div class="loading">Loading bookings...</div>
    {:else if filteredBookings.length > 0}
      <div class="bookings-grid">
        {#each filteredBookings as booking}
          <div class="booking-card">
            <div class="booking-header">
              <h3>Room {booking.room_number || booking.room_id}</h3>
              <span class="status {booking.status?.toLowerCase()}">
                {booking.status || 'Pending'}
              </span>
            </div>
            
            <div class="booking-details">
              <div class="detail-row">
                <span class="label">Check-in:</span>
                <span class="value">{formatDate(booking.check_in)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Check-out:</span>
                <span class="value">{formatDate(booking.check_out)}</span>
              </div>
              <div class="detail-row">
                <span class="label">Guests:</span>
                <span class="value">{booking.number_of_guests || 1}</span>
              </div>
              <div class="detail-row">
                <span class="label">Total:</span>
                <span class="value price">${booking.total_price || 'N/A'}</span>
              </div>
            </div>

            <div class="booking-actions">
              <a href="/customer/bookings/{booking.id}" use:link class="btn-view">
                View Details
              </a>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No bookings found</h3>
        <p>You don't have any {filter !== 'all' ? filter : ''} bookings yet</p>
        <a href="/customer/rooms" use:link class="btn-primary">Browse Rooms</a>
      </div>
    {/if}
  </div>
</div>

<style>
  .bookings-page {
    min-height: calc(100vh - 70px);
    background: #f5f7fa;
    padding: 2rem 1rem;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .page-header {
    margin-bottom: 2rem;
  }
  
  .page-header h1 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
  
  .page-header p {
    color: #7f8c8d;
    margin: 0;
  }
  
  .filters {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  
  .filter-btn {
    padding: 0.5rem 1.25rem;
    border: 2px solid #e1e8ed;
    background: white;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 600;
    color: #7f8c8d;
    transition: all 0.2s;
  }
  
  .filter-btn:hover {
    border-color: #667eea;
    color: #667eea;
  }
  
  .filter-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
  }
  
  .bookings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }
  
  .booking-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: transform 0.2s;
  }
  
  .booking-card:hover {
    transform: translateY(-5px);
  }
  
  .booking-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .booking-header h3 {
    margin: 0;
    color: #2c3e50;
  }
  
  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.85rem;
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
  
  .booking-details {
    margin-bottom: 1rem;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .label {
    color: #7f8c8d;
    font-size: 0.9rem;
  }
  
  .value {
    color: #2c3e50;
    font-weight: 600;
  }
  
  .value.price {
    color: #667eea;
    font-size: 1.25rem;
  }
  
  .booking-actions {
    padding-top: 1rem;
    border-top: 1px solid #e1e8ed;
  }
  
  .btn-view {
    display: block;
    text-align: center;
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 6px;
    font-weight: 600;
    transition: transform 0.2s;
    text-decoration: none;
  }
  
  .btn-view:hover {
    transform: translateY(-2px);
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 12px;
  }
  
  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .empty-state h3 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }
  
  .empty-state p {
    color: #7f8c8d;
    margin-bottom: 1.5rem;
  }
  
  .btn-primary {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 6px;
    font-weight: 600;
    text-decoration: none;
  }
  
  .loading {
    text-align: center;
    padding: 3rem;
    color: #7f8c8d;
  }
</style>