<script>
  import { link } from 'svelte-spa-router';
  import { authStore } from '../lib/stores.js';
  import Navbar from '../components/Navbar.svelte';
  import Footer from '../components/Footer.svelte';

  let isAuthenticated = $state(false);

  authStore.subscribe(state => {
    isAuthenticated = state.isAuthenticated;
  });
</script>

<Navbar />

<div class="landing-page">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">Welcome to Luxury Hotel</h1>
      <p class="hero-subtitle">Experience comfort and elegance in every stay</p>
      <div class="hero-buttons">
        {#if isAuthenticated}
          <a href="/customer/dashboard" use:link class="btn btn-primary">Go to Dashboard</a>
          <a href="/customer/rooms" use:link class="btn btn-secondary">Browse Rooms</a>
        {:else}
          <a href="/signup" use:link class="btn btn-primary">Get Started</a>
          <a href="/login" use:link class="btn btn-secondary">Sign In</a>
        {/if}
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="features">
    <div class="container">
      <h2 class="section-title">Why Choose Us</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🏨</div>
          <h3>Luxury Rooms</h3>
          <p>Experience comfort in our well-appointed rooms with modern amenities</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Quick Booking</h3>
          <p>Book your stay in seconds with our easy-to-use platform</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">💳</div>
          <h3>Secure Payments</h3>
          <p>Safe and secure payment processing for peace of mind</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">🌟</div>
          <h3>24/7 Support</h3>
          <p>Round-the-clock customer support for all your needs</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta">
    <div class="container">
      <h2>Ready to Book Your Stay?</h2>
      <p>Join thousands of satisfied guests</p>
      <a href="/signup" use:link class="btn btn-large">Create Account</a>
    </div>
  </section>
</div>

<Footer />

<style>
  .landing-page {
    min-height: 100vh;
  }

  .hero {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8rem 2rem 6rem;
    text-align: center;
  }
  
  .hero-content {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .hero-title {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    font-weight: 700;
    line-height: 1.2;
  }
  
  .hero-subtitle {
    font-size: 1.5rem;
    margin-bottom: 2.5rem;
    opacity: 0.95;
  }
  
  .hero-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .btn {
    display: inline-block;
    padding: 1rem 2.5rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  
  .btn-primary {
    background: white;
    color: #667eea;
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
  }
  
  .btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
  }
  
  .btn-secondary:hover {
    background: white;
    color: #667eea;
  }
  
  .features {
    padding: 6rem 2rem;
    background: white;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .section-title {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: 3rem;
    color: #2c3e50;
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }
  
  .feature-card {
    text-align: center;
    padding: 2rem;
    border-radius: 12px;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  }
  
  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .feature-card h3 {
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }
  
  .feature-card p {
    color: #7f8c8d;
    line-height: 1.6;
  }
  
  .cta {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 5rem 2rem;
    text-align: center;
  }
  
  .cta h2 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  .cta p {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    opacity: 0.95;
  }
  
  .btn-large {
    padding: 1.25rem 3rem;
    font-size: 1.2rem;
    background: white;
    color: #667eea;
  }
  
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2.5rem;
    }
    
    .hero-subtitle {
      font-size: 1.2rem;
    }
    
    .features-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
