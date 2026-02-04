<script>
  import { link, location } from 'svelte-spa-router';
  import { authAPI } from '../lib/api.js';
  import { push } from 'svelte-spa-router';

  let mobileMenuOpen = $state(false);

  const navLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/bookings', label: 'Bookings', icon: '📅' },
    { path: '/admin/customers', label: 'Customers', icon: '👥' },
    { path: '/admin/employees', label: 'Employees', icon: '👔' },
    { path: '/admin/payments', label: 'Payments', icon: '💳' },
    { path: '/admin/reports', label: 'Reports', icon: '📈' },
    { path: '/admin/rooms', label: 'Rooms', icon: '🏨' }
  ];

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  async function handleLogout() {
    try {
      await authAPI.logout();
      push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      push('/login');
    }
  }

  function isActive(path) {
    return $location === path;
  }
</script>

<nav class="admin-navbar">
  <div class="navbar-container">
    <!-- Logo/Brand -->
    <div class="navbar-brand">
      <a href="/admin/dashboard" use:link>
        <span class="brand-icon">🏨</span>
        <span class="brand-text">Hotel Admin</span>
      </a>
    </div>

    <!-- Desktop Navigation Links -->
    <div class="navbar-links">
      {#each navLinks as navLink}
        <a 
          href={navLink.path} 
          use:link
          class="nav-link"
          class:active={isActive(navLink.path)}
        >
          <span class="nav-icon">{navLink.icon}</span>
          <span class="nav-label">{navLink.label}</span>
        </a>
      {/each}
    </div>

    <!-- Right Side - User Menu -->
    <div class="navbar-actions">
      <button class="btn-logout" onclick={handleLogout}>
        <span>🚪</span>
        <span>Logout</span>
      </button>

      <!-- Mobile Menu Toggle -->
      <button class="mobile-menu-toggle" onclick={toggleMobileMenu}>
        <span class="menu-icon">{mobileMenuOpen ? '✕' : '☰'}</span>
      </button>
    </div>
  </div>

  <!-- Mobile Menu -->
  {#if mobileMenuOpen}
    <div class="mobile-menu">
      {#each navLinks as navLink}
        <a 
          href={navLink.path} 
          use:link
          class="mobile-nav-link"
          class:active={isActive(navLink.path)}
          onclick={() => mobileMenuOpen = false}
        >
          <span class="nav-icon">{navLink.icon}</span>
          <span class="nav-label">{navLink.label}</span>
        </a>
      {/each}
      
      <button class="mobile-logout" onclick={handleLogout}>
        <span>🚪</span>
        <span>Logout</span>
      </button>
    </div>
  {/if}
</nav>

<style>
  .admin-navbar {
    background: #1e293b;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .navbar-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    height: 70px;
  }

  /* Brand */
  .navbar-brand a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    transition: opacity 0.2s;
  }

  .navbar-brand a:hover {
    opacity: 0.8;
  }

  .brand-icon {
    font-size: 1.75rem;
  }

  .brand-text {
    font-size: 1.25rem;
  }

  /* Navigation Links */
  .navbar-links {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    color: #cbd5e1;
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .nav-link:hover {
    background: #334155;
    color: white;
  }

  .nav-link.active {
    background: #3b82f6;
    color: white;
  }

  .nav-icon {
    font-size: 1.1rem;
  }

  .nav-label {
    font-size: 0.95rem;
  }

  /* Actions */
  .navbar-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .btn-logout {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 0.95rem;
  }

  .btn-logout:hover {
    background: #dc2626;
  }

  /* Mobile Menu Toggle */
  .mobile-menu-toggle {
    display: none;
    background: none;
    border: none;
    color: white;
    font-size: 1.75rem;
    cursor: pointer;
    padding: 0.5rem;
  }

  .menu-icon {
    display: block;
  }

  /* Mobile Menu */
  .mobile-menu {
    display: none;
    background: #0f172a;
    border-top: 1px solid #334155;
    padding: 1rem;
  }

  .mobile-nav-link {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    color: #cbd5e1;
    text-decoration: none;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    transition: all 0.2s;
    font-weight: 500;
  }

  .mobile-nav-link:hover {
    background: #1e293b;
    color: white;
  }

  .mobile-nav-link.active {
    background: #3b82f6;
    color: white;
  }

  .mobile-logout {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    margin-top: 1rem;
    font-size: 1rem;
  }

  .mobile-logout:hover {
    background: #dc2626;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .navbar-links {
      display: none;
    }

    .btn-logout {
      display: none;
    }

    .mobile-menu-toggle {
      display: block;
    }

    .mobile-menu {
      display: block;
    }
  }

  @media (max-width: 768px) {
    .navbar-container {
      padding: 0 1rem;
      height: 60px;
    }

    .brand-text {
      font-size: 1.1rem;
    }

    .brand-icon {
      font-size: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .brand-text {
      display: none;
    }
  }
</style>