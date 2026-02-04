<script>
  import { onMount } from 'svelte';
  import { employeeCustomersAPI } from '../../lib/employeeAPI';
  import EmployeeNavbar from '../../components/Employee-Navbar.svelte';

  let customers = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let currentPage = 1;
  let totalPages = 1;
  let showDetailModal = false;
  let selectedCustomer = null;
  let editMode = false;
  let editForm = {
    phone: '',
    address: '',
    national_id: ''
  };

  onMount(async () => {
    await loadCustomers();
  });

  async function loadCustomers() {
    try {
      loading = true;
      error = null;
      const response = await employeeCustomersAPI.getAll({
        page: currentPage,
        limit: 20,
        search: searchQuery
      });
      
      customers = response.data || [];
      totalPages = response.totalPages || 1;
      
      console.log('Loaded customers:', customers.length);
    } catch (err) {
      console.error('Error loading customers:', err);
      error = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load customers';
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    currentPage = 1;
    await loadCustomers();
  }

  function handlePageChange(page) {
    currentPage = page;
    loadCustomers();
  }

  function openDetailModal(customer) {
    selectedCustomer = customer;
    editForm = {
      phone: customer.phone || '',
      address: customer.address || '',
      national_id: customer.national_id || ''
    };
    editMode = false;
    showDetailModal = true;
  }

  function closeDetailModal() {
    showDetailModal = false;
    selectedCustomer = null;
    editMode = false;
  }

  function enableEditMode() {
    editMode = true;
  }

  async function saveCustomerDetails() {
    if (!selectedCustomer) return;

    try {
      error = null;
      await employeeCustomersAPI.update(selectedCustomer.user_id, editForm);
      closeDetailModal();
      await loadCustomers();
    } catch (err) {
      console.error('Error updating customer:', err);
      error = err.response?.data?.message || 'Failed to update customer details';
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<EmployeeNavbar />

<div class="container">
  <div class="header">
    <h1>Customers Management</h1>
    <p>View and manage customer information</p>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Search -->
  <div class="search-card">
    <div class="search-wrapper">
      <input
        type="text"
        bind:value={searchQuery}
        on:keypress={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Search by name or email..."
        class="input-field"
      />
      <button on:click={handleSearch} class="btn-search">
        Search
      </button>
    </div>
  </div>

  <!-- Customers Table -->
  <div class="table-card">
    {#if loading}
      <div class="loading-container">
        <div class="spinner"></div>
      </div>
    {:else if customers.length === 0}
      <div class="empty-state">
        <p>No customers found</p>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="customers-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>National ID</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each customers as customer}
              <tr on:click={() => openDetailModal(customer)}>
                <td class="customer-id">#{customer.id}</td>
                <td>
                  <div class="customer-name">{customer.name || 'N/A'}</div>
                </td>
                <td class="customer-email">{customer.email || 'N/A'}</td>
                <td>{customer.phone || 'N/A'}</td>
                <td class="address-cell">{customer.address || 'N/A'}</td>
                <td>{customer.national_id || 'N/A'}</td>
                <td class="actions-cell">
                  <button
                    on:click|stopPropagation={() => openDetailModal(customer)}
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
{#if showDetailModal && selectedCustomer}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <div>
          <h2>Customer Details</h2>
          <p class="modal-subtitle">Customer ID: #{selectedCustomer.id}</p>
        </div>
        <button on:click={closeDetailModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- User Information -->
        <div class="info-section">
          <h3>User Information</h3>
          <div class="info-grid">
            <div>
              <p class="info-label">Name</p>
              <p class="info-value">{selectedCustomer.name || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">Email</p>
              <p class="info-value">{selectedCustomer.email || 'N/A'}</p>
            </div>
            <div>
              <p class="info-label">User ID</p>
              <p class="info-value">#{selectedCustomer.user_id}</p>
            </div>
            <div>
              <p class="info-label">Role ID</p>
              <p class="info-value">{selectedCustomer.role_id || 'N/A'}</p>
            </div>
          </div>
        </div>

        <!-- Customer Details (Editable) -->
        <div class="info-section">
          <div class="section-header">
            <h3>Customer Details</h3>
            {#if !editMode}
              <button on:click={enableEditMode} class="btn-edit">
                Edit
              </button>
            {/if}
          </div>

          {#if editMode}
            <div class="edit-form">
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input
                  type="text"
                  bind:value={editForm.phone}
                  class="form-input"
                  placeholder="Enter phone number"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Address</label>
                <textarea
                  bind:value={editForm.address}
                  class="form-textarea"
                  placeholder="Enter address"
                  rows="3"
                ></textarea>
              </div>
              <div class="form-group">
                <label class="form-label">National ID</label>
                <input
                  type="text"
                  bind:value={editForm.national_id}
                  class="form-input"
                  placeholder="Enter national ID"
                />
              </div>
              <div class="form-actions">
                <button on:click={saveCustomerDetails} class="btn-save">
                  Save Changes
                </button>
                <button on:click={() => editMode = false} class="btn-cancel-edit">
                  Cancel
                </button>
              </div>
            </div>
          {:else}
            <div class="info-grid">
              <div>
                <p class="info-label">Phone</p>
                <p class="info-value">{selectedCustomer.phone || 'Not provided'}</p>
              </div>
              <div>
                <p class="info-label">National ID</p>
                <p class="info-value">{selectedCustomer.national_id || 'Not provided'}</p>
              </div>
              <div class="full-width">
                <p class="info-label">Address</p>
                <p class="info-value">{selectedCustomer.address || 'Not provided'}</p>
              </div>
            </div>
          {/if}
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

  /* Search Card */
  .search-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .search-wrapper {
    display: flex;
    gap: 1rem;
  }

  .input-field {
    flex: 1;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .input-field:focus {
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
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

  .customers-table {
    min-width: 100%;
    border-collapse: collapse;
  }

  .customers-table thead {
    background-color: #f9fafb;
  }

  .customers-table th {
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

  .customers-table tbody {
    background: white;
  }

  .customers-table tbody tr {
    border-top: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .customers-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .customers-table td {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    color: #111827;
  }

  .customer-id {
    font-weight: 500;
    color: #059669;
  }

  .customer-name {
    font-weight: 500;
    color: #111827;
  }

  .customer-email {
    color: #6b7280;
  }

  .address-cell {
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .info-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .btn-edit {
    padding: 0.375rem 0.75rem;
    background-color: #059669;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-edit:hover {
    background-color: #047857;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .full-width {
    grid-column: span 2;
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

  /* Edit Form */
  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input,
  .form-textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
  }

  .form-textarea {
    resize: vertical;
    font-family: inherit;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .btn-save {
    flex: 1;
    padding: 0.5rem 1rem;
    background-color: #059669;
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-save:hover {
    background-color: #047857;
  }

  .btn-cancel-edit {
    flex: 1;
    padding: 0.5rem 1rem;
    background-color: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-cancel-edit:hover {
    background-color: #f9fafb;
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

    .search-wrapper {
      flex-direction: column;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }

    .full-width {
      grid-column: span 1;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>