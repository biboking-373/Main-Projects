<script>
  import { onMount, onDestroy } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { bookingsAPI, mpesaAPI } from '../../lib/api.js';

  let { params = {} } = $props();
  
  let booking = $state(null);
  let loading = $state(true);
  let error = $state('');
  let phoneNumber = $state('');
  let processing = $state(false);
  let paymentInitiated = $state(false);
  let checkoutRequestID = $state('');
  let paymentStatus = $state('');
  let intervalId = null;

  onMount(async () => {
    await loadBooking();
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  async function loadBooking() {
    loading = true;
    error = '';

    try {
      const response = await bookingsAPI.getById(params.bookingId);
      booking = response;

      // Check if already paid
      if (booking.status === 'paid') {
        push(`/customer/bookings/${params.bookingId}`);
      }
    } catch (err) {
      console.error('Load booking error:', err);
      error = err.response?.data?.message || 'Failed to load booking';
    } finally {
      loading = false;
    }
  }

  async function handleMpesaPayment(e) {
    e.preventDefault();
    error = '';
    processing = true;

    // Format phone number
    let phone = phoneNumber.trim();
    if (phone.startsWith('0')) {
      phone = '254' + phone.substring(1);
    } else if (!phone.startsWith('254')) {
      phone = '254' + phone;
    }

    // Validate phone number
    if (!/^254[17]\d{8}$/.test(phone)) {
      error = 'Invalid phone number. Use format: 0712345678 or 254712345678';
      processing = false;
      return;
    }

    try {
      console.log('Initiating M-Pesa payment...', {
        bookingId: params.bookingId,
        phoneNumber: phone
      });

      const response = await mpesaAPI.initiatePayment(params.bookingId, phone);
      
      console.log('M-Pesa payment initiated:', response);

      checkoutRequestID = response.checkoutRequestID;
      paymentInitiated = true;
      
      // Start checking payment status every 3 seconds
      startStatusCheck();

    } catch (err) {
      console.error('M-Pesa payment failed:', err);
      error = err.response?.data?.message || err.response?.data?.error || 'Failed to initiate payment. Please try again.';
      processing = false;
    }
  }

  function startStatusCheck() {
    let attempts = 0;
    const maxAttempts = 40; // Check for 2 minutes (40 * 3 seconds)

    intervalId = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(intervalId);
        error = 'Payment timeout. Please try again or contact support.';
        processing = false;
        paymentInitiated = false;
        return;
      }

      try {
        console.log(`Checking payment status... (attempt ${attempts})`);
        
        const response = await mpesaAPI.checkPaymentStatus(checkoutRequestID);
        
        console.log('Status response:', response);

        if (response.resultCode === '0' || response.status === 'success') {
          // Payment successful
          clearInterval(intervalId);
          paymentStatus = 'success';
          processing = false;
          
          // Redirect to booking details after 2 seconds
          setTimeout(() => {
            push(`/customer/bookings/${params.bookingId}`);
          }, 2000);
        } else if (response.resultCode && response.resultCode !== '0' && response.status !== 'pending') {
          // Payment failed
          clearInterval(intervalId);
          paymentStatus = 'failed';
          error = response.resultDesc || 'Payment failed. Please try again.';
          processing = false;
        }
        
      } catch (err) {
        console.error('Status check error:', err);
        // Continue checking on error (don't stop)
      }
    }, 3000); // Check every 3 seconds
  }

  function cancelPayment() {
    if (intervalId) {
      clearInterval(intervalId);
    }
    paymentInitiated = false;
    processing = false;
    checkoutRequestID = '';
    paymentStatus = '';
    error = '';
  }

  function formatCurrency(amount) {
    return `KSh ${parseFloat(amount).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<div class="payment-page">
  <div class="payment-container">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading booking details...</p>
      </div>
    {:else if booking}
      <div class="payment-header">
        <h1>💳 Complete Payment</h1>
        <p>Booking #{booking.id} - {booking.room_name}</p>
      </div>

      <div class="payment-content">
        <!-- Booking Summary -->
        <div class="booking-summary">
          <h2>Booking Summary</h2>
          
          <div class="summary-row">
            <span>Room:</span>
            <strong>{booking.room_name}</strong>
          </div>
          
          <div class="summary-row">
            <span>Check-in:</span>
            <strong>{formatDate(booking.check_in)}</strong>
          </div>
          
          <div class="summary-row">
            <span>Check-out:</span>
            <strong>{formatDate(booking.check_out)}</strong>
          </div>
          
          <div class="summary-row">
            <span>Number of Nights:</span>
            <strong>{booking.number_of_nights || Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / (1000 * 60 * 60 * 24))}</strong>
          </div>
          
          <div class="summary-row">
            <span>Guests:</span>
            <strong>{booking.number_of_guests}</strong>
          </div>
          
          <div class="summary-divider"></div>
          
          <div class="summary-row total">
            <span>Total Amount:</span>
            <strong>{formatCurrency(booking.total_price)}</strong>
          </div>
        </div>

        <!-- Payment Form -->
        {#if !paymentInitiated}
          <div class="payment-form-section">
            <h2>Pay with M-Pesa</h2>
            
            {#if error}
              <div class="alert alert-error">{error}</div>
            {/if}

            <form class="payment-form" onsubmit={handleMpesaPayment}>
              <div class="mpesa-info">
                <div class="mpesa-icon">📱</div>
                <div class="mpesa-text">
                  <h3>Lipa Na M-Pesa</h3>
                  <p>You'll receive a payment prompt on your phone</p>
                </div>
              </div>

              <div class="form-group">
                <label for="phone">M-Pesa Phone Number *</label>
                <input 
                  id="phone"
                  type="tel" 
                  bind:value={phoneNumber}
                  required 
                  placeholder="e.g., 0712345678 or 254712345678"
                  pattern="[0-9]+"
                  disabled={processing}
                />
                <small>Enter the phone number registered with M-Pesa</small>
              </div>

              <div class="amount-display">
                <span>Amount to Pay:</span>
                <strong>{formatCurrency(booking.total_price)}</strong>
              </div>

              <button type="submit" class="btn-pay" disabled={processing}>
                {processing ? 'Processing...' : `Pay ${formatCurrency(booking.total_price)}`}
              </button>

              <div class="security-note">
                🔒 Secure payment powered by Safaricom M-Pesa
              </div>
            </form>
          </div>
        {:else}
          <!-- Payment Progress -->
          <div class="payment-progress">
            {#if paymentStatus === 'success'}
              <div class="status-success">
                <div class="success-icon">✅</div>
                <h2>Payment Successful!</h2>
                <p>Your booking has been confirmed.</p>
                <p>Redirecting to booking details...</p>
              </div>
            {:else if paymentStatus === 'failed'}
              <div class="status-failed">
                <div class="failed-icon">❌</div>
                <h2>Payment Failed</h2>
                <p>{error || 'The payment could not be completed.'}</p>
                <button class="btn-retry" onclick={cancelPayment}>
                  Try Again
                </button>
              </div>
            {:else}
              <div class="status-pending">
                <div class="pending-animation">
                  <div class="pulse"></div>
                  <div class="phone-icon">📱</div>
                </div>
                <h2>Check Your Phone</h2>
                <p>A payment prompt has been sent to <strong>{phoneNumber}</strong></p>
                <ol class="instructions">
                  <li>Open the M-Pesa menu on your phone</li>
                  <li>Enter your M-Pesa PIN</li>
                  <li>Confirm the payment</li>
                </ol>
                <div class="waiting-text">
                  Waiting for payment confirmation...
                </div>
                <button class="btn-cancel" onclick={cancelPayment}>
                  Cancel Payment
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      <div class="error-state">
        <p>{error || 'Booking not found'}</p>
        <button class="btn-back" onclick={() => push('/customer/bookings')}>
          Back to Bookings
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .payment-page {
    min-height: 100vh;
    background: #f5f7fa;
    padding: 2rem 1rem;
  }

  .payment-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #00a86b;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .payment-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .payment-header h1 {
    font-size: 2rem;
    color: #2c3e50;
    margin: 0 0 0.5rem 0;
  }

  .payment-header p {
    color: #7f8c8d;
    margin: 0;
  }

  .payment-content {
    display: grid;
    gap: 2rem;
  }

  .booking-summary {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .booking-summary h2 {
    font-size: 1.25rem;
    color: #2c3e50;
    margin: 0 0 1.5rem 0;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    color: #2c3e50;
  }

  .summary-row.total {
    font-size: 1.25rem;
    color: #00a86b;
    padding-top: 1rem;
  }

  .summary-divider {
    height: 1px;
    background: #e1e8ed;
    margin: 1rem 0;
  }

  .payment-form-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .payment-form-section h2 {
    font-size: 1.25rem;
    color: #2c3e50;
    margin: 0 0 1.5rem 0;
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .alert-error {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
  }

  .mpesa-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: #e8f5e9;
    border-radius: 8px;
    margin-bottom: 1.5rem;
  }

  .mpesa-icon {
    font-size: 2.5rem;
  }

  .mpesa-text h3 {
    margin: 0 0 0.25rem 0;
    color: #00a86b;
  }

  .mpesa-text p {
    margin: 0;
    color: #5a6c57;
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1.5px solid #e1e8ed;
    border-radius: 6px;
    font-size: 1rem;
  }

  .form-group input:focus {
    outline: none;
    border-color: #00a86b;
  }

  .form-group small {
    display: block;
    margin-top: 0.5rem;
    color: #7f8c8d;
    font-size: 0.85rem;
  }

  .amount-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }

  .amount-display strong {
    color: #00a86b;
    font-size: 1.5rem;
  }

  .btn-pay {
    width: 100%;
    padding: 1rem;
    background: #00a86b;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-pay:hover:not(:disabled) {
    background: #008f5a;
  }

  .btn-pay:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .security-note {
    text-align: center;
    margin-top: 1rem;
    color: #7f8c8d;
    font-size: 0.9rem;
  }

  .payment-progress {
    background: white;
    padding: 3rem 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .status-pending,
  .status-success,
  .status-failed {
    max-width: 500px;
    margin: 0 auto;
  }

  .pending-animation {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 2rem;
  }

  .pulse {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 4px solid #00a86b;
    border-radius: 50%;
    animation: pulse 2s ease-out infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }

  .phone-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 3rem;
  }

  .success-icon,
  .failed-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .status-success h2 {
    color: #00a86b;
    margin-bottom: 1rem;
  }

  .status-failed h2 {
    color: #c33;
    margin-bottom: 1rem;
  }

  .status-pending h2,
  .status-success h2,
  .status-failed h2 {
    font-size: 1.5rem;
  }

  .instructions {
    text-align: left;
    max-width: 350px;
    margin: 2rem auto;
    padding-left: 1.5rem;
  }

  .instructions li {
    margin: 0.75rem 0;
    color: #2c3e50;
    line-height: 1.6;
  }

  .waiting-text {
    color: #7f8c8d;
    margin: 2rem 0;
    font-style: italic;
  }

  .btn-cancel,
  .btn-retry {
    padding: 0.75rem 2rem;
    background: white;
    color: #c33;
    border: 2px solid #c33;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
  }

  .btn-retry {
    color: #00a86b;
    border-color: #00a86b;
  }

  .btn-cancel:hover,
  .btn-retry:hover {
    opacity: 0.8;
  }

  .error-state {
    text-align: center;
    padding: 3rem;
  }

  .btn-back {
    padding: 0.75rem 2rem;
    background: #0071c2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .payment-page {
      padding: 1rem 0.5rem;
    }

    .payment-header h1 {
      font-size: 1.5rem;
    }

    .booking-summary,
    .payment-form-section {
      padding: 1.5rem;
    }
  }
</style>