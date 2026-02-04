<script>
  import { onMount } from 'svelte';
  import ExcelJS from 'exceljs';
  import { 
    adminBookingsAPI, 
    adminPaymentsAPI, 
    adminRoomsAPI,
    adminEmployeesAPI 
  } from '../../lib/adminAPI';

  let loading = $state(false);
  let error = $state(null);
  let selectedReportType = $state('bookings');
  
  // Filters
  let filters = $state({
    startDate: '',
    endDate: '',
    status: '',
    roomType: '',
    paymentStatus: '',
    priceMin: '',
    priceMax: ''
  });

  let reportData = $state([]);
  let reportStats = $state({
    totalRecords: 0,
    summary: {}
  });

  const reportTypes = [
    { value: 'bookings', label: 'Booking Reports', icon: 'calendar' },
    { value: 'payments', label: 'Payment Reports', icon: 'dollar' },
    { value: 'rooms', label: 'Room Reports', icon: 'home' },
    { value: 'employees', label: 'Employee Reports', icon: 'users' }
  ];

  const bookingStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  const paymentStatuses = ['paid', 'unpaid', 'partial', 'refunded'];
  const roomTypes = ['standard', 'deluxe', 'suite', 'executive', 'penthouse'];

  onMount(() => {
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    filters.endDate = today.toISOString().split('T')[0];
    filters.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  });

  async function generateReport() {
    try {
      loading = true;
      error = null;
      reportData = [];

      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        limit: 1000 // Get all records for report
      };

      switch (selectedReportType) {
        case 'bookings':
          await generateBookingReport(params);
          break;
        case 'payments':
          await generatePaymentReport(params);
          break;
        case 'rooms':
          await generateRoomReport(params);
          break;
        case 'employees':
          await generateEmployeeReport(params);
          break;
      }

    } catch (err) {
      console.error('Error generating report:', err);
      error = err.response?.data?.message || 'Failed to generate report';
    } finally {
      loading = false;
    }
  }

  async function generateBookingReport(params) {
    const response = await adminBookingsAPI.getAll({
      ...params,
      status: filters.status
    });

    reportData = response.data || [];
    
    // Calculate statistics
    const totalBookings = reportData.length;
    const totalRevenue = reportData.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const statusCounts = {};
    
    reportData.forEach(booking => {
      statusCounts[booking.booking_status] = (statusCounts[booking.booking_status] || 0) + 1;
    });

    reportStats = {
      totalRecords: totalBookings,
      summary: {
        totalRevenue,
        statusCounts,
        averageBookingValue: totalBookings > 0 ? totalRevenue / totalBookings : 0
      }
    };
  }

  async function generatePaymentReport(params) {
    const response = await adminPaymentsAPI.getAll({
      ...params,
      payment_status: filters.paymentStatus,
      min_amount: filters.priceMin,
      max_amount: filters.priceMax
    });

    reportData = response.data || [];

    const totalPayments = reportData.length;
    const totalAmount = reportData.reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidAmount = reportData
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const unpaidAmount = totalAmount - paidAmount;

    const methodCounts = {};
    reportData.forEach(payment => {
      methodCounts[payment.payment_method] = (methodCounts[payment.payment_method] || 0) + 1;
    });

    reportStats = {
      totalRecords: totalPayments,
      summary: {
        totalAmount,
        paidAmount,
        unpaidAmount,
        methodCounts
      }
    };
  }

  async function generateRoomReport(params) {
    const response = await adminRoomsAPI.getAll({
      room_type: filters.roomType,
      min_price: filters.priceMin,
      max_price: filters.priceMax
    });

    reportData = response.data || [];

    const totalRooms = reportData.length;
    const statusCounts = {};
    const typeCounts = {};
    let totalRevenue = 0;

    reportData.forEach(room => {
      statusCounts[room.status] = (statusCounts[room.status] || 0) + 1;
      typeCounts[room.room_type] = (typeCounts[room.room_type] || 0) + 1;
      totalRevenue += room.price_per_night || 0;
    });

    reportStats = {
      totalRecords: totalRooms,
      summary: {
        statusCounts,
        typeCounts,
        averagePrice: totalRooms > 0 ? totalRevenue / totalRooms : 0
      }
    };
  }

  async function generateEmployeeReport(params) {
    const response = await adminEmployeesAPI.getAll({
      status: filters.status
    });

    reportData = response.data || [];

    const totalEmployees = reportData.length;
    const roleCounts = {};
    const statusCounts = {};
    let totalSalary = 0;

    reportData.forEach(emp => {
      roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
      statusCounts[emp.status] = (statusCounts[emp.status] || 0) + 1;
      totalSalary += emp.salary || 0;
    });

    reportStats = {
      totalRecords: totalEmployees,
      summary: {
        roleCounts,
        statusCounts,
        totalSalary,
        averageSalary: totalEmployees > 0 ? totalSalary / totalEmployees : 0
      }
    };
  }

  async function downloadExcel() {
    if (reportData.length === 0) {
      alert('No data to export. Please generate a report first.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    let columns = [];
    let data = [];
    let filename = '';

    switch (selectedReportType) {
      case 'bookings':
        columns = [
          { header: 'Booking ID', key: 'id', width: 12 },
          { header: 'Customer Name', key: 'user_name', width: 20 },
          { header: 'Room Number', key: 'room_number', width: 15 },
          { header: 'Check In', key: 'check_in_date', width: 15 },
          { header: 'Check Out', key: 'check_out_date', width: 15 },
          { header: 'Total Price', key: 'total_price', width: 15 },
          { header: 'Status', key: 'booking_status', width: 15 },
          { header: 'Created At', key: 'created_at', width: 18 }
        ];
        data = reportData.map(b => ({
          id: b.id,
          user_name: b.user_name,
          room_number: b.room_number,
          check_in_date: new Date(b.check_in_date).toLocaleDateString(),
          check_out_date: new Date(b.check_out_date).toLocaleDateString(),
          total_price: b.total_price,
          booking_status: b.booking_status,
          created_at: new Date(b.created_at).toLocaleDateString()
        }));
        filename = `booking_report_${Date.now()}.xlsx`;
        break;

      case 'payments':
        columns = [
          { header: 'Payment ID', key: 'id', width: 12 },
          { header: 'Booking ID', key: 'booking_id', width: 12 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Payment Method', key: 'payment_method', width: 18 },
          { header: 'Payment Status', key: 'payment_status', width: 18 },
          { header: 'Transaction ID', key: 'transaction_id', width: 20 },
          { header: 'Payment Date', key: 'payment_date', width: 18 }
        ];
        data = reportData.map(p => ({
          id: p.id,
          booking_id: p.booking_id,
          amount: p.amount,
          payment_method: p.payment_method,
          payment_status: p.payment_status,
          transaction_id: p.transaction_id || 'N/A',
          payment_date: new Date(p.payment_date).toLocaleDateString()
        }));
        filename = `payment_report_${Date.now()}.xlsx`;
        break;

      case 'rooms':
        columns = [
          { header: 'Room ID', key: 'id', width: 10 },
          { header: 'Room Number', key: 'room_number', width: 15 },
          { header: 'Room Type', key: 'room_type', width: 15 },
          { header: 'Price per Night', key: 'price_per_night', width: 18 },
          { header: 'Max Occupancy', key: 'max_occupancy', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Amenities', key: 'amenities', width: 30 }
        ];
        data = reportData.map(r => ({
          id: r.id,
          room_number: r.room_number,
          room_type: r.room_type,
          price_per_night: r.price_per_night,
          max_occupancy: r.max_occupancy,
          status: r.status,
          amenities: Array.isArray(r.amenities) ? r.amenities.join(', ') : r.amenities
        }));
        filename = `room_report_${Date.now()}.xlsx`;
        break;

      case 'employees':
        columns = [
          { header: 'Employee ID', key: 'id', width: 12 },
          { header: 'Name', key: 'name', width: 20 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Role', key: 'role', width: 15 },
          { header: 'Phone', key: 'phone', width: 15 },
          { header: 'Hire Date', key: 'hire_date', width: 15 },
          { header: 'Salary', key: 'salary', width: 15 },
          { header: 'Status', key: 'status', width: 12 }
        ];
        data = reportData.map(e => ({
          id: e.id,
          name: e.name,
          email: e.email,
          role: e.role,
          phone: e.phone || 'N/A',
          hire_date: e.hire_date ? new Date(e.hire_date).toLocaleDateString() : 'N/A',
          salary: e.salary || 'N/A',
          status: e.status
        }));
        filename = `employee_report_${Date.now()}.xlsx`;
        break;
    }

    worksheet.columns = columns;
    worksheet.addRows(data);

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    if (reportData.length === 0) {
      alert('No data to export. Please generate a report first.');
      return;
    }

    let csvContent = '';
    let filename = '';

    switch (selectedReportType) {
      case 'bookings':
        csvContent = convertToCSV(reportData, [
          'id', 'user_name', 'room_number', 'check_in_date', 'check_out_date', 
          'total_price', 'booking_status', 'created_at'
        ]);
        filename = `booking_report_${Date.now()}.csv`;
        break;

      case 'payments':
        csvContent = convertToCSV(reportData, [
          'id', 'booking_id', 'amount', 'payment_method', 'payment_status', 
          'transaction_id', 'payment_date'
        ]);
        filename = `payment_report_${Date.now()}.csv`;
        break;

      case 'rooms':
        csvContent = convertToCSV(reportData, [
          'id', 'room_number', 'room_type', 'price_per_night', 'max_occupancy', 'status'
        ]);
        filename = `room_report_${Date.now()}.csv`;
        break;

      case 'employees':
        csvContent = convertToCSV(reportData, [
          'id', 'name', 'email', 'role', 'phone', 'hire_date', 'salary', 'status'
        ]);
        filename = `employee_report_${Date.now()}.csv`;
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function convertToCSV(data, fields) {
    const headers = fields.join(',');
    const rows = data.map(item => 
      fields.map(field => {
        let value = item[field] || '';
        if (typeof value === 'string' && value.includes(',')) {
          value = `"${value}"`;
        }
        return value;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount);
  }
</script>

<div class="p-6 max-w-7xl mx-auto">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Reports</h1>
    <p class="text-gray-600 mt-1">Generate and download various reports</p>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
      {error}
    </div>
  {/if}

  <!-- Report Type Selection -->
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each reportTypes as type}
        <button
          onclick={() => selectedReportType = type.value}
          class="p-4 border-2 rounded-lg text-left transition {selectedReportType === type.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}"
        >
          <div class="font-medium text-gray-900">{type.label}</div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
        <input
          type="date"
          bind:value={filters.startDate}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">End Date</label>
        <input
          type="date"
          bind:value={filters.endDate}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {#if selectedReportType === 'bookings'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Booking Status</label>
          <select
            bind:value={filters.status}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {#each bookingStatuses as status}
              <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            {/each}
          </select>
        </div>
      {/if}

      {#if selectedReportType === 'payments'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
          <select
            bind:value={filters.paymentStatus}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {#each paymentStatuses as status}
              <option value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
          <input
            type="number"
            bind:value={filters.priceMin}
            placeholder="0.00"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
          <input
            type="number"
            bind:value={filters.priceMax}
            placeholder="0.00"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      {/if}

      {#if selectedReportType === 'rooms'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Room Type</label>
          <select
            bind:value={filters.roomType}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {#each roomTypes as type}
              <option value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Min Price</label>
          <input
            type="number"
            bind:value={filters.priceMin}
            placeholder="0.00"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Max Price</label>
          <input
            type="number"
            bind:value={filters.priceMax}
            placeholder="0.00"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      {/if}

      {#if selectedReportType === 'employees'}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Employee Status</label>
          <select
            bind:value={filters.status}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      {/if}
    </div>

    <div class="mt-4 flex gap-3">
      <button
        onclick={generateReport}
        disabled={loading}
        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Report'}
      </button>

      {#if reportData.length > 0}
        <button
          onclick={downloadExcel}
          class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
        >
          Download Excel
        </button>
        <button
          onclick={downloadCSV}
          class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
        >
          Download CSV
        </button>
      {/if}
    </div>
  </div>

  <!-- Report Statistics -->
  {#if reportData.length > 0}
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Report Summary</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-gray-600">Total Records</p>
          <p class="text-2xl font-bold text-gray-900">{reportStats.totalRecords}</p>
        </div>

        {#if selectedReportType === 'bookings' && reportStats.summary.totalRevenue}
          <div class="p-4 bg-green-50 rounded-lg">
            <p class="text-sm text-gray-600">Total Revenue</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.totalRevenue)}</p>
          </div>
          <div class="p-4 bg-purple-50 rounded-lg">
            <p class="text-sm text-gray-600">Avg Booking Value</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.averageBookingValue)}</p>
          </div>
        {/if}

        {#if selectedReportType === 'payments' && reportStats.summary.totalAmount}
          <div class="p-4 bg-green-50 rounded-lg">
            <p class="text-sm text-gray-600">Total Amount</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.totalAmount)}</p>
          </div>
          <div class="p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600">Paid Amount</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.paidAmount)}</p>
          </div>
          <div class="p-4 bg-red-50 rounded-lg">
            <p class="text-sm text-gray-600">Unpaid Amount</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.unpaidAmount)}</p>
          </div>
        {/if}

        {#if selectedReportType === 'rooms' && reportStats.summary.averagePrice}
          <div class="p-4 bg-purple-50 rounded-lg">
            <p class="text-sm text-gray-600">Average Price</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.averagePrice)}</p>
          </div>
        {/if}

        {#if selectedReportType === 'employees' && reportStats.summary.totalSalary}
          <div class="p-4 bg-green-50 rounded-lg">
            <p class="text-sm text-gray-600">Total Salary</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.totalSalary)}</p>
          </div>
          <div class="p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600">Average Salary</p>
            <p class="text-2xl font-bold text-gray-900">{formatCurrency(reportStats.summary.averageSalary)}</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Data Preview -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Data Preview</h2>
        <p class="text-sm text-gray-600 mt-1">Showing first 10 records</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              {#each Object.keys(reportData[0] || {}).slice(0, 8) as key}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each reportData.slice(0, 10) as row}
              <tr>
                {#each Object.values(row).slice(0, 8) as value}
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {value || 'N/A'}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>