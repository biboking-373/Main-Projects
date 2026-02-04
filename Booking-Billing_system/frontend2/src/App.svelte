<script>
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { onMount } from 'svelte';
  import { authStore } from './lib/stores.js';
  import { authAPI } from './lib/api.js';
  import { get } from 'svelte/store';
  
  // Public pages
  import LandingPage from './routes/LandingPage.svelte';
  import Login from './routes/Login.svelte';
  import Signup from './routes/Signup.svelte';
  import ForgotPassword from './routes/ForgotPassword.svelte';
  import ResetPassword from './routes/ResetPassword.svelte';

  // Customer pages
  import CustomerDashboard from './routes/customer/dashboard.svelte';
  import CustomerRooms from './routes/customer/rooms.svelte';
  import CustomerRoomDetails from './routes/customer/roomdetails.svelte';
  import CustomerBookings from './routes/customer/bookings.svelte';
  import CustomerBookingDetails from './routes/customer/bookingdetails.svelte';
  import CustomerProfile from './routes/customer/profile.svelte';
  import CustomerSettings from './routes/customer/Settings.svelte';
  import CustomerPayment from './routes/customer/payment.svelte';

  // Admin pages
  import AdminDashboard from './routes/admin/Dashboard.svelte';
  import AdminBookingPage from './routes/admin/Bookings.svelte';
  import AdminCustomersPage from './routes/admin/Customers.svelte';
  import AdminAddsEmployeesPage from './routes/admin/Employees.svelte';
  import AdminsPaymentsPage from './routes/admin/Payments.svelte';
  import AdminRoomsPage from './routes/admin/Rooms.svelte';

  // Employee pages
  import EmployeeDashboard from './routes/Receptionists/EmployeeDashboard.svelte';
  import EmployeeBookings from './routes/Receptionists/EmployeeBookings.svelte';
  import EmployeePayments from './routes/Receptionists/EmployeePayment.svelte';
  import EmployeeRooms from './routes/Receptionists/EmployeeRooms.svelte';
  import EmployeeCustomers from './routes/Receptionists/EmployeeCustomers.svelte';
  import EmployeeProfile from './routes/Receptionists/EmployeeProfile.svelte';
  let authChecked = $state(false);

  // CENTRALIZED: Define public routes in one place
  const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

  function isPublicRoute(path) {
    // Remove hash and query params, then check if it's public
    const cleanPath = path.replace('#', '').split('?')[0];
    return PUBLIC_ROUTES.includes(cleanPath);
  }

  onMount(async () => {
    const currentHash = window.location.hash;
    const currentPath = currentHash.replace('#', '').split('?')[0];
    
    console.log('🔍 Current path:', currentPath);
    console.log('🔍 Is public route:', isPublicRoute(currentHash));
    
    // If on a public route, skip auth check
    if (isPublicRoute(currentHash)) {
      console.log('✅ Public route - skipping auth check');
      authStore.clearUser();
      authChecked = true;
      return;
    }

    // For protected routes, check authentication
    try {
      const response = await authAPI.getCurrentUser();
      authStore.setUser(response.user);
      console.log('✅ User authenticated');
    } catch (err) {
      authStore.clearUser();
      console.log('❌ User not authenticated - will redirect via router');
    } finally {
      authChecked = true;
    }
  });

  function requireAuth(detail) {
    const state = get(authStore);
    
    if (!state.isAuthenticated) {
      if (detail && detail.location) {
        localStorage.setItem('redirectAfterLogin', detail.location);
      }
      return '/login';
    }
    return true;
  }

  function requireAdmin(detail) {
    const state = get(authStore);
    
    if (!state.isAuthenticated) {
      if (detail && detail.location) {
        localStorage.setItem('redirectAfterLogin', detail.location);
      }
      return '/login';
    }
    
    // Admin role_id = 3
    if (state.user.role_id !== 3) {
      // Redirect non-admins to their appropriate dashboard
      if (state.user.role_id === 2) {
        return '/employee/dashboard';
      }
      return '/customer/dashboard';
    }
    return true;
  }

  function requireEmployee(detail) {
    const state = get(authStore);
    
    if (!state.isAuthenticated) {
      if (detail && detail.location) {
        localStorage.setItem('redirectAfterLogin', detail.location);
      }
      return '/login';
    }
    
    // Employee role_id = 2, Admin role_id = 3
    if (state.user.role_id !== 2 && state.user.role_id !== 3) {
      return '/customer/dashboard';
    }
    return true;
  }

  const routes = {
    '/': LandingPage,
    '/login': Login,
    '/signup': Signup,
    '/forgot-password': ForgotPassword,
    '/reset-password': ResetPassword,

    // Customer protected routes
    '/customer/dashboard': wrap({
      component: CustomerDashboard,
      conditions: [requireAuth]
    }),
    '/customer/rooms': wrap({
      component: CustomerRooms,
      conditions: [requireAuth]
    }),
    '/customer/rooms/:id': wrap({
      component: CustomerRoomDetails,
      conditions: [requireAuth]
    }),
    '/customer/bookings': wrap({
      component: CustomerBookings,
      conditions: [requireAuth]
    }),
    '/customer/bookings/:id': wrap({
      component: CustomerBookingDetails,
      conditions: [requireAuth]
    }),
    '/customer/payment/:bookingId': wrap({
      component: CustomerPayment,
      conditions: [requireAuth]
    }),
    '/customer/profile': wrap({
      component: CustomerProfile,
      conditions: [requireAuth]
    }),
    '/customer/settings': wrap({
      component: CustomerSettings,
      conditions: [requireAuth]
    }),

    // Admin protected routes
    '/admin/dashboard': wrap({
      component: AdminDashboard,
      conditions: [requireAdmin]
    }),
    '/admin/bookings': wrap({
      component: AdminBookingPage,
      conditions: [requireAdmin]
    }),
    '/admin/customers': wrap({
      component: AdminCustomersPage,
      conditions: [requireAdmin]
    }),
    '/admin/employees': wrap({
      component: AdminAddsEmployeesPage,
      conditions: [requireAdmin]
    }),
    '/admin/rooms': wrap({
      component: AdminRoomsPage,
      conditions: [requireAdmin]
    }),
    '/admin/payments': wrap({
      component: AdminsPaymentsPage,
      conditions: [requireAdmin]
    }),

    // Employee protected routes (accessible by employees and admins)
    '/employee/dashboard': wrap({
      component: EmployeeDashboard,
      conditions: [requireEmployee]
    }),
    '/employee/bookings': wrap({
      component: EmployeeBookings,
      conditions: [requireEmployee]
    }),
    '/employee/payments': wrap({
      component: EmployeePayments,
      conditions: [requireEmployee]
    }),
    '/employee/rooms': wrap({
      component: EmployeeRooms,
      conditions: [requireEmployee]
    }),
    '/employee/customers': wrap({
      component: EmployeeCustomers,
      conditions: [requireEmployee]
    }),
    '/employee/profile': wrap({
      component: EmployeeProfile,
      conditions: [requireEmployee]
    }),
  };
</script>

{#if authChecked}
  <Router {routes} />
{:else}
  <div class="loading-screen">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    background: #f5f7fa;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  :global(*) {
    box-sizing: border-box;
  }
  
  :global(a) {
    text-decoration: none;
  }
  
  .loading-screen {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    color: #666;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>