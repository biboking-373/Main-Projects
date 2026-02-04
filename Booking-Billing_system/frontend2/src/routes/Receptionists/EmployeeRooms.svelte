<script>
  import { onMount } from 'svelte';
  import { employeeRoomsAPI, employeeBookingsAPI } from '../../lib/employeeAPI';
  import EmployeeNavbar from '../../components/Employee-Navbar.svelte';

  let rooms = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let statusFilter = '';
  let showAssignModal = false;
  let showStatusModal = false;
  let selectedRoom = null;
  let assignmentForm = {
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    check_in: '',
    check_out: '',
    number_of_guests: 1,
    adults: 1,
    children: 0
  };
  let newRoomStatus = '';

  const roomStatuses = ['available', 'occupied', 'maintenance', 'reserved'];

  onMount(async () => {
    await loadRooms();
  });

  async function loadRooms() {
    try {
      loading = true;
      error = null;
      const response = await employeeRoomsAPI.getAll({
        search: searchQuery,
        status: statusFilter
      });
      rooms = response.data || response || [];
    } catch (err) {
      console.error('Error loading rooms:', err);
      error = 'Failed to load rooms';
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    await loadRooms();
  }

  async function handleFilter() {
    await loadRooms();
  }

  function openAssignModal(room) {
    if (room.status !== 'available') {
      alert('Only available rooms can be assigned to customers');
      return;
    }
    selectedRoom = room;
    assignmentForm = {
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      check_in: new Date().toISOString().split('T')[0],
      check_out: '',
      number_of_guests: 1,
      adults: 1,
      children: 0
    };
    showAssignModal = true;
  }

  function openStatusModal(room) {
    selectedRoom = room;
    newRoomStatus = room.status;
    showStatusModal = true;
  }

  function closeAssignModal() {
    showAssignModal = false;
    selectedRoom = null;
  }

  function closeStatusModal() {
    showStatusModal = false;
    selectedRoom = null;
  }

  async function handleWalkInBooking() {
    try {
      error = null;
      
      // Calculate total price
      const checkIn = new Date(assignmentForm.check_in);
      const checkOut = new Date(assignmentForm.check_out);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const total_price = nights * selectedRoom.price_per_night;

      // Create booking for walk-in customer
      const bookingData = {
        room_id: selectedRoom.id,
        check_in: assignmentForm.check_in,
        check_out: assignmentForm.check_out,
        number_of_guests: assignmentForm.number_of_guests,
        adults: assignmentForm.adults,
        children: assignmentForm.children,
        customer_name: assignmentForm.customer_name,
        customer_email: assignmentForm.customer_email,
        customer_phone: assignmentForm.customer_phone,
        booking_type: 'walk-in'
      };

      await employeeBookingsAPI.create(bookingData);
      
      // Update room status to occupied
      await employeeRoomsAPI.updateStatus(selectedRoom.id, 'occupied');
      
      closeAssignModal();
      await loadRooms();
      alert('Walk-in customer successfully assigned to room!');
    } catch (err) {
      console.error('Error creating walk-in booking:', err);
      error = err.response?.data?.message || 'Failed to assign room';
    }
  }

  async function handleStatusUpdate() {
    try {
      error = null;
      await employeeRoomsAPI.updateStatus(selectedRoom.id, newRoomStatus);
      closeStatusModal();
      await loadRooms();
    } catch (err) {
      console.error('Error updating room status:', err);
      error = err.response?.data?.message || 'Failed to update room status';
    }
  }

  function getStatusColor(status) {
    return `status-${status}`;
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
    <h1>Rooms Management</h1>
    <p>Monitor room status and assign walk-in customers</p>
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
          placeholder="Search by room number..."
          class="input-field"
        />
      </div>
      <div>
        <select
          bind:value={statusFilter}
          on:change={handleFilter}
          class="select-field"
        >
          <option value="">All Statuses</option>
          {#each roomStatuses as status}
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

  <!-- Rooms Grid -->
  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  {:else if rooms.length === 0}
    <div class="empty-state">
      <p>No rooms found</p>
    </div>
  {:else}
    <div class="rooms-grid">
      {#each rooms as room}
        <div class="room-card">
          <div class="room-header">
            <div class="room-number">Room {room.room_number}</div>
            <span class="status-badge {getStatusColor(room.status)}">
              {room.status}
            </span>
          </div>
          
          <div class="room-details">
            <p class="room-type">{room.room_type}</p>
            <p class="room-price">{formatCurrency(room.price_per_night)}/night</p>
            <p class="room-capacity">Max: {room.max_occupancy} guests</p>
          </div>

          <div class="room-actions">
            {#if room.status === 'available'}
              <button class="btn-assign" on:click={() => openAssignModal(room)}>
                Assign Walk-in
              </button>
            {/if}
            <button class="btn-status" on:click={() => openStatusModal(room)}>
              Change Status
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Assign Walk-in Modal -->
{#if showAssignModal && selectedRoom}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Assign Walk-in Customer</h2>
        <button on:click={closeAssignModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form on:submit|preventDefault={handleWalkInBooking} class="modal-body">
        <div class="form-section">
          <h3>Room: {selectedRoom.room_number} ({selectedRoom.room_type})</h3>
          <p class="price-info">{formatCurrency(selectedRoom.price_per_night)} per night</p>
        </div>

        <div class="form-grid">
          <div class="form-group full-width">
            <label class="form-label">Customer Name *</label>
            <input
              type="text"
              bind:value={assignmentForm.customer_name}
              required
              placeholder="John Doe"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input
              type="email"
              bind:value={assignmentForm.customer_email}
              placeholder="john@example.com"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Phone *</label>
            <input
              type="tel"
              bind:value={assignmentForm.customer_phone}
              required
              placeholder="+254 712 345 678"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Check In *</label>
            <input
              type="date"
              bind:value={assignmentForm.check_in}
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Check Out *</label>
            <input
              type="date"
              bind:value={assignmentForm.check_out}
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Adults *</label>
            <input
              type="number"
              bind:value={assignmentForm.adults}
              required
              min="1"
              max={selectedRoom.max_occupancy}
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Children</label>
            <input
              type="number"
              bind:value={assignmentForm.children}
              min="0"
              class="form-input"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" on:click={closeAssignModal} class="btn-cancel">
            Cancel
          </button>
          <button type="submit" class="btn-submit">
            Assign Room
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Change Status Modal -->
{#if showStatusModal && selectedRoom}
  <div class="modal-overlay">
    <div class="modal-content-small">
      <div class="modal-header">
        <h2>Change Room Status</h2>
        <button on:click={closeStatusModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <p class="room-info">Room {selectedRoom.room_number}</p>
        
        <div class="form-group">
          <label class="form-label">New Status</label>
          <select bind:value={newRoomStatus} class="form-input">
            {#each roomStatuses as status}
              <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            {/each}
          </select>
        </div>

        <div class="modal-footer">
          <button on:click={closeStatusModal} class="btn-cancel">
            Cancel
          </button>
          <button on:click={handleStatusUpdate} class="btn-submit">
            Update Status
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
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

  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

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
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .room-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .room-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .room-number {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
  }

  .status-badge {
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 9999px;
    text-transform: capitalize;
  }

  .status-available {
    background: #d1fae5;
    color: #065f46;
  }

  .status-occupied {
    background: #dbeafe;
    color: #1e40af;
  }

  .status-maintenance {
    background: #fef3c7;
    color: #92400e;
  }

  .status-reserved {
    background: #e9d5ff;
    color: #6b21a8;
  }

  .room-details {
    margin-bottom: 1rem;
  }

  .room-type {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: capitalize;
    margin: 0 0 0.5rem 0;
  }

  .room-price {
    font-size: 1.125rem;
    font-weight: 600;
    color: #059669;
    margin: 0 0 0.5rem 0;
  }

  .room-capacity {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .room-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-assign,
  .btn-status {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .btn-assign {
    background: #059669;
    color: white;
  }

  .btn-assign:hover {
    background: #047857;
  }

  .btn-status {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-status:hover {
    background: #e5e7eb;
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

  .modal-content,
  .modal-content-small {
    background: white;
    border-radius: 0.5rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-content {
    max-width: 42rem;
  }

  .modal-content-small {
    max-width: 28rem;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
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

  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .form-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .price-info {
    color: #059669;
    font-weight: 500;
    margin: 0;
  }

  .room-info {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 1rem 0;
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

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
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

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-cancel:hover {
    background: #f9fafb;
  }

  .btn-submit {
    background: #059669;
    color: white;
    border: none;
  }

  .btn-submit:hover {
    background: #047857;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .rooms-grid {
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