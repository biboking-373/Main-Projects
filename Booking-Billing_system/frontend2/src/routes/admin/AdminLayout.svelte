<!-- frontend2/src/admin/AdminLayout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { authAPI } from '../../lib/api';

  export let currentPage = 'dashboard';

  let user = null;
  let sidebarOpen = true;
  let mobileMenuOpen = false;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart', href: '/#/admin/dashboard' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar', href: '/#/admin/bookings' },
    { id: 'rooms', label: 'Rooms', icon: 'home', href: '/#/admin/rooms' },
    { id: 'employees', label: 'Employees', icon: 'users', href: '/#/admin/employees' },
    { id: 'customers', label: 'Customers', icon: 'user-group', href: '/#/admin/customers' },
    { id: 'payments', label: 'Payments', icon: 'dollar', href: '/#/admin/payments' },
    { id: 'reports', label: 'Reports', icon: 'document', href: '/#/admin/reports' }
  ];

  onMount(async () => {
    try {
      const response = await authAPI.getCurrentUser();
      user = response.data;
      
      // Redirect if not admin
      if (user.role !== 'admin') {
        window.location.href = '/#/';
      }
    } catch (error) {
      window.location.href = '/#/login';
    }
  });

  async function handleLogout() {
    try {
      await authAPI.logout();
      window.location.href = '/#/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function getIcon(iconName) {
    const icons = {
      chart: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />',
      calendar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />',
      home: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />',
      users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />',
      'user-group': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />',
      dollar: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
      document: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />'
    };
    return icons[iconName] || icons.chart;
  }
</script>

<div class="min-h-screen bg-gray-100">
  <!-- Mobile menu button -->
  <div class="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30 px-4 py-3">
    <div class="flex items-center justify-between">
      <button
        on:click={toggleMobileMenu}
        class="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 class="text-lg font-semibold text-gray-900">Admin Panel</h1>
      <div class="w-10"></div>
    </div>
  </div>

  <!-- Sidebar -->
  <aside
    class="fixed top-0 left-0 z-40 h-screen transition-transform {sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
  >
    <!-- Logo -->
    <div class="flex items-center justify-between h-16 px-4 border-b border-gray-800">
      {#if sidebarOpen}
        <span class="text-xl font-bold text-white">Hotel Admin</span>
      {/if}
      <button
        on:click={toggleSidebar}
        class="hidden lg:block p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if sidebarOpen}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          {/if}
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {#each navItems as item}
        <a
          href={item.href}
          class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition {currentPage === item.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
          title={item.label}
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {@html getIcon(item.icon)}
          </svg>
          {#if sidebarOpen}
            <span class="ml-3">{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <!-- User Profile -->
    <div class="border-t border-gray-800 p-4">
      {#if user}
        <div class="flex items-center {sidebarOpen ? '' : 'justify-center'}">
          <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {#if sidebarOpen}
            <div class="ml-3 flex-1">
              <p class="text-sm font-medium text-white">{user.name}</p>
              <p class="text-xs text-gray-400">{user.role}</p>
            </div>
          {/if}
        </div>
        {#if sidebarOpen}
          <button
            on:click={handleLogout}
            class="mt-3 w-full px-3 py-2 text-sm text-left text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            Logout
          </button>
        {/if}
      {/if}
    </div>
  </aside>

  <!-- Main Content -->
  <div class="transition-all {sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pt-16 lg:pt-0">
    <slot />
  </div>

  <!-- Mobile menu overlay -->
  {#if mobileMenuOpen}
    <div
      class="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
      on:click={toggleMobileMenu}
    ></div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>