<script>
  import { onMount } from 'svelte';
  import { adminRoomsAPI } from '../../lib/adminAPI';
  import AdminNavbar from '../../components/Admin-Navbar.svelte';

  let rooms = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let showModal = false;
  let isEditMode = false;
  let selectedRoom = null;
  let imageFiles = [];
  let imagePreviews = [];
  let activeView = 'grid'; // 'grid' or 'table'

  let formData = {
    room_number: '',
    room_type: 'standard',
    description: '',
    price_per_night: '',
    max_occupancy: '',
    amenities: '',
    status: 'available'
  };

  const roomTypes = ['standard', 'deluxe', 'suite', 'executive', 'penthouse'];
  const roomStatuses = ['Available', 'Occupied', 'Maintenance'];

  onMount(async () => {
    await loadRooms();
  });

  async function loadRooms() {
    try {
      loading = true;
      error = null;
      const response = await adminRoomsAPI.getAll({ search: searchQuery });
      rooms = response.data || response || [];
    } catch (err) {
      console.error('Error loading rooms:', err);
      error = err.response?.data?.message || 'Failed to load rooms';
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    isEditMode = false;
    selectedRoom = null;
    formData = {
      room_number: '',
      room_type: 'standard',
      description: '',
      price_per_night: '',
      max_occupancy: '',
      amenities: '',
      status: 'available'
    };
    imageFiles = [];
    imagePreviews = [];
    showModal = true;
  }

  async function openEditModal(room) {
    isEditMode = true;
    selectedRoom = room;
    formData = {
      room_number: room.room_number || '',
      room_type: room.room_type || 'standard',
      description: room.description || '',
      price_per_night: room.price_per_night || '',
      max_occupancy: room.max_occupancy || '',
      amenities: Array.isArray(room.amenities) ? room.amenities.join(', ') : (room.amenities || ''),
      status: room.status || 'available'
    };
    imageFiles = [];
    imagePreviews = room.images || [];
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    selectedRoom = null;
    imageFiles = [];
    imagePreviews = [];
  }

  function handleImageSelect(event) {
    const files = Array.from(event.target.files);
    imageFiles = [...imageFiles, ...files];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreviews = [...imagePreviews, e.target.result];
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index) {
    imagePreviews = imagePreviews.filter((_, i) => i !== index);
    if (imageFiles.length > index) {
      imageFiles = imageFiles.filter((_, i) => i !== index);
    }
  }

  async function handleSubmit() {
    try {
      error = null;
      
      const submitFormData = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'amenities') {
          const amenitiesArray = formData[key].split(',').map(a => a.trim()).filter(a => a);
          submitFormData.append(key, JSON.stringify(amenitiesArray));
        } else {
          submitFormData.append(key, formData[key]);
        }
      });

      imageFiles.forEach((file, index) => {
        submitFormData.append('images', file);
      });

      if (isEditMode && selectedRoom) {
        const existingImages = imagePreviews.filter(img => typeof img === 'string' && img.startsWith('http'));
        submitFormData.append('existing_images', JSON.stringify(existingImages));
      }

      if (isEditMode && selectedRoom) {
        await adminRoomsAPI.update(selectedRoom.id, submitFormData);
      } else {
        await adminRoomsAPI.create(submitFormData);
      }

      closeModal();
      await loadRooms();
    } catch (err) {
      console.error('Error saving room:', err);
      error = err.response?.data?.message || 'Failed to save room';
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      error = null;
      await adminRoomsAPI.delete(id);
      await loadRooms();
    } catch (err) {
      console.error('Error deleting room:', err);
      error = err.response?.data?.message || 'Failed to delete room';
    }
  }

  async function handleSearch() {
    await loadRooms();
  }

  function getStatusColor(status) {
    return `status-${status.toLowerCase()}`;
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  }
</script>

<AdminNavbar />

<!-- Secondary Navigation for Room Actions -->
<div class="secondary-nav">
  <div class="secondary-nav-container">
    <div class="nav-left">
      <h2 class="nav-title">Room Management</h2>
      <div class="view-toggle">
        <button 
          class="toggle-btn" 
          class:active={activeView === 'grid'}
          on:click={() => activeView = 'grid'}
        >
          <span class="icon">📊</span>
          Grid View
        </button>
        <button 
          class="toggle-btn" 
          class:active={activeView === 'table'}
          on:click={() => activeView = 'table'}
        >
          <span class="icon">📋</span>
          Table View
        </button>
      </div>
    </div>
    <div class="nav-actions">
      <button class="btn-refresh" on:click={loadRooms}>
        <span class="icon">🔄</span>
        Refresh
      </button>
      <button class="btn-add" on:click={openAddModal}>
        <span class="icon">➕</span>
        Add Room
      </button>
    </div>
  </div>
</div>

<div class="container">
  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Search Bar -->
  <div class="search-card">
    <div class="search-wrapper">
      <input
        type="text"
        bind:value={searchQuery}
        on:keypress={(e) => e.key === 'Enter' && handleSearch()}
        placeholder="Search by room number or type..."
        class="input-field"
      />
      <button on:click={handleSearch} class="btn-search">
        Search
      </button>
    </div>
  </div>

  <!-- Rooms Display -->
  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  {:else if rooms.length === 0}
    <div class="empty-state">
      <p>No rooms found</p>
    </div>
  {:else if activeView === 'grid'}
    <!-- Grid View -->
    <div class="rooms-grid">
      {#each rooms as room}
        <div class="room-card">
          <div class="room-image">
            {#if room.images && room.images.length > 0}
              <img src={room.images[0]} alt="Room {room.room_number}" />
            {:else}
              <div class="image-placeholder">
                <span class="placeholder-icon">🏨</span>
              </div>
            {/if}
            <span class="status-badge {getStatusColor(room.status)}">
              {room.status}
            </span>
          </div>

          <div class="room-content">
            <div class="room-header">
              <div>
                <h3 class="room-number">Room {room.room_number}</h3>
                <p class="room-type">{room.room_type}</p>
              </div>
              <p class="room-price">{formatCurrency(room.price_per_night)}<span class="price-unit">/night</span></p>
            </div>

            <p class="room-description">{room.description || 'No description'}</p>

            <div class="room-info">
              <div class="info-item">
                <span class="info-icon">👥</span>
                <span>Max {room.max_occupancy} guests</span>
              </div>
            </div>

            {#if room.amenities && room.amenities.length > 0}
              <div class="amenities">
                {#each room.amenities.slice(0, 3) as amenity}
                  <span class="amenity-tag">{amenity}</span>
                {/each}
                {#if room.amenities.length > 3}
                  <span class="amenity-tag">+{room.amenities.length - 3} more</span>
                {/if}
              </div>
            {/if}

            <div class="room-actions">
              <button class="btn-edit" on:click={() => openEditModal(room)}>
                Edit
              </button>
              <button class="btn-delete" on:click={() => handleDelete(room.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Table View -->
    <div class="table-card">
      <div class="table-wrapper">
        <table class="rooms-table">
          <thead>
            <tr>
              <th>Room #</th>
              <th>Type</th>
              <th>Price/Night</th>
              <th>Max Guests</th>
              <th>Status</th>
              <th>Description</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each rooms as room}
              <tr>
                <td class="room-id">#{room.room_number}</td>
                <td class="capitalize">{room.room_type}</td>
                <td class="price-cell">{formatCurrency(room.price_per_night)}</td>
                <td>{room.max_occupancy}</td>
                <td>
                  <span class="status-badge {getStatusColor(room.status)}">
                    {room.status}
                  </span>
                </td>
                <td class="description-cell">{room.description || 'N/A'}</td>
                <td class="actions-cell">
                  <button class="btn-view" on:click={() => openEditModal(room)}>
                    Edit
                  </button>
                  <button class="btn-delete-link" on:click={() => handleDelete(room.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{isEditMode ? 'Edit Room' : 'Add New Room'}</h2>
        <button on:click={closeModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Room Number *</label>
            <input
              type="text"
              bind:value={formData.room_number}
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Room Type *</label>
            <select bind:value={formData.room_type} required class="form-input">
              {#each roomTypes as type}
                <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Price per Night *</label>
            <input
              type="number"
              bind:value={formData.price_per_night}
              required
              step="0.01"
              min="0"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Max Occupancy *</label>
            <input
              type="number"
              bind:value={formData.max_occupancy}
              required
              min="1"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Status *</label>
            <select bind:value={formData.status} required class="form-input">
              {#each roomStatuses as status}
                <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Amenities (comma-separated)</label>
            <input
              type="text"
              bind:value={formData.amenities}
              placeholder="WiFi, TV, Air Conditioning"
              class="form-input"
            />
          </div>

          <div class="form-group full-width">
            <label class="form-label">Description</label>
            <textarea
              bind:value={formData.description}
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>

          <div class="form-group full-width">
            <label class="form-label">Room Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              on:change={handleImageSelect}
              class="form-input"
            />
            
            {#if imagePreviews.length > 0}
              <div class="image-previews">
                {#each imagePreviews as preview, index}
                  <div class="preview-item">
                    <img src={preview} alt="Preview {index + 1}" />
                    <button
                      type="button"
                      on:click={() => removeImage(index)}
                      class="remove-image"
                    >
                      ✕
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" on:click={closeModal} class="btn-cancel">
            Cancel
          </button>
          <button type="submit" class="btn-submit">
            {isEditMode ? 'Update' : 'Create'} Room
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Secondary Navigation */
  .secondary-nav {
    background: white;
    border-bottom: 2px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .secondary-nav-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .view-toggle {
    display: flex;
    gap: 0.5rem;
    background: #f3f4f6;
    padding: 0.25rem;
    border-radius: 0.5rem;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    color: #6b7280;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    color: #111827;
  }

  .toggle-btn.active {
    background: white;
    color: #3b82f6;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .icon {
    font-size: 1rem;
  }

  .nav-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-refresh,
  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-refresh {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-refresh:hover {
    background: #e5e7eb;
  }

  .btn-add {
    background: #3b82f6;
    color: white;
  }

  .btn-add:hover {
    background: #2563eb;
  }

  /* Container */
  .container {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
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
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

  /* Loading & Empty States */
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
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  /* Grid View */
  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .room-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .room-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .room-image {
    height: 12rem;
    background: #e5e7eb;
    position: relative;
  }

  .room-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-icon {
    font-size: 3rem;
    opacity: 0.3;
  }

  .status-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
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

  .room-content {
    padding: 1rem;
  }

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .room-number {
    font-size: 1.125rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .room-type {
    font-size: 0.875rem;
    color: #6b7280;
    text-transform: capitalize;
    margin: 0.25rem 0 0 0;
  }

  .room-price {
    font-size: 1.125rem;
    font-weight: 700;
    color: #3b82f6;
    margin: 0;
  }

  .price-unit {
    font-size: 0.75rem;
    font-weight: 400;
    color: #6b7280;
  }

  .room-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 0.75rem 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .room-info {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .info-icon {
    font-size: 1rem;
  }

  .amenities {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin-bottom: 1rem;
  }

  .amenity-tag {
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    color: #374151;
    font-size: 0.75rem;
    border-radius: 0.25rem;
  }

  .room-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-edit,
  .btn-delete {
    flex: 1;
    padding: 0.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-edit {
    background: #dbeafe;
    color: #1e40af;
  }

  .btn-edit:hover {
    background: #bfdbfe;
  }

  .btn-delete {
    background: #fee2e2;
    color: #991b1b;
  }

  .btn-delete:hover {
    background: #fecaca;
  }

  /* Table View */
  .table-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .rooms-table {
    min-width: 100%;
    border-collapse: collapse;
  }

  .rooms-table thead {
    background-color: #f9fafb;
  }

  .rooms-table th {
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

  .rooms-table tbody tr {
    border-top: 1px solid #e5e7eb;
    transition: background-color 0.15s;
  }

  .rooms-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .rooms-table td {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    color: #111827;
  }

  .room-id {
    font-weight: 500;
    color: #3b82f6;
  }

  .capitalize {
    text-transform: capitalize;
  }

  .price-cell {
    font-weight: 500;
  }

  .description-cell {
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions-cell {
    text-align: right;
  }

  .btn-view,
  .btn-delete-link {
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

  .btn-delete-link {
    color: #ef4444;
  }

  .btn-delete-link:hover {
    color: #991b1b;
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
    max-width: 56rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
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
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    resize: vertical;
    font-family: inherit;
  }

  .image-previews {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .preview-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .preview-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-image {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    width: 1.5rem;
    height: 1.5rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .preview-item:hover .remove-image {
    opacity: 1;
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
    background: #3b82f6;
    color: white;
    border: none;
  }

  .btn-submit:hover {
    background: #2563eb;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .secondary-nav-container {
      flex-direction: column;
      align-items: flex-start;
    }

    .nav-left {
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .view-toggle {
      width: 100%;
    }

    .toggle-btn {
      flex: 1;
      justify-content: center;
    }

    .nav-actions {
      width: 100%;
    }

    .btn-refresh,
    .btn-add {
      flex: 1;
      justify-content: center;
    }

    .container {
      padding: 1rem;
    }

    .search-wrapper {
      flex-direction: column;
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

    .image-previews {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .nav-title {
      font-size: 1rem;
    }

    .toggle-btn,
    .btn-refresh,
    .btn-add {
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }
  }
</style>