<script>
  import { onMount, onDestroy } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { roomsAPI, bookingsAPI, customerDetailsAPI } from '../../lib/api.js';
  import Navbar from '../../components/Navbar.svelte';

  const { params } = $props();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3130';
  
  let room = $state(null);
  let loading = $state(true);
  let bookingLoading = $state(false);
  let checkInDate = $state('');
  let checkOutDate = $state('');
  let adults = $state(1);
  let children = $state(0);
  let error = $state('');
  let currentImageIndex = $state(0);
  let bookedDates = $state([]);
  let checkInInput;
  let checkOutInput;
  let checkInPicker;
  let checkOutPicker;
  let flatpickrLoaded = false;

  onMount(async () => {
    await loadRoom();
    await loadBookedDates();
    await checkCustomerDetails();
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    checkInDate = today.toISOString().split('T')[0];
    checkOutDate = tomorrow.toISOString().split('T')[0];

    // Load Flatpickr dynamically
    await loadFlatpickr();
  });

  onDestroy(() => {
    // Cleanup pickers
    if (checkInPicker) checkInPicker.destroy();
    if (checkOutPicker) checkOutPicker.destroy();
  });

  async function loadFlatpickr() {
    if (flatpickrLoaded) return;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
    document.head.appendChild(link);

    // Add custom CSS for disabled/booked dates
    const style = document.createElement('style');
    style.textContent = `
      /* Styling for booked/disabled dates */
      .flatpickr-day.flatpickr-disabled,
      .flatpickr-day.flatpickr-disabled:hover {
        background: repeating-linear-gradient(
          45deg,
          #f8f9fa,
          #f8f9fa 2px,
          #e9ecef 2px,
          #e9ecef 4px
        ) !important;
        color: #adb5bd !important;
        cursor: not-allowed !important;
        text-decoration: line-through !important;
        opacity: 0.5 !important;
        border-color: #dee2e6 !important;
      }
      
      /* Additional visual indication */
      .flatpickr-day.flatpickr-disabled::after {
        content: '✕';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #dc3545;
        font-size: 1.2em;
        font-weight: bold;
        opacity: 0.3;
      }
    `;
    document.head.appendChild(style);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
    script.onload = () => {
      flatpickrLoaded = true;
      initializeDatePickers();
    };
    document.head.appendChild(script);
  }

  function initializeDatePickers() {
    if (!window.flatpickr) return;

    // Create a function to check if a date should be disabled
    const disableDateFunction = function(date) {
      // Convert date to YYYY-MM-DD format for comparison
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if this date falls within any booked range
      return bookedDates.some(range => {
        const rangeStart = new Date(range.checkIn);
        const rangeEnd = new Date(range.checkOut);
        const checkDate = new Date(dateStr);
        
        // Disable date if it's within the range (including start, excluding end)
        return checkDate >= rangeStart && checkDate < rangeEnd;
      });
    };

    // Initialize check-in date picker
    if (checkInInput) {
      checkInPicker = flatpickr(checkInInput, {
        minDate: 'today',
        dateFormat: 'Y-m-d',
        defaultDate: checkInDate,
        disable: [disableDateFunction],
        onChange: function(selectedDates, dateStr) {
          checkInDate = dateStr;
          // Update check-out minimum date
          if (checkOutPicker) {
            const nextDay = new Date(selectedDates[0]);
            nextDay.setDate(nextDay.getDate() + 1);
            checkOutPicker.set('minDate', nextDay);
          }
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
          // Add tooltip to disabled dates
          const dateStr = dayElem.dateObj.toISOString().split('T')[0];
          if (disableDateFunction(dayElem.dateObj)) {
            dayElem.title = 'This date is already booked';
          }
        }
      });
    }

    // Initialize check-out date picker
    if (checkOutInput) {
      const minCheckout = new Date(checkInDate);
      minCheckout.setDate(minCheckout.getDate() + 1);
      
      checkOutPicker = flatpickr(checkOutInput, {
        minDate: minCheckout,
        dateFormat: 'Y-m-d',
        defaultDate: checkOutDate,
        disable: [disableDateFunction],
        onChange: function(selectedDates, dateStr) {
          checkOutDate = dateStr;
        },
        onDayCreate: function(dObj, dStr, fp, dayElem) {
          // Add tooltip to disabled dates
          const dateStr = dayElem.dateObj.toISOString().split('T')[0];
          if (disableDateFunction(dayElem.dateObj)) {
            dayElem.title = 'This date is already booked';
          }
        }
      });
    }
  }

  async function loadBookedDates() {
    try {
      // Fetch all bookings for this room
      const allBookings = await bookingsAPI.getAll();
      const roomBookings = allBookings.filter(booking => 
        booking.room_id === parseInt(params.id) && 
        (booking.status === 'confirmed' || booking.status === 'checked_in')
      );
      
      // Create array of all booked date ranges
      bookedDates = roomBookings.map(booking => ({
        checkIn: booking.check_in,
        checkOut: booking.check_out
      }));

      console.log('Booked dates loaded:', bookedDates);
    } catch (err) {
      console.error('Failed to load booked dates:', err);
    }
  }

  async function checkCustomerDetails() {
    try {
      await customerDetailsAPI.getMyDetails();
    } catch (err) {
      if (err.response?.status === 404) {
        error = 'Please complete your profile before booking. Go to Profile → Complete Your Details';
      }
    }
  }

  async function loadRoom() {
    try {
      loading = true;
      room = await roomsAPI.getById(params.id);
    } catch (err) {
      error = 'Failed to load room details';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function isDateInBookedRange(date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return bookedDates.some(range => {
      const rangeStart = new Date(range.checkIn);
      const rangeEnd = new Date(range.checkOut);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd.setHours(0, 0, 0, 0);
      
      return checkDate >= rangeStart && checkDate < rangeEnd;
    });
  }

  function hasBookingConflict(checkIn, checkOut) {
    if (!checkIn || !checkOut) return false;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    // Check each date in the selected range
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      if (isDateInBookedRange(d.toISOString().split('T')[0])) {
        return true;
      }
    }
    return false;
  }

  async function handleBooking() {
    if (!checkInDate || !checkOutDate) {
      alert('Please select check-in and check-out dates');
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      alert('Check-out date must be after check-in date');
      return;
    }

    const totalGuests = adults + children;
    
    if (totalGuests < 1) {
      alert('At least one guest is required');
      return;
    }

    if (totalGuests > 4) {
      alert('Maximum 4 guests per room');
      return;
    }

    if (adults < 1) {
      alert('At least one adult is required');
      return;
    }

    const bookingData = {
      room_id: room.id,
      check_in: checkInDate,
      check_out: checkOutDate,
      number_of_guests: totalGuests,
      adults: adults,
      children: children
    };

    try {
      bookingLoading = true;
      const response = await bookingsAPI.create(bookingData);
      alert('Booking created successfully!');
      window.location.href = '/#/customer/bookings';
    } catch (err) {
      console.error('Booking error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      
      if (errorMessage.includes('customer details')) {
        alert('Please complete your profile before booking. Go to Profile → Complete Your Details');
        window.location.href = '/#/customer/profile';
      } else if (errorMessage.includes('occupied') || errorMessage.includes('booked')) {
        alert('This room has conflicting bookings. The backend needs to be updated to support multiple bookings per room. Please contact support or try a different room.');
      } else {
        alert('Booking failed: ' + errorMessage);
      }
    } finally {
      bookingLoading = false;
    }
  }

  function getRoomImage(index) {
    if (room.images && Array.isArray(room.images) && room.images[index]) {
      return `${API_BASE_URL}${room.images[index]}`;
    }
    return `https://via.placeholder.com/800x500?text=Room+${room.room_number}`;
  }

  function nextImage() {
    if (room.images && room.images.length > 0) {
      currentImageIndex = (currentImageIndex + 1) % room.images.length;
    }
  }

  function prevImage() {
    if (room.images && room.images.length > 0) {
      currentImageIndex = (currentImageIndex - 1 + room.images.length) % room.images.length;
    }
  }

  function selectImage(index) {
    currentImageIndex = index;
  }

  // Get list of booked dates for display
  function getBlockedDatesMessage() {
    if (bookedDates.length === 0) return '';
    
    const dates = bookedDates.map(range => {
      const start = new Date(range.checkIn).toLocaleDateString();
      const end = new Date(range.checkOut).toLocaleDateString();
      return `${start} to ${end}`;
    }).join(', ');
    
    return `Currently booked: ${dates}`;
  }

  let totalNights = $derived(
    checkInDate && checkOutDate
      ? Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))
      : 0
  );

  let totalGuests = $derived(adults + children);

  let totalPrice = $derived(
    room && totalNights > 0 ? room.price_per_night * totalNights : 0
  );

  let hasConflict = $derived(hasBookingConflict(checkInDate, checkOutDate));
</script>

<Navbar />

<div class="room-details-page">
  <div class="container">
    <a href="/customer/rooms" use:link class="back-link">← Back to Rooms</a>

    {#if loading}
      <div class="loading">Loading room details...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else if room}
      <div class="room-details">
        <!-- Image Gallery -->
        <div class="room-gallery">
          <div class="main-image">
            <img 
              src={getRoomImage(currentImageIndex)} 
              alt="Room {room.room_number}"
              onerror={(e) => {
              e.target.src = `https://via.placeholder.com/800x500?text=Room+${room.room_number}`;
              }}
            />
            
            {#if room.images && room.images.length > 1}
              <button class="nav-btn prev-btn" onclick={prevImage}>‹</button>
              <button class="nav-btn next-btn" onclick={nextImage}>›</button>
              <div class="image-counter">
                {currentImageIndex + 1} / {room.images.length}
              </div>
            {/if}
          </div>

          {#if room.images && room.images.length > 1}
            <div class="thumbnail-gallery">
              {#each room.images as image, index}
                <div 
                  class="thumbnail {index === currentImageIndex ? 'active' : ''}"
                  onclick={() => selectImage(index)}
                >
                  <img 
                    src={`${API_BASE_URL}${image}`} 
                    alt="Room {room.room_number} - Photo {index + 1}"
                    onerror={(e) => e.target.src = `https://via.placeholder.com/150x100?text=Photo+${index + 1}`}
                  />
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="room-info-section">
          <div class="room-header">
            <div>
              <h1>Room {room.room_number}</h1>
              <p class="room-type">{room.room_type}</p>
            </div>
          </div>

          <div class="room-description">
            <h3>Description</h3>
            <p>{room.description || 'Comfortable room with modern amenities, perfect for your stay.'}</p>
          </div>

          <div class="room-features">
            <h3>Room Features</h3>
            <div class="features-grid">
              <div class="feature">🛏️ Floor {room.floor_number || 1}</div>
              <div class="feature">💰 ${room.price_per_night}/night</div>
              <div class="feature">📱 Free WiFi</div>
              <div class="feature">🚿 Private Bathroom</div>
              <div class="feature">❄️ Air Conditioning</div>
              <div class="feature">📺 TV</div>
            </div>
          </div>

          <div class="booking-section">
            <h3>Book This Room</h3>
            
            {#if bookedDates.length > 0}
              <div class="booked-dates-info">
                <p>📅 {getBlockedDatesMessage()}</p>
                <p class="hint">Striked-out dates in the calendar are already booked</p>
              </div>
            {/if}

            <div class="booking-form">
              <div class="date-inputs">
                <div class="input-group">
                  <label for="checkIn">Check-in</label>
                  <input 
                    bind:this={checkInInput}
                    id="checkIn"
                    type="text" 
                    bind:value={checkInDate}
                    placeholder="Select check-in date"
                    readonly
                  />
                </div>
                <div class="input-group">
                  <label for="checkOut">Check-out</label>
                  <input 
                    bind:this={checkOutInput}
                    id="checkOut"
                    type="text" 
                    bind:value={checkOutDate}
                    placeholder="Select check-out date"
                    readonly
                  />
                </div>
              </div>

              {#if hasConflict}
                <div class="conflict-warning">
                  ⚠️ Warning: These dates may conflict with an existing booking.
                </div>
              {/if}

              <div class="guests-section">
                <h4>Guests</h4>
                <div class="guest-inputs">
                  <div class="input-group">
                    <label for="adults">Adults</label>
                    <input 
                      id="adults"
                      type="number" 
                      bind:value={adults}
                      min="1"
                      max="4"
                    />
                  </div>
                  <div class="input-group">
                    <label for="children">Children</label>
                    <input 
                      id="children"
                      type="number" 
                      bind:value={children}
                      min="0"
                      max="3"
                    />
                  </div>
                </div>
                <p class="guest-count">Total Guests: {totalGuests} {totalGuests > 4 ? '⚠️ Maximum 4 guests' : ''}</p>
              </div>

              {#if totalNights > 0}
                <div class="price-summary">
                  <div class="price-row">
                    <span>${room.price_per_night} × {totalNights} nights</span>
                    <span>${totalPrice}</span>
                  </div>
                  <div class="price-total">
                    <span>Total</span>
                    <span>${totalPrice}</span>
                  </div>
                </div>
              {/if}

              <button 
                class="btn-book" 
                onclick={handleBooking}
                disabled={bookingLoading || !checkInDate || !checkOutDate || totalGuests < 1 || totalGuests > 4 || adults < 1}
              >
                {bookingLoading ? 'Booking...' : 'Book Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .room-details-page {
    min-height: calc(100vh - 70px);
    background: #f5f7fa;
    padding: 2rem 1rem;
  }
  
  .container {
    max-width: 1200px;
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
  
  .room-details {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .room-gallery {
    position: relative;
  }

  .main-image {
    position: relative;
    width: 100%;
    height: 500px;
    background: #000;
  }

  .main-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    font-size: 2rem;
    cursor: pointer;
    transition: background 0.2s;
    backdrop-filter: blur(5px);
  }

  .nav-btn:hover {
    background: rgba(0, 0, 0, 0.7);
  }

  .prev-btn {
    left: 1rem;
  }

  .next-btn {
    right: 1rem;
  }

  .image-counter {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    backdrop-filter: blur(5px);
  }

  .thumbnail-gallery {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    background: #f8f9fa;
  }

  .thumbnail {
    flex-shrink: 0;
    width: 100px;
    height: 70px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 3px solid transparent;
    transition: all 0.2s;
  }

  .thumbnail:hover {
    opacity: 0.8;
  }

  .thumbnail.active {
    border-color: #667eea;
  }

  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .room-info-section {
    padding: 2rem;
  }
  
  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 2rem;
  }
  
  .room-header h1 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
  }
  
  .room-type {
    color: #667eea;
    font-weight: 600;
    margin: 0;
  }
  
  .room-description, .room-features, .booking-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e1e8ed;
  }
  
  h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
  }
  
  .room-description p {
    color: #7f8c8d;
    line-height: 1.6;
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .feature {
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .booked-dates-info {
    background: #fff3cd;
    border: 1px solid #ffc107;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .booked-dates-info p {
    margin: 0 0 0.5rem 0;
    color: #856404;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .booked-dates-info p.hint {
    font-weight: 400;
    font-size: 0.85rem;
    margin: 0;
  }

  .conflict-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-weight: 600;
    text-align: center;
  }
  
  .date-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .guests-section {
    margin-bottom: 1.5rem;
  }
  
  .guests-section h4 {
    color: #2c3e50;
    margin-bottom: 1rem;
    font-size: 1rem;
  }
  
  .guest-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .guest-count {
    color: #667eea;
    font-weight: 600;
    margin: 0.5rem 0 0 0;
    font-size: 0.95rem;
  }
  
  .input-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #2c3e50;
  }
  
  .input-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1.5px solid #e1e8ed;
    border-radius: 6px;
    font-size: 1rem;
  }

  .input-group input[readonly] {
    background-color: white;
    cursor: pointer;
  }
  
  .input-group input[type="number"] {
    text-align: center;
  }
  
  .price-summary {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }
  
  .price-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    color: #2c3e50;
  }
  
  .price-total {
    display: flex;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 2px solid #e1e8ed;
    font-weight: 700;
    font-size: 1.25rem;
    color: #2c3e50;
  }
  
  .btn-book {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  
  .btn-book:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  .btn-book:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    .main-image {
      height: 300px;
    }

    .date-inputs, .guest-inputs {
      grid-template-columns: 1fr;
    }

    .thumbnail-gallery {
      padding: 0.5rem;
    }

    .thumbnail {
      width: 80px;
      height: 56px;
    }
  }
</style>
