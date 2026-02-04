<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { roomsAPI } from '../../lib/api.js';
  import Navbar from '../../components/Navbar.svelte';

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3130';

  let rooms = $state([]);
  let loading = $state(true);
  let searchTerm = $state('');
  let filterType = $state('all');

  onMount(async () => {
    await loadRooms();
  });

  async function loadRooms() {
    try {
      loading = true;
      const data = await roomsAPI.getAll();
      rooms = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to load rooms:', err);
      rooms = [];
    } finally {
      loading = false;
    }
  }

  let filteredRooms = $derived(
    Array.isArray(rooms)
      ? rooms.filter(room => {
          const matchesSearch = room.room_number?.toString().includes(searchTerm) ||
                                room.room_type?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesType = filterType === 'all' || room.room_type?.toLowerCase() === filterType.toLowerCase();
          return matchesSearch && matchesType;
        })
      : []
  );

  let roomTypes = $derived(
    Array.isArray(rooms)
      ? [...new Set(rooms.map(r => r.room_type).filter(Boolean))]
      : []
  );

  function getRoomImage(room) {
    if (room.images && Array.isArray(room.images) && room.images.length > 0) {
      return `${API_BASE_URL}${room.images[0]}`;
    }
    return `https://via.placeholder.com/400x250?text=Room+${room.room_number}`;
  }
</script>

<Navbar />

<div class="rooms-page">
  <div class="container">
    <div class="page-header">
      <h1>Available Rooms</h1>
      <p>Find your perfect stay</p>
    </div>

    <div class="filters-section">
      <input 
        type="text" 
        bind:value={searchTerm} 
        placeholder="Search by room number or type..."
        class="search-input"
      />

      <div class="type-filters">
        <button 
          class="filter-btn {filterType === 'all' ? 'active' : ''}"
          onclick={() => filterType = 'all'}
        >
          All Types
        </button>
        {#each roomTypes as type}
          <button 
            class="filter-btn {filterType === type ? 'active' : ''}"
            onclick={() => filterType = type}
          >
            {type}
          </button>
        {/each}
      </div>
    </div>

    {#if loading}
      <div class="loading">Loading rooms...</div>
    {:else if filteredRooms.length > 0}
      <div class="rooms-grid">
        {#each filteredRooms as room}
          <div class="room-card">
            <div class="room-image">
              <img 
                src={getRoomImage(room)} 
                alt="Room {room.room_number}"
                onerror={(e) => e.target.src = `https://via.placeholder.com/400x250?text=Room+${room.room_number}`}
              />
              {#if room.images && room.images.length > 1}
                <span class="image-count">📷 {room.images.length} photos</span>
              {/if}
            </div>

            <div class="room-content">
              <div class="room-header">
                <h3>Room {room.room_number}</h3>
                <span class="room-price">${room.price_per_night}<small>/night</small></span>
              </div>

              <p class="room-type">{room.room_type}</p>

              <div class="room-features">
                <span class="feature">🏢 Floor {room.floor_number || 1}</span>
                <span class="feature">📱 WiFi</span>
                <span class="feature">❄️ AC</span>
              </div>

              <a 
                href="/customer/rooms/{room.id}" 
                use:link 
                class="btn-view"
              >
                View Details & Book
              </a>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <div class="empty-icon">🏨</div>
        <h3>No rooms found</h3>
        <p>Try adjusting your filters or search term</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .rooms-page {
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
  
  .filters-section {
    margin-bottom: 2rem;
  }
  
  .search-input {
    width: 100%;
    padding: 0.85rem 1.25rem;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    font-size: 1rem;
    margin-bottom: 1rem;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .type-filters {
    display: flex;
    gap: 0.75rem;
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
  
  .rooms-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .room-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: transform 0.2s;
  }
  
  .room-card:hover {
    transform: translateY(-5px);
  }
  
  .room-image {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
  }
  
  .room-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-count {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 0.75rem;
    border-radius: 6px;
    backdrop-filter: blur(5px);
  }
  
  .room-content {
    padding: 1.5rem;
  }
  
  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 0.5rem;
  }
  
  .room-header h3 {
    margin: 0;
    color: #2c3e50;
  }
  
  .room-price {
    color: #667eea;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .room-price small {
    font-size: 0.8rem;
    font-weight: 500;
    color: #7f8c8d;
  }
  
  .room-type {
    color: #7f8c8d;
    margin: 0 0 1rem 0;
  }
  
  .room-features {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  .feature {
    font-size: 0.85rem;
    color: #7f8c8d;
  }
  
  .btn-view {
    display: block;
    text-align: center;
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 6px;
    font-weight: 600;
    transition: transform 0.2s;
    border: none;
    cursor: pointer;
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
  }
  
  .loading {
    text-align: center;
    padding: 3rem;
    color: #7f8c8d;
  }
</style>