<script>
  import { onMount } from 'svelte';
  import { Chart } from 'chart.js/auto';
  import { adminBookingsAPI, adminPaymentsAPI, adminRoomsAPI, adminCustomersAPI, adminEmployeesAPI } from '../../lib/adminAPI';
  import AdminNavbar from '../../components/Admin-Navbar.svelte';

  let stats = $state({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    checkedInBookings: 0,
    checkedOutBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    paidRevenue: 0,
    partialRevenue: 0,
    failedRevenue: 0,
    occupancyRate: 0,
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    maintenanceRooms: 0,
    totalCustomers: 0,
    activeEmployees: 0
  });

  let recentBookings = $state([]);
  let recentPayments = $state([]);
  let monthlyRevenue = $state([]);
  let weeklyRevenue = $state([]);
  let loading = $state(true);
  let error = $state(null);

  // Chart references
  let revenueChart;
  let bookingsChart;
  let occupancyChart;
  let paymentStatusChart;
  let roomStatusChart;
  let monthlyTrendChart;

  // Chart canvas elements
  let revenueChartCanvas;
  let bookingsChartCanvas;
  let occupancyChartCanvas;
  let paymentStatusChartCanvas;
  let roomStatusChartCanvas;
  let monthlyTrendChartCanvas;

  onMount(async () => {
    await loadDashboardData();
    initializeCharts();
  });

  async function loadDashboardData() {
    try {
      loading = true;
      error = null;

      // Fetch all data in parallel
      const [bookingsRes, paymentsRes, paymentStatsRes, roomsRes, customersRes, employeesRes] = await Promise.allSettled([
        adminBookingsAPI.getAll({ page: 1, limit: 100 }), // Get more for analytics
        adminPaymentsAPI.getAll({ page: 1, limit: 100 }),
        adminPaymentsAPI.getStatistics(),
        adminRoomsAPI?.getAll ? adminRoomsAPI.getAll() : Promise.resolve({ data: [], total: 0 }),
        adminCustomersAPI?.getAll ? adminCustomersAPI.getAll() : Promise.resolve({ data: [], total: 0 }),
        adminEmployeesAPI?.getAll ? adminEmployeesAPI.getAll() : Promise.resolve({ data: [], total: 0 })
      ]);

      // Process Bookings
      if (bookingsRes.status === 'fulfilled') {
        const bookingsData = bookingsRes.value;
        const allBookings = bookingsData.data || bookingsData.bookings || [];
        recentBookings = allBookings.slice(0, 5);
        stats.totalBookings = bookingsData.total || allBookings.length;
        stats.pendingBookings = allBookings.filter(b => b.status?.toLowerCase() === 'pending').length;
        stats.confirmedBookings = allBookings.filter(b => b.status?.toLowerCase() === 'confirmed').length;
        stats.checkedInBookings = allBookings.filter(b => b.status?.toLowerCase() === 'checked in' || b.status?.toLowerCase() === 'checked_in').length;
        stats.checkedOutBookings = allBookings.filter(b => b.status?.toLowerCase() === 'checked out' || b.status?.toLowerCase() === 'checked_out').length;
        stats.cancelledBookings = allBookings.filter(b => b.status?.toLowerCase() === 'cancelled').length;
      } else {
        console.error('Bookings error:', bookingsRes.reason);
        recentBookings = [];
      }

      // Process Payments
      if (paymentsRes.status === 'fulfilled') {
        const paymentsData = paymentsRes.value;
        const allPayments = paymentsData.data || paymentsData.payments || [];
        recentPayments = allPayments.slice(0, 5);
        
        console.log('=== PAYMENT DEBUGGING ===');
        console.log('Total payments fetched:', allPayments.length);
        console.log('First 3 payments:', allPayments.slice(0, 3));
        console.log('Payment structure:', {
          hasAmount: !!allPayments[0]?.amount,
          hasTotalAmount: !!allPayments[0]?.total_amount,
          hasPaymentDate: !!allPayments[0]?.payment_date,
          hasCreatedAt: !!allPayments[0]?.created_at,
          sampleAmount: allPayments[0]?.amount || allPayments[0]?.total_amount,
          sampleDate: allPayments[0]?.payment_date || allPayments[0]?.created_at
        });
        
        // Calculate payment status counts
        const paidCount = allPayments.filter(p => p.status?.toLowerCase() === 'paid' || p.status?.toLowerCase() === 'completed').length;
        const pendingCount = allPayments.filter(p => p.status?.toLowerCase() === 'pending').length;
        const partialCount = allPayments.filter(p => p.status?.toLowerCase() === 'partial').length;
        const failedCount = allPayments.filter(p => p.status?.toLowerCase() === 'failed').length;
        const totalPayments = allPayments.length || 1;
        
        stats.paidRevenue = Math.round((paidCount / totalPayments) * 100);
        stats.pendingRevenue = Math.round((pendingCount / totalPayments) * 100);
        stats.partialRevenue = Math.round((partialCount / totalPayments) * 100);
        stats.failedRevenue = Math.round((failedCount / totalPayments) * 100);

        // Calculate monthly and weekly revenue trends
        monthlyRevenue = calculateMonthlyRevenue(allPayments);
        weeklyRevenue = calculateWeeklyRevenue(allPayments);
      } else {
        console.error('Payments error:', paymentsRes.reason);
        recentPayments = [];
        monthlyRevenue = [];
        weeklyRevenue = [];
      }

      // Process Payment Statistics
      if (paymentStatsRes.status === 'fulfilled') {
        const paymentStats = paymentStatsRes.value;
        stats.totalRevenue = paymentStats.total_revenue || 0;
      } else {
        console.error('Payment stats error:', paymentStatsRes.reason);
        stats.totalRevenue = 0;
      }

      // Process Rooms
      if (roomsRes.status === 'fulfilled') {
        const roomsData = roomsRes.value;
        const rooms = roomsData.data || roomsData.rooms || [];
        stats.totalRooms = rooms.length || roomsData.total || 0;
        stats.availableRooms = rooms.filter(r => r.status?.toLowerCase() === 'available').length;
        stats.occupiedRooms = rooms.filter(r => r.status?.toLowerCase() === 'occupied').length;
        stats.maintenanceRooms = rooms.filter(r => r.status?.toLowerCase() === 'maintenance').length;
        
        // Calculate occupancy rate
        if (stats.totalRooms > 0) {
          stats.occupancyRate = Math.round((stats.occupiedRooms / stats.totalRooms) * 100);
        }
      } else {
        console.error('Rooms error:', roomsRes.reason);
      }

      // Process Customers
      if (customersRes.status === 'fulfilled') {
        const customersData = customersRes.value;
        stats.totalCustomers = customersData.total || (customersData.data || customersData.customers || []).length;
      } else {
        console.error('Customers error:', customersRes.reason);
      }

      // Process Employees
      if (employeesRes.status === 'fulfilled') {
        const employeesData = employeesRes.value;
        const employees = employeesData.data || employeesData.employees || [];
        stats.activeEmployees = employees.filter(e => e.status === 'active' || !e.status).length || employees.length;
      } else {
        console.error('Employees error:', employeesRes.reason);
      }

    } catch (err) {
      console.error('Error loading dashboard:', err);
      error = err.response?.data?.message || 'Failed to load dashboard data';
    } finally {
      loading = false;
    }
  }

  function calculateMonthlyRevenue(payments) {
    const monthlyData = [];
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      monthlyData.push({ month, year, amount: 0 });
    }

    // Aggregate payments by month
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount || payment.total_amount || 0);
      const dateStr = payment.payment_date || payment.created_at || payment.date;
      
      if (dateStr && amount > 0) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const paymentMonth = date.toLocaleString('en-US', { month: 'short' });
          const paymentYear = date.getFullYear();
          
          const monthEntry = monthlyData.find(m => m.month === paymentMonth && m.year === paymentYear);
          if (monthEntry) {
            monthEntry.amount += amount;
          }
        }
      }
    });

    console.log('Monthly Revenue Data:', monthlyData);
    return monthlyData;
  }

  function calculateWeeklyRevenue(payments) {
    const weeklyData = [
      { week: 'Week 1', amount: 0 },
      { week: 'Week 2', amount: 0 },
      { week: 'Week 3', amount: 0 },
      { week: 'Week 4', amount: 0 }
    ];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    payments.forEach(payment => {
      const amount = parseFloat(payment.amount || payment.total_amount || 0);
      const dateStr = payment.payment_date || payment.created_at || payment.date;
      
      if (dateStr && amount > 0) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && 
            date.getMonth() === currentMonth && 
            date.getFullYear() === currentYear) {
          const day = date.getDate();
          const weekIndex = Math.min(Math.ceil(day / 7) - 1, 3);
          weeklyData[weekIndex].amount += amount;
        }
      }
    });

    console.log('Weekly Revenue Data:', weeklyData);
    return weeklyData;
  }

  function initializeCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          backgroundColor: '#111827',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#2563eb',
          borderWidth: 1
        }
      }
    };

    // Monthly Revenue Trend Chart
    if (monthlyTrendChartCanvas && monthlyRevenue.length > 0) {
      const hasData = monthlyRevenue.some(m => m.amount > 0);
      
      if (!hasData) {
        console.warn('No monthly revenue data available');
      }
      
      monthlyTrendChart = new Chart(monthlyTrendChartCanvas, {
        type: 'line',
        data: {
          labels: monthlyRevenue.map(m => m.month),
          datasets: [{
            label: 'Revenue',
            data: monthlyRevenue.map(m => m.amount),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: { display: false },
            tooltip: {
              ...commonOptions.plugins.tooltip,
              callbacks: {
                label: (context) => 'KSh ' + context.parsed.y.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f3f4f6' },
              ticks: {
                color: '#6b7280',
                callback: (value) => {
                  if (value >= 1000000) return 'KSh ' + (value / 1000000).toFixed(1) + 'M';
                  if (value >= 1000) return 'KSh ' + (value / 1000).toFixed(0) + 'k';
                  return 'KSh ' + value.toLocaleString('en-KE');
                }
              }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#6b7280' }
            }
          }
        }
      });
    }

    // Bookings Status Chart
    if (bookingsChartCanvas) {
      bookingsChart = new Chart(bookingsChartCanvas, {
        type: 'bar',
        data: {
          labels: ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'],
          datasets: [{
            label: 'Bookings',
            data: [
              stats.pendingBookings,
              stats.confirmedBookings,
              stats.checkedInBookings,
              stats.checkedOutBookings,
              stats.cancelledBookings
            ],
            backgroundColor: ['#f59e0b', '#059669', '#2563eb', '#8b5cf6', '#ef4444'],
            borderRadius: 6,
            barThickness: 40
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f3f4f6' },
              ticks: { color: '#6b7280', precision: 0 }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#6b7280' }
            }
          }
        }
      });
    }

    // Occupancy Rate Doughnut Chart
    if (occupancyChartCanvas && stats.totalRooms > 0) {
      occupancyChart = new Chart(occupancyChartCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Occupied', 'Available'],
          datasets: [{
            data: [stats.occupancyRate, 100 - stats.occupancyRate],
            backgroundColor: ['#2563eb', '#e5e7eb'],
            borderWidth: 0
          }]
        },
        options: {
          ...commonOptions,
          cutout: '75%',
          plugins: {
            ...commonOptions.plugins,
            legend: {
              position: 'bottom',
              labels: {
                color: '#6b7280',
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              ...commonOptions.plugins.tooltip,
              callbacks: {
                label: (context) => context.label + ': ' + context.parsed + '%'
              }
            }
          }
        }
      });
    }

    // Payment Status Pie Chart
    if (paymentStatusChartCanvas) {
      paymentStatusChart = new Chart(paymentStatusChartCanvas, {
        type: 'pie',
        data: {
          labels: ['Paid', 'Pending', 'Partial', 'Failed'],
          datasets: [{
            data: [
              stats.paidRevenue,
              stats.pendingRevenue,
              stats.partialRevenue,
              stats.failedRevenue
            ],
            backgroundColor: ['#059669', '#f59e0b', '#8b5cf6', '#ef4444'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: {
              position: 'bottom',
              labels: {
                color: '#6b7280',
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              ...commonOptions.plugins.tooltip,
              callbacks: {
                label: (context) => context.label + ': ' + context.parsed + '%'
              }
            }
          }
        }
      });
    }

    // Room Status Chart
    if (roomStatusChartCanvas && stats.totalRooms > 0) {
      roomStatusChart = new Chart(roomStatusChartCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Occupied', 'Available', 'Maintenance'],
          datasets: [{
            data: [
              stats.occupiedRooms,
              stats.availableRooms,
              stats.maintenanceRooms
            ],
            backgroundColor: ['#2563eb', '#059669', '#f59e0b'],
            borderWidth: 0
          }]
        },
        options: {
          ...commonOptions,
          cutout: '65%',
          plugins: {
            ...commonOptions.plugins,
            legend: {
              position: 'bottom',
              labels: {
                color: '#6b7280',
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          }
        }
      });
    }

    // Revenue Distribution Chart
    if (revenueChartCanvas && weeklyRevenue.length > 0) {
      const hasData = weeklyRevenue.some(w => w.amount > 0);
      
      if (!hasData) {
        console.warn('No weekly revenue data available');
      }
      
      revenueChart = new Chart(revenueChartCanvas, {
        type: 'bar',
        data: {
          labels: weeklyRevenue.map(w => w.week),
          datasets: [{
            label: 'Revenue',
            data: weeklyRevenue.map(w => w.amount),
            backgroundColor: '#059669',
            borderRadius: 6,
            barThickness: 50
          }]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            legend: { display: false },
            tooltip: {
              ...commonOptions.plugins.tooltip,
              callbacks: {
                label: (context) => 'KSh ' + context.parsed.y.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: '#f3f4f6' },
              ticks: {
                color: '#6b7280',
                callback: (value) => {
                  if (value >= 1000000) return 'KSh ' + (value / 1000000).toFixed(1) + 'M';
                  if (value >= 1000) return 'KSh ' + (value / 1000).toFixed(0) + 'k';
                  return 'KSh ' + value.toLocaleString('en-KE');
                }
              }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#6b7280' }
            }
          }
        }
      });
    }
  }

  function formatCurrency(amount) {
    return `KSh ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function getStatusClass(status) {
    return `status-${status?.toLowerCase() || 'unknown'}`;
  }
</script>

<AdminNavbar />

<div class="container">
  <div class="header">
    <h1>Dashboard</h1>
    <p class="subtitle">Welcome to your hotel management dashboard</p>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading dashboard data...</p>
    </div>
  {:else if error}
    <div class="error-box">
      <strong>Error:</strong> {error}
      <button class="retry-btn" onclick={loadDashboardData}>
        Retry
      </button>
    </div>
  {:else}
    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Total Bookings</p>
            <p class="stat-value">{stats.totalBookings}</p>
          </div>
          <div class="stat-icon blue">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        {#if stats.pendingBookings > 0}
          <p class="stat-detail">{stats.pendingBookings} pending • {stats.confirmedBookings} confirmed</p>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Total Revenue</p>
            <p class="stat-value">{formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div class="stat-icon green">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        {#if stats.pendingRevenue > 0}
          <p class="stat-detail">{formatCurrency(stats.pendingRevenue)} pending</p>
        {/if}
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Occupancy Rate</p>
            <p class="stat-value">{stats.occupancyRate}%</p>
          </div>
          <div class="stat-icon purple">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
        <p class="stat-detail">{stats.availableRooms}/{stats.totalRooms} available • {stats.occupiedRooms} occupied</p>
      </div>

      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-info">
            <p class="stat-label">Total Customers</p>
            <p class="stat-value">{stats.totalCustomers}</p>
          </div>
          <div class="stat-icon indigo">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
        <p class="stat-detail">{stats.activeEmployees} active employees</p>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-section">
      <!-- Top Row - Large Charts -->
      <div class="chart-card large">
        <div class="chart-header">
          <h2>Revenue Trend</h2>
          <span class="chart-period">Last 6 Months</span>
        </div>
        <div class="chart-container">
          <canvas bind:this={monthlyTrendChartCanvas}></canvas>
        </div>
      </div>

      <div class="chart-card large">
        <div class="chart-header">
          <h2>Bookings by Status</h2>
          <span class="chart-period">Current Overview</span>
        </div>
        <div class="chart-container">
          <canvas bind:this={bookingsChartCanvas}></canvas>
        </div>
      </div>

      <!-- Middle Row - Medium Charts -->
      <div class="chart-card medium">
        <div class="chart-header">
          <h2>Weekly Revenue</h2>
          <span class="chart-period">This Month</span>
        </div>
        <div class="chart-container">
          <canvas bind:this={revenueChartCanvas}></canvas>
        </div>
      </div>

      <div class="chart-card medium">
        <div class="chart-header">
          <h2>Occupancy Rate</h2>
          <span class="chart-period">Live Status</span>
        </div>
        <div class="chart-container small">
          <canvas bind:this={occupancyChartCanvas}></canvas>
          <div class="chart-center-text">
            <div class="center-value">{stats.occupancyRate}%</div>
            <div class="center-label">Occupied</div>
          </div>
        </div>
      </div>

      <!-- Bottom Row - Small Charts -->
      <div class="chart-card">
        <div class="chart-header">
          <h2>Room Status</h2>
          <span class="chart-period">Current</span>
        </div>
        <div class="chart-container small">
          <canvas bind:this={roomStatusChartCanvas}></canvas>
        </div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h2>Payment Status</h2>
          <span class="chart-period">Overview</span>
        </div>
        <div class="chart-container small">
          <canvas bind:this={paymentStatusChartCanvas}></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="activity-grid">
      <!-- Recent Bookings -->
      <div class="activity-card">
        <div class="activity-header">
          <h2>Recent Bookings</h2>
        </div>
        <div class="activity-content">
          {#if recentBookings.length === 0}
            <p class="empty-message">No recent bookings</p>
          {:else}
            <div class="activity-list">
              {#each recentBookings as booking}
                <div class="activity-item">
                  <div class="activity-info">
                    <p class="activity-name">
                      {booking.customer_name || booking.user_name || 'Guest'}
                    </p>
                    <p class="activity-details">
                      {booking.room_number ? `Room ${booking.room_number}` : `Room ID ${booking.room_id}`} • {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                    </p>
                  </div>
                  <span class="status-badge {getStatusClass(booking.status)}">
                    {booking.status || 'N/A'}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
          <a href="/#/admin/bookings" class="view-all-link">
            View all bookings →
          </a>
        </div>
      </div>

      <!-- Recent Payments -->
      <div class="activity-card">
        <div class="activity-header">
          <h2>Recent Payments</h2>
        </div>
        <div class="activity-content">
          {#if recentPayments.length === 0}
            <p class="empty-message">No recent payments</p>
          {:else}
            <div class="activity-list">
              {#each recentPayments as payment}
                <div class="activity-item">
                  <div class="activity-info">
                    <p class="activity-name">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p class="activity-details">
                      Booking #{payment.booking_id} • {payment.payment_method || 'N/A'} • {formatDate(payment.paid_at || payment.created_at)}
                    </p>
                  </div>
                  <span class="status-badge {getStatusClass(payment.payment_status)}">
                    {payment.payment_status || 'N/A'}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
          <a href="/#/admin/payments" class="view-all-link">
            View all payments →
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 32px;
  }

  .header h1 {
    font-size: 30px;
    font-weight: bold;
    color: #111827;
    margin: 0 0 8px 0;
  }

  .subtitle {
    color: #6b7280;
    margin: 0;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 256px;
    gap: 1rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-box {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
    padding: 16px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .retry-btn {
    padding: 0.5rem 1rem;
    background: #dc2626;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }

  .retry-btn:hover {
    background: #b91c1c;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    margin-bottom: 32px;
  }

  @media (min-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .stat-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 24px;
    transition: box-shadow 0.2s;
  }

  .stat-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .stat-content {
    display: flex;
    align-items: center;
  }

  .stat-info {
    flex: 1;
  }

  .stat-label {
    color: #6b7280;
    font-size: 14px;
    margin: 0 0 4px 0;
  }

  .stat-value {
    font-size: 30px;
    font-weight: bold;
    color: #111827;
    margin: 0;
  }

  .stat-icon {
    border-radius: 50%;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-icon.blue {
    background-color: #dbeafe;
    color: #2563eb;
  }

  .stat-icon.green {
    background-color: #d1fae5;
    color: #059669;
  }

  .stat-icon.purple {
    background-color: #e9d5ff;
    color: #9333ea;
  }

  .stat-icon.indigo {
    background-color: #e0e7ff;
    color: #4f46e5;
  }

  .stat-detail {
    font-size: 14px;
    color: #6b7280;
    margin: 8px 0 0 0;
  }

  /* Charts Section */
  .charts-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-bottom: 32px;
  }

  .chart-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .chart-card.large {
    grid-column: span 1;
  }

  .chart-card.medium {
    grid-column: span 1;
  }

  .chart-header {
    padding: 16px 24px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chart-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .chart-period {
    font-size: 12px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 4px 12px;
    border-radius: 9999px;
  }

  .chart-container {
    padding: 24px;
    height: 300px;
    position: relative;
  }

  .chart-container.small {
    height: 260px;
  }

  .chart-center-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }

  .center-value {
    font-size: 2rem;
    font-weight: 700;
    color: #2563eb;
    line-height: 1;
  }

  .center-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  .activity-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }

  @media (min-width: 1024px) {
    .activity-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .activity-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .activity-header {
    padding: 16px 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .activity-header h2 {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .activity-content {
    padding: 24px;
  }

  .empty-message {
    color: #6b7280;
    text-align: center;
    padding: 16px 0;
    margin: 0;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .activity-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid #f3f4f6;
  }

  .activity-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .activity-info {
    flex: 1;
  }

  .activity-name {
    font-weight: 500;
    color: #111827;
    margin: 0 0 4px 0;
  }

  .activity-details {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }

  .status-badge {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .status-pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-confirmed {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-cancelled {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-completed {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .status-checked_in,
  .status-checked_out {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .status-paid {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-unpaid {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-partial {
    background-color: #fed7aa;
    color: #9a3412;
  }

  .status-unknown {
    background-color: #f3f4f6;
    color: #6b7280;
  }

  .view-all-link {
    display: block;
    text-align: center;
    color: #2563eb;
    font-weight: 500;
    margin-top: 16px;
    text-decoration: none;
    transition: color 0.2s;
  }

  .view-all-link:hover {
    color: #1d4ed8;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .charts-section {
      grid-template-columns: 1fr;
    }

    .chart-card.large,
    .chart-card.medium {
      grid-column: span 1;
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 16px;
    }

    .header h1 {
      font-size: 24px;
    }

    .stat-value {
      font-size: 24px;
    }

    .chart-container {
      height: 250px;
      padding: 16px;
    }

    .chart-container.small {
      height: 220px;
    }
  }
</style>