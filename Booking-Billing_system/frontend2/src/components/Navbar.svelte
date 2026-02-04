<script>
  import { link, push } from 'svelte-spa-router';
  import { authStore } from '../lib/stores.js';
  import { authAPI } from '../lib/api.js';

  let user = $state(null);
  let isAuthenticated = $state(false);
  let mobileMenuOpen = $state(false);

  authStore.subscribe(state => {
    user = state.user;
    isAuthenticated = state.isAuthenticated;
  });

  async function handleLogout() {
    try {
      await authAPI.logout();
      authStore.clearUser();
      push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<nav class="navbar">
  <div class="container">
    <a href={isAuthenticated ? "/customer/dashboard" : "/"} use:link class="brand">
      <img src="/2.png" alt="Luxury Hotel Logo" class="logo" />
      <span>Luxury Hotel</span>
    </a>
    
    <button class="mobile-toggle" onclick={toggleMobileMenu} aria-label="Toggle menu">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <div class="nav-links {mobileMenuOpen ? 'active' : ''}">
      {#if isAuthenticated}
        <a href="/customer/rooms" use:link onclick={toggleMobileMenu}>Rooms</a>
        <a href="/customer/bookings" use:link onclick={toggleMobileMenu}>My Bookings</a>
        <a href="/customer/profile" use:link onclick={toggleMobileMenu}>Profile</a>
        <button class="btn-logout" onclick={handleLogout}>Logout</button>
      {:else}
        <a href="/login" use:link onclick={toggleMobileMenu}>Login</a>
        <a href="/signup" use:link class="btn-signup" onclick={toggleMobileMenu}>Sign Up</a>
      {/if}
    </div>
  </div>
</nav>

<style>
  .navbar {
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: #2c3e50;
    transition: opacity 0.2s;
  }
  
  .brand:hover {
    opacity: 0.8;
  }
  
  .logo {
    height: 45px;
    width: auto;
    object-fit: contain;
  }
  
  .mobile-toggle {
    display: none;
    flex-direction: column;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
  }
  
  .mobile-toggle span {
    width: 25px;
    height: 3px;
    background: #2c3e50;
    margin: 3px 0;
    transition: 0.3s;
  }
  
  .nav-links {
    display: flex;
    gap: 2rem;
    align-items: center;
  }
  
  .nav-links a {
    color: #2c3e50;
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .nav-links a:hover {
    color: #667eea;
  }
  
  .btn-signup {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white !important;
    padding: 0.5rem 1.5rem;
    border-radius: 6px;
  }
  
  .btn-logout {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 0.5rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
  }
  
  .btn-logout:hover {
    background: #c0392b;
  }
  
  @media (max-width: 768px) {
    .mobile-toggle {
      display: flex;
    }
    
    .brand {
      font-size: 1.2rem;
    }
    
    .logo {
      height: 35px;
    }
    
    .nav-links {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      flex-direction: column;
      padding: 1rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      display: none;
    }
    
    .nav-links.active {
      display: flex;
    }
  }
</style>