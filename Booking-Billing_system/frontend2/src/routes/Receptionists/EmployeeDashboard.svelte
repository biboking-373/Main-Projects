<script>
  import { onMount } from 'svelte';
  import { Chart } from 'chart.js/auto';
  import { employeeDashboardAPI, employeeBookingsAPI, employeePaymentsAPI } from '../../lib/employeeAPI';
  import EmployeeNavbar from '../../components/Employee-Navbar.svelte';

  let stats = {
    totalBookings: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0,
    pendingPayments: 0,
    availableRooms: 0
  };
  
  let recentBookings = [];
  let recentPayments = [];
  let loading = true;
  let error = null;

  // Chart references
  let bookingsChart;
  let revenueChart;
  let occupancyChart;
  let paymentStatusChart;

  // Chart canvas elements
  let bookingsChartCanvas;
  let revenueChartCanvas;
  let occupancyChartCanvas;
  let paymentStatusChartCanvas;

  onMount(async () => {
    await loadDashboardData();
    initializeCharts();
  });

  async function loadDashboardData() {
    try {
      loading = true;
      error = null;

      // Load recent bookings
      const bookingsResponse = await employeeBookingsAPI.getAll({
        page: 1,
        limit: 5
      });
      recentBookings = bookingsResponse.data || [];

      // Load recent payments
      const paymentsResponse = await employeePaymentsAPI.getAll({
        page: 1,
        limit: 5
      });
      recentPayments = paymentsResponse.data || [];

      // Calculate stats from data
      stats.totalBookings = bookingsResponse.total || 0;
      stats.pendingPayments = recentPayments.filter(p => p.payment_status === 'pending').length;
      
    } catch (err) {
      console.error('Dashboard error:', err);
      error = 'Failed to load dashboard data';
    } finally {
      loading = false;
    }
  }

  function initializeCharts() {
    // Bookings Trend Chart
    if (bookingsChartCanvas) {
      bookingsChart = new Chart(bookingsChartCanvas, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Bookings',
            data: [12, 19, 15, 25, 22, 30, 28],
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#059669',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#111827',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#059669',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f3f4f6'
              },
              ticks: {
                color: '#6b7280'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#6b7280'
              }
            }
          }
        }
      });
    }

    // Revenue Chart
    if (revenueChartCanvas) {
      revenueChart = new Chart(revenueChartCanvas, {
        type: 'bar',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          datasets: [{
            label: 'Revenue',
            data: [4500, 5200, 4800, 6100],
            backgroundColor: '#059669',
            borderRadius: 6,
            barThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: '#111827',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#059669',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  return '$' + context.parsed.y.toLocaleString();
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f3f4f6'
              },
              ticks: {
                color: '#6b7280',
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#6b7280'
              }
            }
          }
        }
      });
    }

    // Occupancy Rate Chart
    if (occupancyChartCanvas) {
      occupancyChart = new Chart(occupancyChartCanvas, {
        type: 'doughnut',
        data: {
          labels: ['Occupied', 'Available'],
          datasets: [{
            data: [75, 25],
            backgroundColor: ['#059669', '#e5e7eb'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
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
              backgroundColor: '#111827',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#059669',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed + '%';
                }
              }
            }
          }
        }
      });
    }

    // Payment Status Chart
    if (paymentStatusChartCanvas) {
      paymentStatusChart = new Chart(paymentStatusChartCanvas, {
        type: 'pie',
        data: {
          labels: ['Completed', 'Pending', 'Failed'],
          datasets: [{
            data: [65, 25, 10],
            backgroundColor: ['#059669', '#f59e0b', '#ef4444'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
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
              backgroundColor: '#111827',
              padding: 12,
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#059669',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed + '%';
                }
              }
            }
          }
        }
      });
    }
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getStatusColor(status) {
    return `status-${status}`;
  }
</script>

<EmployeeNavbar />

<div class="container">
  <div class="header">
    <h1>Employee Dashboard</h1>
    <p>Welcome back! Here's your overview</p>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  {:else}
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bookings">📅</div>
        <div class="stat-content">
          <p class="stat-label">Total Bookings</p>
          <p class="stat-value">{stats.totalBookings}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon check-in">✅</div>
        <div class="stat-content">
          <p class="stat-label">Today Check-ins</p>
          <p class="stat-value">{stats.todayCheckIns}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon check-out">🚪</div>
        <div class="stat-content">
          <p class="stat-label">Today Check-outs</p>
          <p class="stat-value">{stats.todayCheckOuts}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon payments">💳</div>
        <div class="stat-content">
          <p class="stat-label">Pending Payments</p>
          <p class="stat-value">{stats.pendingPayments}</p>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon rooms">🏨</div>
        <div class="stat-content">
          <p class="stat-label">Available Rooms</p>
          <p class="stat-value">{stats.availableRooms}</p>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="charts-grid">
      <!-- Bookings Trend -->
      <div class="chart-card large">
        <div class="card-header">
          <h2>Bookings Trend</h2>
          <span class="chart-period">Last 7 Days</span>
        </div>
        <div class="chart-container">
          <canvas bind:this={bookingsChartCanvas}></canvas>
        </div>
      </div>

      <!-- Revenue Chart -->
      <div class="chart-card large">
        <div class="card-header">
          <h2>Weekly Revenue</h2>
          <span class="chart-period">This Month</span>
        </div>
        <div class="chart-container">
          <canvas bind:this={revenueChartCanvas}></canvas>
        </div>
      </div>

      <!-- Occupancy Rate -->
      <div class="chart-card">
        <div class="card-header">
          <h2>Occupancy Rate</h2>
          <span class="chart-period">Current</span>
        </div>
        <div class="chart-container small">
          <canvas bind:this={occupancyChartCanvas}></canvas>
          <div class="chart-center-text">
            <div class="center-value">75%</div>
            <div class="center-label">Occupied</div>
          </div>
        </div>
      </div>

      <!-- Payment Status -->
      <div class="chart-card">
        <div class="card-header">
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
        <div class="card-header">
          <h2>Recent Bookings</h2>
          <a href="/employee/bookings" class="view-all">View All →</a>
        </div>
        <div class="card-content">
          {#if recentBookings.length === 0}
            <p class="empty-state">No recent bookings</p>
          {:else}
            <div class="activity-list">
              {#each recentBookings as booking}
                <div class="activity-item">
                  <div class="activity-info">
                    <p class="activity-title">
                      Room {booking.room_number} - {booking.user_name}
                    </p>
                    <p class="activity-meta">
                      {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                    </p>
                  </div>
                  <span class="status-badge {getStatusColor(booking.status)}">
                    {booking.status}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Recent Payments -->
      <div class="activity-card">
        <div class="card-header">
          <h2>Recent Payments</h2>
          <a href="/employee/payments" class="view-all">View All →</a>
        </div>
        <div class="card-content">
          {#if recentPayments.length === 0}
            <p class="empty-state">No recent payments</p>
          {:else}
            <div class="activity-list">
              {#each recentPayments as payment}
                <div class="activity-item">
                  <div class="activity-info">
                    <p class="activity-title">
                      {payment.customer_name || 'N/A'}
                    </p>
                    <p class="activity-meta">
                      Booking #{payment.booking_id} • {payment.payment_method}
                    </p>
                  </div>
                  <div class="payment-details">
                    <p class="payment-amount">{formatCurrency(payment.amount)}</p>
                    <span class="status-badge {getStatusColor(payment.payment_status)}">
                      {payment.payment_status}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .header p {
    color: #6b7280;
    margin: 0;
    font-size: 1rem;
  }

  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

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
    border-top-color: #059669;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: box-shadow 0.2s;
  }

  .stat-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .stat-icon {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
  }

  .stat-icon.bookings {
    background: #dbeafe;
  }

  .stat-icon.check-in {
    background: #d1fae5;
  }

  .stat-icon.check-out {
    background: #fed7aa;
  }

  .stat-icon.payments {
    background: #e9d5ff;
  }

  .stat-icon.rooms {
    background: #fef3c7;
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 0.25rem 0;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  /* Charts Grid */
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .chart-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .chart-card.large {
    grid-column: span 1;
  }

  .chart-period {
    font-size: 0.75rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
  }

  .chart-container {
    padding: 1.5rem;
    height: 280px;
    position: relative;
  }

  .chart-container.small {
    height: 240px;
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
    color: #059669;
    line-height: 1;
  }

  .center-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
  }

  /* Activity Grid */
  .activity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .activity-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .card-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }

  .view-all {
    color: #059669;
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
  }

  .view-all:hover {
    color: #047857;
  }

  .card-content {
    padding: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    margin: 0;
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .activity-item {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .activity-info {
    flex: 1;
  }

  .activity-title {
    font-weight: 500;
    color: #111827;
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
  }

  .activity-meta {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  .payment-details {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .payment-amount {
    font-weight: 600;
    color: #059669;
    margin: 0;
    font-size: 0.875rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
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

  .status-failed {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .status-refunded {
    background-color: #dbeafe;
    color: #1e40af;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }

    .chart-card.large {
      grid-column: span 1;
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .activity-grid {
      grid-template-columns: 1fr;
    }

    .stat-value {
      font-size: 1.5rem;
    }

    .charts-grid {
      gap: 1rem;
    }

    .chart-container {
      height: 240px;
    }
  }
</style>