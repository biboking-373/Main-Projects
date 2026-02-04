<script>
  import { onMount } from 'svelte';
  import { adminBookingsAPI } from '../../lib/adminAPI';
  import AdminNavbar from '../../components/Admin-Navbar.svelte';

  let bookings = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let statusFilter = '';
  let currentPage = 1;
  let totalPages = 1;
  let showDetailModal = false;
  let selectedBooking = null;
  let newStatus = '';

  const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];

  onMount(async () => {
    await loadBookings();
  });

  async function loadBookings() {
    try {
      loading = true;
      error = null;
      const response = await adminBookingsAPI.getAll({
        page: currentPage,
        limit: 20,
        search: searchQuery,
        status: statusFilter
      });
      
      // Handle response structure - backend returns { data: [...], totalPages: ... }
      bookings = response.data || response.bookings || [];
      totalPages = response.totalPages || 1;
      
      console.log('Loaded bookings:', bookings.length);
    } catch (err) {
      console.error('Error loading bookings:', err);
      error = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load bookings';
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    currentPage = 1;
    await loadBookings();
  }

  async function handleStatusFilter() {
    currentPage = 1;
    await loadBookings();
  }

  function handlePageChange(page) {
    currentPage = page;
    loadBookings();
  }

  async function openDetailModal(booking) {
    selectedBooking = booking;
    newStatus = booking.booking_status;
    showDetailModal = true;
  }

  function closeDetailModal() {
    showDetailModal = false;
    selectedBooking = null;
  }

  async function updateBookingStatus() {
    if (!selectedBooking || !newStatus) return;

    try {
      error = null;
      await adminBookingsAPI.updateStatus(selectedBooking.id, newStatus);
      closeDetailModal();
      await loadBookings();
    } catch (err) {
      console.error('Error updating booking status:', err);
      error = err.response?.data?.message || 'Failed to update booking status';
    }
  }

  async function deleteBooking(id) {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      error = null;
      await adminBookingsAPI.delete(id);
      await loadBookings();
    } catch (err) {
      console.error('Error deleting booking:', err);
      error = err.response?.data?.message || 'Failed to delete booking';
    }
  }

  function getStatusColor(status) {
    return `status-${status}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  }

  function calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
</script>

<AdminNavbar />

<div class="container">
  <div class="header">
    <h1>Bookings Management</h1>
    <p>Manage all hotel bookings</p>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters-card">
    <div class="filters-grid">
      <div class="search-input-wrapper">
        <input
          type="text"
          bind:value={searchQuery}
          on:keypress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by customer name, room number..."
          class="input-field"
        />
      </div>
      <div>
        <select
          bind:value={statusFilter}
          on:change={handleStatusFilter}
          class="select-field"
        >
          <option value="">All Statuses</option>
          {#each statuses as status}
            <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="search-button-wrapper">
      <button on:click={handleSearch} class="btn-search">
        Search
      </button>
    </div>
  </div>

  <!-- Bookings Table -->
  <div class="table-card">
    {#if loading}
      <div class="loading-container">
        <div class="spinner"></div>
      </div>
    {:else if bookings.length === 0}
      <div class="empty-state">
        <p>No bookings found</p>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="bookings-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Room</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total</th>
              <th>Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each bookings as booking}
              <tr on:click={() => openDetailModal(booking)}>
                <td class="booking-id">#{booking.id}</td>
                <td>
                  <div class="customer-name">{booking.user_name || 'N/A'}</div>
                  <div class="customer-email">{booking.user_email || ''}</div>
                </td>
                <td>Room {booking.room_number || booking.room_id}</td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{formatDate(booking.check_out_date)}</td>
                <td class="total-price">{formatCurrency(booking.total_price)}</td>
                <td>
                  <span class="status-badge {getStatusColor(booking.booking_status)}">
                    {booking.booking_status}
                  </span>
                </td>
                <td class="actions-cell">
                  <button
                    on:click|stopPropagation={() => openDetailModal(booking)}
                    class="btn-view"
                  >
                    View
                  </button>
                  <button
                    on:click|stopPropagation={() => deleteBooking(booking.id)}
                    class="btn-delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <div class="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          <div class="pagination-buttons">
            <button
              on:click={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              class="btn-pagination"
            >
              Previous
            </button>
            <button
              on:click={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              class="btn-pagination"
            >
              Next
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Detail Modal -->
{#if showDetailModal && selectedBooking}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Booking Details</h2>
          <p class="modal-subtitle">Booking ID: #{selectedBooking.id}</p>
        </div>
        <button on:click={closeDetailModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Customer Information -->
        <div class="info-section">
          <h3>Customer Information</h3>
          <div class="info-grid">
            <div>
              <p class="info-label">Name</p>
              <p class="info-value">{selectedBooking.user_name || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">Email</p>
              <p class="info-value">{selectedBooking.user_email || 'N/A'}</p>
            </div>
          </div>
        </div>

        <!-- Booking Information -->
        <div class="info-section">
          <h3>Booking Information</h3>
          <div class="info-grid">
            <div>
              <p class="info-label">Room Number</p>
              <p class="info-value">Room {selectedBooking.room_number || selectedBooking.room_id}</p>
            </div>
            <div>
              <p class="info-label">Number of Guests</p>
              <p class="info-value">{selectedBooking.number_of_guests || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">Check In</p>
              <p class="info-value">{formatDate(selectedBooking.check_in_date)}</p>
            </div>
            <div>
              <p class="info-label">Check Out</p>
              <p class="info-value">{formatDate(selectedBooking.check_out_date)}</p>
            </div>
            <div>
              <p class="info-label">Number of Nights</p>
              <p class="info-value">
                {calculateNights(selectedBooking.check_in_date, selectedBooking.check_out_date)}
              </p>
            </div>
            <div>
              <p class="info-label">Total Price</p>
              <p class="info-value">{formatCurrency(selectedBooking.total_price)}</p>
            </div>
          </div>
        </div>

        <!-- Special Requests -->
        {#if selectedBooking.special_requests}
          <div class="info-section">
            <h3>Special Requests</h3>
            <p class="special-requests">{selectedBooking.special_requests}</p>
          </div>
        {/if}

        <!-- Status Update -->
        <div class="info-section">
          <h3>Update Status</h3>
          <div class="status-update">
            <select bind:value={newStatus} class="select-field">
              {#each statuses as status}
                <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              {/each}
            </select>
            <button on:click={updateBookingStatus} class="btn-update">
              Update
            </button>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="timestamps">
          <div class="timestamp-grid">
            <div>
              <p>Created: {formatDate(selectedBooking.created_at)}</p>
            </div>
            {#if selectedBooking.updated_at}
              <div>
                <p>Updated: {formatDate(selectedBooking.updated_at)}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button on:click={closeDetailModal} class="btn-modal-close">
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Container & Layout */
  .container {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.25rem 0;
  }

  .header p {
    color: #6b7280;
    margin: 0;
  }

  /* Error Message */
  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  /* Filters Card */
  .filters-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .filters-grid {
      grid-template-columns: 2fr 1fr;
    }
  }

  .search-input-wrapper {
    grid-column: span 1;
  }

  @media (min-width: 768px) {
    .search-input-wrapper {
      grid-column: span 2;
    }
  }

  .input-field,
  .select-field {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .input-field:focus,
  .select-field:focus {
    border-color: #3b82f6;
    ring: 2px;
    ring-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-button-wrapper {
    margin-top: 1rem;
  }

  .btn-search {
    background-color: #3b82f6;
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-search:hover {
    background-color: #2563eb;
  }

  /* Table Card */
  .table-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 16rem;
  }

  .spinner {
    width: 3rem;
    height: 3rem;
    border: 2px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .bookings-table {
    min-width: 100%;
    border-collapse: collapse;
  }

  .bookings-table thead {
    background-color: #f9fafb;
  }

  .bookings-table th {
    padding: 0.75rem 1.5rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .actions-header {
    text-align: right;
  }

  .bookings-table tbody {
    background: white;
    divide-y: 1px solid #e5e7eb;
  }

  .bookings-table tbody tr {
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .bookings-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .bookings-table td {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    color: #111827;
    white-space: nowrap;
  }

  .booking-id {
    font-weight: 500;
  }

  .customer-name {
    font-weight: 500;
    color: #111827;
  }

  .customer-email {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .total-price {
    font-weight: 500;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 9999px;
  }

  .status-pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-confirmed {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-cancelled {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-completed {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .actions-cell {
    text-align: right;
    font-weight: 500;
  }

  .btn-view,
  .btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
  }

  .btn-view {
    color: #3b82f6;
    margin-right: 0.75rem;
  }

  .btn-view:hover {
    color: #1e40af;
  }

  .btn-delete {
    color: #ef4444;
  }

  .btn-delete:hover {
    color: #991b1b;
  }

  /* Pagination */
  .pagination {
    background: white;
    padding: 0.75rem 1.5rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination-info {
    font-size: 0.875rem;
    color: #374151;
  }

  .pagination-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-pagination {
    padding: 0.25rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .btn-pagination:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  .btn-pagination:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 50;
  }

  .modal-content {
    background: white;
    border-radius: 0.5rem;
    max-width: 42rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .modal-subtitle {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .btn-close {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s;
  }

  .btn-close:hover {
    color: #4b5563;
  }

  .close-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .info-section {
    margin-bottom: 1.5rem;
  }

  .info-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.75rem 0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .info-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 0.25rem 0;
  }

  .info-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
    margin: 0;
  }

  .special-requests {
    font-size: 0.875rem;
    color: #374151;
    margin: 0;
  }

  .status-update {
    display: flex;
    gap: 0.75rem;
  }

  .status-update .select-field {
    flex: 1;
  }

  .btn-update {
    padding: 0.5rem 1.5rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-update:hover {
    background-color: #2563eb;
  }

  .timestamps {
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .timestamp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
  }

  .btn-modal-close {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    color: #374151;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .btn-modal-close:hover {
    background-color: #f9fafb;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .timestamp-grid {
      grid-template-columns: 1fr;
    }
  }
</style>