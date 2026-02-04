<script>
  import { onMount } from 'svelte';
  import { employeePaymentsAPI, employeeBookingsAPI } from '../../lib/employeeAPI';
  import EmployeeNavbar from '../../components/Employee-Navbar.svelte';

  let payments = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let statusFilter = '';
  let currentPage = 1;
  let totalPages = 1;
  let showDetailModal = false;
  let showCashPaymentModal = false;
  let selectedPayment = null;
  let newStatus = '';
  let recentBookings = [];
  
  let cashPaymentForm = {
    booking_id: '',
    amount: '',
    payment_method: 'cash',
    mpesa_receipt_number: ''
  };

  const statuses = ['pending', 'completed', 'failed', 'refunded'];
  const paymentMethods = ['cash', 'mpesa', 'credit_card', 'bank_transfer'];

  onMount(async () => {
    await loadPayments();
    await loadRecentBookings();
  });

  async function loadRecentBookings() {
    try {
      const response = await employeeBookingsAPI.getAll({
        page: 1,
        limit: 50,
        status: 'confirmed'
      });
      recentBookings = response.data || [];
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  }

  async function loadPayments() {
    try {
      loading = true;
      error = null;
      const response = await employeePaymentsAPI.getAll({
        page: currentPage,
        limit: 20,
        search: searchQuery,
        payment_status: statusFilter
      });
      payments = response.data || [];
      totalPages = response.totalPages || 1;
    } catch (err) {
      console.error('Error loading payments:', err);
      error = err.response?.data?.message || 'Failed to load payments';
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    currentPage = 1;
    await loadPayments();
  }

  async function handleStatusFilter() {
    currentPage = 1;
    await loadPayments();
  }

  function handlePageChange(page) {
    currentPage = page;
    loadPayments();
  }

  async function openDetailModal(payment) {
    selectedPayment = payment;
    newStatus = payment.payment_status;
    showDetailModal = true;
  }

  function closeDetailModal() {
    showDetailModal = false;
    selectedPayment = null;
  }

  function openCashPaymentModal() {
    cashPaymentForm = {
      booking_id: '',
      amount: '',
      payment_method: 'cash',
      mpesa_receipt_number: ''
    };
    showCashPaymentModal = true;
  }

  function closeCashPaymentModal() {
    showCashPaymentModal = false;
  }

  async function handleCashPayment() {
    try {
      error = null;
      await employeePaymentsAPI.create(cashPaymentForm);
      closeCashPaymentModal();
      await loadPayments();
      alert('Cash payment recorded successfully!');
    } catch (err) {
      console.error('Error recording cash payment:', err);
      error = err.response?.data?.message || 'Failed to record payment';
    }
  }

  async function updatePaymentStatus() {
    if (!selectedPayment || !newStatus) return;

    try {
      error = null;
      await employeePaymentsAPI.updateStatus(selectedPayment.id, newStatus);
      closeDetailModal();
      await loadPayments();
    } catch (err) {
      console.error('Error updating payment status:', err);
      error = err.response?.data?.message || 'Failed to update payment status';
    }
  }

  function getStatusColor(status) {
    return `status-${status}`;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  }
</script>

<EmployeeNavbar />

<div class="container">
  <div class="header">
    <div>
      <h1>Payments Management</h1>
      <p>Process and manage payment transactions</p>
    </div>
    <button on:click={openCashPaymentModal} class="btn-add">
      <span class="icon">💵</span>
      Record Cash Payment
    </button>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters-card">
    <div class="filters-grid">
      <div class="search-wrapper">
        <input
          type="text"
          bind:value={searchQuery}
          on:keypress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by customer name or email..."
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

  <!-- Payments Table -->
  <div class="table-card">
    {#if loading}
      <div class="loading-container">
        <div class="spinner"></div>
      </div>
    {:else if payments.length === 0}
      <div class="empty-state">
        <p>No payments found</p>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="payments-table">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each payments as payment}
              <tr on:click={() => openDetailModal(payment)}>
                <td class="payment-id">#{payment.id}</td>
                <td class="booking-id">#{payment.booking_id}</td>
                <td>
                  <div class="customer-name">{payment.customer_name || 'N/A'}</div>
                  <div class="customer-email">{payment.customer_email || ''}</div>
                </td>
                <td class="amount">{formatCurrency(payment.amount)}</td>
                <td class="capitalize">{payment.payment_method || 'N/A'}</td>
                <td>
                  <span class="status-badge {getStatusColor(payment.payment_status)}">
                    {payment.payment_status}
                  </span>
                </td>
                <td>{formatDate(payment.paid_at || payment.created_at)}</td>
                <td class="actions-cell">
                  <button
                    on:click|stopPropagation={() => openDetailModal(payment)}
                    class="btn-view"
                  >
                    View
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
{#if showDetailModal && selectedPayment}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Payment Details</h2>
          <p class="modal-subtitle">Payment ID: #{selectedPayment.id}</p>
        </div>
        <button on:click={closeDetailModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Payment Information -->
        <div class="info-section">
          <h3>Payment Information</h3>
          <div class="info-grid">
            <div>
              <p class="info-label">Booking ID</p>
              <p class="info-value">#{selectedPayment.booking_id}</p>
            </div>
            <div>
              <p class="info-label">Amount</p>
              <p class="info-value amount-highlight">{formatCurrency(selectedPayment.amount)}</p>
            </div>
            <div>
              <p class="info-label">Payment Method</p>
              <p class="info-value capitalize">{selectedPayment.payment_method || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">M-Pesa Receipt</p>
              <p class="info-value">{selectedPayment.mpesa_receipt_number || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">Payment Date</p>
              <p class="info-value">{formatDate(selectedPayment.paid_at)}</p>
            </div>
            <div>
              <p class="info-label">Current Status</p>
              <span class="status-badge {getStatusColor(selectedPayment.payment_status)}">
                {selectedPayment.payment_status}
              </span>
            </div>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="info-section">
          <h3>Customer Information</h3>
          <div class="info-grid">
            <div>
              <p class="info-label">Name</p>
              <p class="info-value">{selectedPayment.customer_name || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">Email</p>
              <p class="info-value">{selectedPayment.customer_email || 'N/A'}</p>
            </div>
          </div>
        </div>

        <!-- Room Information -->
        {#if selectedPayment.room_number}
          <div class="info-section">
            <h3>Room Information</h3>
            <div class="info-grid">
              <div>
                <p class="info-label">Room Number</p>
                <p class="info-value">Room {selectedPayment.room_number}</p>
              </div>
              <div>
                <p class="info-label">Room Type</p>
                <p class="info-value capitalize">{selectedPayment.room_type || 'N/A'}</p>
              </div>
              {#if selectedPayment.check_in}
                <div>
                  <p class="info-label">Check In</p>
                  <p class="info-value">{formatDate(selectedPayment.check_in)}</p>
                </div>
              {/if}
              {#if selectedPayment.check_out}
                <div>
                  <p class="info-label">Check Out</p>
                  <p class="info-value">{formatDate(selectedPayment.check_out)}</p>
                </div>
              {/if}
            </div>
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
            <button on:click={updatePaymentStatus} class="btn-update">
              Update
            </button>
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

<!-- Cash Payment Modal -->
{#if showCashPaymentModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Record Cash Payment</h2>
        <button on:click={closeCashPaymentModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form on:submit|preventDefault={handleCashPayment} class="modal-body">
        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">Select Booking *</label>
            <select bind:value={cashPaymentForm.booking_id} required class="form-input">
              <option value="">-- Select a booking --</option>
              {#each recentBookings as booking}
                <option value={booking.id}>
                  Booking #{booking.id} - {booking.user_name} - Room {booking.room_number}
                </option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Amount *</label>
            <input
              type="number"
              bind:value={cashPaymentForm.amount}
              required
              step="0.01"
              min="0"
              placeholder="0.00"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Payment Method *</label>
            <select bind:value={cashPaymentForm.payment_method} required class="form-input">
              {#each paymentMethods as method}
                <option value={method}>{method.toUpperCase().replace('_', ' ')}</option>
              {/each}
            </select>
          </div>

          {#if cashPaymentForm.payment_method === 'mpesa'}
            <div class="form-group full-width">
              <label class="form-label">M-Pesa Receipt Number</label>
              <input
                type="text"
                bind:value={cashPaymentForm.mpesa_receipt_number}
                placeholder="Enter M-Pesa receipt number"
                class="form-input"
              />
            </div>
          {/if}
        </div>

        <div class="modal-footer">
          <button type="button" on:click={closeCashPaymentModal} class="btn-cancel">
            Cancel
          </button>
          <button type="submit" class="btn-submit">
            Record Payment
          </button>
        </div>
      </form>
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
    display: flex;
    justify-content: space-between;
    align-items: center;
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

  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-add:hover {
    background: #047857;
  }

  .icon {
    font-size: 1rem;
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

  .search-wrapper {
    grid-column: span 1;
  }

  @media (min-width: 768px) {
    .search-wrapper {
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
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
  }

  .search-button-wrapper {
    margin-top: 1rem;
  }

  .btn-search {
    background-color: #059669;
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-search:hover {
    background-color: #047857;
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
    border-top-color: #059669;
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

  .payments-table {
    min-width: 100%;
    border-collapse: collapse;
  }

  .payments-table thead {
    background-color: #f9fafb;
  }

  .payments-table th {
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

  .payments-table tbody tr {
    border-top: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .payments-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .payments-table td {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    color: #111827;
  }

  .payment-id,
  .booking-id {
    font-weight: 500;
    color: #059669;
  }

  .customer-name {
    font-weight: 500;
    color: #111827;
  }

  .customer-email {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .amount {
    font-weight: 600;
    color: #059669;
  }

  .capitalize {
    text-transform: capitalize;
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

  .status-completed {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-failed {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-refunded {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .actions-cell {
    text-align: right;
  }

  .btn-view {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
    color: #059669;
  }

  .btn-view:hover {
    color: #047857;
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
    z-index: 9999;
  }

  .modal-content {
    background: white;
    border-radius: 0.5rem;
    max-width: 42rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .full-width {
    grid-column: span 2;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .form-input:focus {
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
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

  .amount-highlight {
    font-size: 1.25rem;
    font-weight: 700;
    color: #059669;
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
    background-color: #059669;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-update:hover {
    background-color: #047857;
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

    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .btn-add {
      width: 100%;
      justify-content: center;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .full-width {
      grid-column: span 1;
    }
  }
</style>