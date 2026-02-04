<script>
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { authStore } from '../../lib/stores.js';
  import { bookingsAPI } from '../../lib/api.js';
  import Navbar from '../../components/Navbar.svelte';

  let user = $state(null);
  let stats = $state({
    totalBookings: 0,
    activeBookings: 0,
    upcomingBookings: 0
  });
  let recentBookings = $state([]);
  let bookingsArray = $state([]);
  let loading = $state(true);
  let error = $state(null);
  
  // Chart data
  let statusChartData = $state([]);
  let spendingChartData = $state([]);
  let heatmapData = $state([]);
  
  // Chart canvas refs
  let pieChartCanvas;
  let areaChartCanvas;

  $effect(() => {
    const unsubscribe = authStore.subscribe(state => {
      user = state.user;
    });
    return unsubscribe;
  });

  onMount(async () => {
    await loadDashboardData();
  });

  async function loadDashboardData() {
    try {
      loading = true;
      error = null;
      const response = await bookingsAPI.getMyBookings();
      
      console.log('API Response:', response);
      
      // Handle different response structures
      if (Array.isArray(response)) {
        bookingsArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        bookingsArray = response.data;
      } else if (response?.bookings && Array.isArray(response.bookings)) {
        bookingsArray = response.bookings;
      } else {
        bookingsArray = [];
      }
      
      console.log('Bookings Array:', $state.snapshot(bookingsArray));
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Filter bookings that have valid dates
      const bookingsWithDates = bookingsArray.filter(b => b.check_in && b.check_out);
      
      // Count active bookings
      const activeBookings = bookingsWithDates.filter(b => {
        const status = b.status?.toLowerCase();
        const checkIn = new Date(b.check_in);
        const checkOut = new Date(b.check_out);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        
        const isCurrentlyStaying = checkIn <= now && checkOut >= now && status === 'checked-in';
        const isConfirmed = status === 'confirmed';
        
        return isCurrentlyStaying || isConfirmed;
      });
      
      // Count upcoming bookings
      const upcomingBookings = bookingsWithDates.filter(b => {
        const status = b.status?.toLowerCase();
        const checkIn = new Date(b.check_in);
        checkIn.setHours(0, 0, 0, 0);
        
        const isFuture = checkIn > now;
        const isValidStatus = status !== 'cancelled' && status !== 'checked-out';
        
        return isFuture && isValidStatus;
      });
      
      stats = {
        totalBookings: bookingsArray.length,
        activeBookings: activeBookings.length,
        upcomingBookings: upcomingBookings.length
      };
      
      recentBookings = bookingsArray
        .sort((a, b) => new Date(b.created_at || b.check_in) - new Date(a.created_at || a.check_in))
        .slice(0, 5);
      
      // Prepare chart data
      prepareChartData(bookingsArray);
      
      // Render charts after data is ready
      if (typeof window !== 'undefined') {
        setTimeout(() => renderCharts(), 100);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      error = err.message || 'Failed to load dashboard data';
      recentBookings = [];
    } finally {
      loading = false;
    }
  }

  function prepareChartData(bookings) {
    // 1. Status breakdown for pie chart (all bookings)
    const statusCount = {};
    bookings.forEach(b => {
      const status = b.status || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    statusChartData = Object.entries(statusCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      percentage: ((value / bookings.length) * 100).toFixed(1)
    }));
    
    // Filter for confirmed bookings only for spending and heatmap charts
    const confirmedBookings = bookings.filter(b => 
      b.status?.toLowerCase() === 'confirmed' || 
      b.status?.toLowerCase() === 'checked-in' ||
      b.status?.toLowerCase() === 'checked-out'
    );
    
    // 2. Cumulative spending over time (confirmed bookings only)
    const spendingByMonth = {};
    confirmedBookings.forEach(b => {
      if (b.check_in && b.total_price) {
        const date = new Date(b.check_in);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!spendingByMonth[monthKey]) {
          spendingByMonth[monthKey] = { month: monthName, amount: 0, date: date };
        }
        spendingByMonth[monthKey].amount += parseFloat(b.total_price);
      }
    });
    
    const sortedSpending = Object.values(spendingByMonth).sort((a, b) => a.date - b.date);
    let cumulative = 0;
    spendingChartData = sortedSpending.map(item => {
      cumulative += item.amount;
      return {
        month: item.month,
        spending: Math.round(item.amount),
        cumulative: Math.round(cumulative)
      };
    });
    
    // 3. Booking frequency heatmap (confirmed bookings only)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const heatmap = {};
    
    months.forEach(month => {
      heatmap[month] = 0;
    });
    
    confirmedBookings.forEach(b => {
      if (b.check_in) {
        const date = new Date(b.check_in);
        const monthName = months[date.getMonth()];
        heatmap[monthName]++;
      }
    });
    
    heatmapData = months.map(month => ({
      month,
      bookings: heatmap[month]
    }));
  }

  async function renderCharts() {
    if (!pieChartCanvas || !areaChartCanvas) return;
    
    // Dynamically import Chart.js
    const Chart = await import('chart.js/auto');
    
    // Destroy existing charts
    Chart.Chart.getChart(pieChartCanvas)?.destroy();
    Chart.Chart.getChart(areaChartCanvas)?.destroy();
    
    // Pie Chart
    if (statusChartData.length > 0) {
      new Chart.Chart(pieChartCanvas, {
        type: 'pie',
        data: {
          labels: statusChartData.map(d => d.name),
          datasets: [{
            data: statusChartData.map(d => d.value),
            backgroundColor: statusChartData.map(d => {
              const colors = {
                'Confirmed': '#2e7d32',
                'Pending': '#f57f17',
                'Checked-in': '#00796b',
                'Checked-out': '#5d4037',
                'Cancelled': '#c62828'
              };
              return colors[d.name] || '#757575';
            }),
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
                color: '#1b5e20',
                font: { size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const percentage = statusChartData.find(d => d.name === label)?.percentage || 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
    
    // Area Chart (Line chart with fill)
    if (spendingChartData.length > 0) {
      new Chart.Chart(areaChartCanvas, {
        type: 'line',
        data: {
          labels: spendingChartData.map(d => d.month),
          datasets: [{
            label: 'Cumulative Spending (KES)',
            data: spendingChartData.map(d => d.cumulative),
            fill: true,
            backgroundColor: 'rgba(46, 125, 50, 0.2)',
            borderColor: '#1b5e20',
            borderWidth: 2,
            tension: 0.4,
            pointBackgroundColor: '#2e7d32',
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
              labels: {
                color: '#1b5e20',
                font: { size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `KES ${context.parsed.y.toLocaleString()}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: '#558b2f',
                callback: (value) => `KES ${value.toLocaleString()}`
              },
              grid: {
                color: 'rgba(200, 230, 201, 0.3)'
              }
            },
            x: {
              ticks: {
                color: '#558b2f'
              },
              grid: {
                color: 'rgba(200, 230, 201, 0.3)'
              }
            }
          }
        }
      });
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function getStatusClass(status) {
    if (!status) return 'pending';
    const statusLower = status.toLowerCase();
    if (statusLower === 'confirmed') return 'confirmed';
    if (statusLower === 'checked-in') return 'checked-in';
    if (statusLower === 'checked-out') return 'checked-out';
    if (statusLower === 'cancelled') return 'cancelled';
    return 'pending';
  }
</script>

<Navbar />

<div class="dashboard">
  <div class="container">
    <div class="welcome-section">
      <h1>Welcome back, {user?.name || 'Guest'}</h1>
      <p>Here's an overview of your bookings and reservations</p>
    </div>

    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>Unable to load dashboard data. Please try again.</p>
        <button onclick={loadDashboardData} class="btn-retry">Retry</button>
      </div>
    {:else}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Bookings</span>
          </div>
          <div class="stat-value">{stats.totalBookings}</div>
        </div>
        
        <div class="stat-card highlight">
          <div class="stat-header">
            <span class="stat-label">Active Bookings</span>
          </div>
          <div class="stat-value">{stats.activeBookings}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-label">Upcoming Stays</span>
          </div>
          <div class="stat-value">{stats.upcomingBookings}</div>
        </div>
      </div>

      <div class="charts-section">
        <h2>Booking Analytics</h2>
        
        <div class="charts-grid">
          <!-- Status Breakdown Pie Chart -->
          <div class="chart-card">
            <h3>Booking Status Distribution</h3>
            <div class="chart-container">
              <canvas bind:this={pieChartCanvas}></canvas>
            </div>
          </div>

          <!-- Cumulative Spending Area Chart -->
          <div class="chart-card wide">
            <h3>Cumulative Spending Over Time</h3>
            <div class="chart-container">
              <canvas bind:this={areaChartCanvas}></canvas>
            </div>
          </div>
        </div>

        <!-- Booking Frequency Heatmap -->
        <div class="chart-card full-width">
          <h3>Booking Frequency by Month</h3>
          <div class="heatmap-container">
            {#each heatmapData as item}
              <div class="heatmap-cell">
                <div 
                  class="heatmap-bar" 
                  style="height: {item.bookings === 0 ? 0 : Math.max(20, (item.bookings / Math.max(...heatmapData.map(d => d.bookings))) * 100)}%"
                  title="{item.month}: {item.bookings} booking(s)"
                >
                  <span class="heatmap-value">{item.bookings}</span>
                </div>
                <div class="heatmap-label">{item.month}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <div class="actions-grid">
          <a href="/customer/rooms" use:link class="action-card">
            <div class="action-content">
              <h3>Browse Rooms</h3>
              <p>Discover available accommodations</p>
            </div>
          </a>
          
          <a href="/customer/bookings" use:link class="action-card">
            <div class="action-content">
              <h3>My Bookings</h3>
              <p>View and manage reservations</p>
            </div>
          </a>
          
          <a href="/customer/profile" use:link class="action-card">
            <div class="action-content">
              <h3>Profile Settings</h3>
              <p>Update your information</p>
            </div>
          </a>
        </div>
      </div>

      <div class="recent-section">
        <h2>Recent Bookings</h2>
        {#if recentBookings.length > 0}
          <div class="bookings-list">
            {#each recentBookings as booking}
              <div class="booking-item">
                <div class="booking-info">
                  <h4>Room {booking.room_number || `#${booking.room_id}`}</h4>
                  <div class="booking-dates">
                    <span class="date-label">Check-in:</span>
                    <span>{formatDate(booking.check_in)}</span>
                    <span class="separator">•</span>
                    <span class="date-label">Check-out:</span>
                    <span>{formatDate(booking.check_out)}</span>
                  </div>
                </div>
                <div class="booking-actions">
                  <span class="status {getStatusClass(booking.status)}">
                    {booking.status || 'Pending'}
                  </span>
                  <a href="/customer/bookings/{booking.id}" use:link class="btn-view">
                    View Details
                  </a>
                </div>
              </div>
            {/each}
          </div>
          <a href="/customer/bookings" use:link class="view-all-link">
            View All Bookings
          </a>
        {:else}
          <div class="empty-state">
            <p>You haven't made any bookings yet</p>
            <a href="/customer/rooms" use:link class="btn-primary">
              Explore Available Rooms
            </a>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .dashboard {
    min-height: calc(100vh - 70px);
    background: linear-gradient(135deg, #e8f5e9 0%, #f1f8f4 50%, #e0f2f1 100%);
    padding: 2rem 1rem;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .welcome-section {
    margin-bottom: 2.5rem;
  }
  
  .welcome-section h1 {
    color: #1b5e20;
    font-size: 2rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  .welcome-section p {
    color: #558b2f;
    font-size: 1rem;
  }
  
  .loading-state, .error-state {
    text-align: center;
    padding: 4rem 2rem;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(27, 94, 32, 0.08);
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #c8e6c9;
    border-top-color: #2e7d32;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-state p {
    color: #c62828;
    margin-bottom: 1rem;
  }
  
  .btn-retry {
    padding: 0.75rem 1.5rem;
    background: #2e7d32;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s;
  }
  
  .btn-retry:hover {
    background: #1b5e20;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }
  
  .stat-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(27, 94, 32, 0.08);
    border: 1px solid rgba(46, 125, 50, 0.1);
    transition: transform 0.3s, box-shadow 0.3s;
  }
  
  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(27, 94, 32, 0.15);
  }
  
  .stat-card.highlight {
    background: linear-gradient(135deg, rgba(46, 125, 50, 0.1) 0%, rgba(27, 94, 32, 0.05) 100%);
    border: 1px solid rgba(46, 125, 50, 0.2);
  }
  
  .stat-header {
    margin-bottom: 1rem;
  }
  
  .stat-label {
    color: #558b2f;
    font-size: 0.9rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1b5e20;
  }
  
  .charts-section {
    margin-bottom: 2rem;
  }
  
  .charts-section h2 {
    color: #1b5e20;
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }
  
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .chart-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(27, 94, 32, 0.08);
    border: 1px solid rgba(46, 125, 50, 0.1);
  }
  
  .chart-card.wide {
    grid-column: span 2;
  }
  
  .chart-card.full-width {
    grid-column: 1 / -1;
  }
  
  .chart-card h3 {
    margin: 0 0 1rem 0;
    color: #1b5e20;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .chart-container {
    margin-top: 1rem;
    height: 300px;
    position: relative;
  }
  
  .chart-container canvas {
    max-height: 100%;
  }
  
  .heatmap-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 0.5rem;
    margin-top: 1.5rem;
    height: 200px;
    padding: 1rem;
    background: rgba(232, 245, 233, 0.3);
    border-radius: 12px;
  }
  
  .heatmap-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  
  .heatmap-bar {
    width: 100%;
    background: linear-gradient(to top, #1b5e20, #66bb6a);
    border-radius: 8px 8px 0 0;
    position: relative;
    transition: all 0.3s;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.5rem;
  }
  
  .heatmap-bar:hover {
    background: linear-gradient(to top, #2e7d32, #81c784);
    transform: translateY(-5px);
  }
  
  .heatmap-value {
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .heatmap-label {
    color: #558b2f;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .quick-actions, .recent-section {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(27, 94, 32, 0.08);
    border: 1px solid rgba(46, 125, 50, 0.1);
    margin-bottom: 2rem;
  }
  
  .quick-actions h2, .recent-section h2 {
    margin-top: 0;
    margin-bottom: 1.5rem;
    color: #1b5e20;
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .action-card {
    background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    transition: transform 0.3s, box-shadow 0.3s;
    box-shadow: 0 4px 15px rgba(27, 94, 32, 0.2);
  }
  
  .action-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(27, 94, 32, 0.3);
  }
  
  .action-content h3 {
    margin: 0 0 0.75rem 0;
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .action-content p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
  }
  
  .bookings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .booking-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: rgba(232, 245, 233, 0.5);
    border-radius: 12px;
    border-left: 4px solid #2e7d32;
    transition: background 0.3s;
  }
  
  .booking-item:hover {
    background: rgba(200, 230, 201, 0.5);
  }
  
  .booking-info h4 {
    margin: 0 0 0.75rem 0;
    color: #1b5e20;
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .booking-dates {
    color: #558b2f;
    font-size: 0.9rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  
  .date-label {
    font-weight: 500;
  }
  
  .separator {
    color: #a5d6a7;
  }
  
  .booking-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .status {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
  }
  
  .status.confirmed {
    background: #c8e6c9;
    color: #1b5e20;
  }
  
  .status.pending {
    background: #fff9c4;
    color: #f57f17;
  }
  
  .status.checked-in {
    background: #b2dfdb;
    color: #004d40;
  }
  
  .status.checked-out {
    background: #d7ccc8;
    color: #4e342e;
  }
  
  .status.cancelled {
    background: #ffcdd2;
    color: #b71c1c;
  }
  
  .btn-view {
    color: #2e7d32;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    transition: background 0.3s;
    white-space: nowrap;
  }
  
  .btn-view:hover {
    background: rgba(46, 125, 50, 0.1);
  }
  
  .view-all-link {
    display: inline-block;
    margin-top: 1.5rem;
    color: #2e7d32;
    font-weight: 600;
    transition: color 0.3s;
  }
  
  .view-all-link:hover {
    color: #1b5e20;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: #558b2f;
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }
  
  .btn-primary {
    display: inline-block;
    padding: 0.875rem 2rem;
    background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
    color: white;
    border-radius: 8px;
    font-weight: 600;
    transition: transform 0.3s, box-shadow 0.3s;
    box-shadow: 0 4px 15px rgba(27, 94, 32, 0.2);
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(27, 94, 32, 0.3);
  }
  
  @media (max-width: 768px) {
    .booking-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .booking-actions {
      width: 100%;
      justify-content: space-between;
    }
    
    .welcome-section h1 {
      font-size: 1.5rem;
    }
    
    .stat-value {
      font-size: 2rem;
    }
    
    .chart-card.wide {
      grid-column: span 1;
    }
    
    .charts-grid {
      grid-template-columns: 1fr;
    }
  }
</style>