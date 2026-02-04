<script>
  import { onMount } from 'svelte';
  import { adminEmployeesAPI } from '../../lib/adminAPI';
  import AdminNavbar from '../../components/Admin-Navbar.svelte';

  let employees = [];
  let loading = true;
  let error = null;
  let searchQuery = '';
  let statusFilter = '';
  let departmentFilter = '';
  let currentPage = 1;
  let totalPages = 1;
  let showModal = false;
  let isEditMode = false;
  let selectedEmployee = null;

  let formData = {
    employee_number: '',
    name: '',
    email: '',
    phone: '',
    department: 'Front Desk',
    position: 'Receptionist',
    hire_date: '',
    password: '',
    status: 'Active'
  };

  const departments = ['Front Desk', 'Billing', 'Management'];
  const statuses = ['Active', 'Inactive'];

  onMount(async () => {
    await loadEmployees();
  });

  async function loadEmployees() {
    try {
      loading = true;
      error = null;
      const response = await adminEmployeesAPI.getAll({
        page: currentPage,
        limit: 20,
        search: searchQuery,
        status: statusFilter,
        department: departmentFilter
      });
      
      employees = response.data || [];
      totalPages = response.totalPages || 1;
      
      console.log('Loaded employees:', employees.length);
    } catch (err) {
      console.error('Error loading employees:', err);
      error = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to load employees';
    } finally {
      loading = false;
    }
  }

  async function handleSearch() {
    currentPage = 1;
    await loadEmployees();
  }

  async function handleFilter() {
    currentPage = 1;
    await loadEmployees();
  }

  function handlePageChange(page) {
    currentPage = page;
    loadEmployees();
  }

  function openAddModal() {
    isEditMode = false;
    selectedEmployee = null;
    formData = {
      employee_number: '',
      name: '',
      email: '',
      phone: '',
      department: 'Front Desk',
      position: 'Receptionist',
      hire_date: '',
      password: '',
      status: 'Active'
    };
    showModal = true;
  }

  function openEditModal(employee) {
    isEditMode = true;
    selectedEmployee = employee;
    formData = {
      employee_number: employee.employee_number || '',
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || 'Front Desk',
      position: employee.position || 'Receptionist',
      hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
      status: employee.status || 'Active'
    };
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    selectedEmployee = null;
    formData = {
      employee_number: '',
      name: '',
      email: '',
      phone: '',
      department: 'Front Desk',
      position: 'Receptionist',
      hire_date: '',
      password: '',
      status: 'Active'
    };
  }

  async function handleSubmit() {
    try {
      error = null;
      
      if (isEditMode && selectedEmployee) {
        const updateData = {
          employee_number: formData.employee_number,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
          hire_date: formData.hire_date,
          status: formData.status
        };
        await adminEmployeesAPI.update(selectedEmployee.id, updateData);
      } else {
        await adminEmployeesAPI.create(formData);
      }

      closeModal();
      await loadEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
      error = err.response?.data?.message || 'Failed to save employee';
    }
  }

  async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      error = null;
      await adminEmployeesAPI.delete(id);
      await loadEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      error = err.response?.data?.message || 'Failed to delete employee';
    }
  }

  function getStatusColor(status) {
    return status === 'Active' ? 'status-active' : 'status-inactive';
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<AdminNavbar />

<div class="container">
  <div class="header">
    <div>
      <h1>Employees Management</h1>
      <p>Manage hotel employees and staff</p>
    </div>
    <button on:click={openAddModal} class="btn-add">
      <span class="icon">➕</span>
      Add Employee
    </button>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  <!-- Filters -->
  <div class="filters-card">
    <div class="filters-grid">
      <div class="search-wrapper">
        <input
          type="text"
          bind:value={searchQuery}
          on:keypress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, email, or employee number..."
          class="input-field"
        />
      </div>
      <div>
        <select
          bind:value={departmentFilter}
          on:change={handleFilter}
          class="select-field"
        >
          <option value="">All Departments</option>
          {#each departments as dept}
            <option value={dept}>{dept}</option>
          {/each}
        </select>
      </div>
      <div>
        <select
          bind:value={statusFilter}
          on:change={handleFilter}
          class="select-field"
        >
          <option value="">All Statuses</option>
          {#each statuses as status}
            <option value={status}>{status}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="search-button-wrapper">
      <button on:click={handleSearch} class="btn-search">
        Search
      </button>
    </div>
  </div>

  <!-- Employees Table -->
  <div class="table-card">
    {#if loading}
      <div class="loading-container">
        <div class="spinner"></div>
      </div>
    {:else if employees.length === 0}
      <div class="empty-state">
        <p>No employees found</p>
      </div>
    {:else}
      <div class="table-wrapper">
        <table class="employees-table">
          <thead>
            <tr>
              <th>Emp #</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Department</th>
              <th>Position</th>
              <th>Hire Date</th>
              <th>Status</th>
              <th class="actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each employees as employee}
              <tr on:click={() => openEditModal(employee)}>
                <td class="employee-number">{employee.employee_number}</td>
                <td class="employee-name">{employee.name}</td>
                <td class="employee-email">{employee.email}</td>
                <td>{employee.phone || 'N/A'}</td>
                <td>{employee.department}</td>
                <td>{employee.position}</td>
                <td>{formatDate(employee.hire_date)}</td>
                <td>
                  <span class="status-badge {getStatusColor(employee.status)}">
                    {employee.status}
                  </span>
                </td>
                <td class="actions-cell">
                  <button
                    on:click|stopPropagation={() => openEditModal(employee)}
                    class="btn-view"
                  >
                    Edit
                  </button>
                  <button
                    on:click|stopPropagation={() => deleteEmployee(employee.id)}
                    class="btn-delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <div class="pagination-info">
            Page {currentPage} of {totalPages}
          </div>
          <div class="pagination-buttons">
            <button
              on:click={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              class="btn-pagination"
            >
              Previous
            </button>
            <button
              on:click={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              class="btn-pagination"
            >
              Next
            </button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Add/Edit Modal -->
{#if showModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{isEditMode ? 'Edit Employee' : 'Add New Employee'}</h2>
        <button on:click={closeModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form on:submit|preventDefault={handleSubmit} class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Employee Number *</label>
            <input
              type="text"
              bind:value={formData.employee_number}
              required
              placeholder="EMP001"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input
              type="text"
              bind:value={formData.name}
              required
              placeholder="John Doe"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Email *</label>
            <input
              type="email"
              bind:value={formData.email}
              required
              placeholder="john@hotel.com"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Phone</label>
            <input
              type="text"
              bind:value={formData.phone}
              placeholder="+254 712 345 678"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Department *</label>
            <select bind:value={formData.department} required class="form-input">
              {#each departments as dept}
                <option value={dept}>{dept}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Position *</label>
            <input
              type="text"
              bind:value={formData.position}
              required
              placeholder="Receptionist"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Hire Date *</label>
            <input
              type="date"
              bind:value={formData.hire_date}
              required
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Status *</label>
            <select bind:value={formData.status} required class="form-input">
              {#each statuses as status}
                <option value={status}>{status}</option>
              {/each}
            </select>
          </div>

          {#if !isEditMode}
            <div class="form-group full-width">
              <label class="form-label">Password *</label>
              <input
                type="password"
                bind:value={formData.password}
                required={!isEditMode}
                placeholder="Enter password"
                class="form-input"
              />
              <p class="form-hint">Password will be used for employee login</p>
            </div>
          {/if}
        </div>

        <div class="modal-footer">
          <button type="button" on:click={closeModal} class="btn-cancel">
            Cancel
          </button>
          <button type="submit" class="btn-submit">
            {isEditMode ? 'Update' : 'Create'} Employee
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  /* Container & Layout */
  .container {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.25rem 0;
  }

  .header p {
    color: #6b7280;
    margin: 0;
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-add:hover {
    background: #2563eb;
  }

  .icon {
    font-size: 1rem;
  }

  /* Error Message */
  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  /* Filters Card */
  .filters-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .filters-grid {
      grid-template-columns: 2fr 1fr 1fr;
    }
  }

  .search-wrapper {
    grid-column: span 1;
  }

  @media (min-width: 768px) {
    .search-wrapper {
      grid-column: span 3;
    }
  }

  .input-field,
  .select-field {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .input-field:focus,
  .select-field:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-button-wrapper {
    margin-top: 1rem;
  }

  .btn-search {
    background-color: #3b82f6;
    color: white;
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-search:hover {
    background-color: #2563eb;
  }

  /* Table Card */
  .table-card {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
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
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .employees-table {
    min-width: 100%;
    border-collapse: collapse;
  }

  .employees-table thead {
    background-color: #f9fafb;
  }

  .employees-table th {
    padding: 0.75rem 1.5rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .actions-header {
    text-align: right;
  }

  .employees-table tbody tr {
    border-top: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .employees-table tbody tr:hover {
    background-color: #f9fafb;
  }

  .employees-table td {
    padding: 1rem 1.5rem;
    font-size: 0.875rem;
    color: #111827;
  }

  .employee-number {
    font-weight: 600;
    color: #3b82f6;
  }

  .employee-name {
    font-weight: 500;
  }

  .employee-email {
    color: #6b7280;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 9999px;
  }

  .status-active {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-inactive {
    background-color: #fee2e2;
    color: #991b1b;
  }

  .actions-cell {
    text-align: right;
  }

  .btn-view,
  .btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s;
  }

  .btn-view {
    color: #3b82f6;
    margin-right: 0.75rem;
  }

  .btn-view:hover {
    color: #1e40af;
  }

  .btn-delete {
    color: #ef4444;
  }

  .btn-delete:hover {
    color: #991b1b;
  }

  /* Pagination */
  .pagination {
    background: white;
    padding: 0.75rem 1.5rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination-info {
    font-size: 0.875rem;
    color: #374151;
  }

  .pagination-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-pagination {
    padding: 0.25rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }

  .btn-pagination:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  .btn-pagination:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    z-index: 9999;
  }

  .modal-content {
    background: white;
    border-radius: 0.5rem;
    max-width: 48rem;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }

  .btn-close {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s;
  }

  .btn-close:hover {
    color: #4b5563;
  }

  .close-icon {
    width: 1.5rem;
    height: 1.5rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .full-width {
    grid-column: span 2;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .form-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
  }

  .form-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-hint {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-cancel:hover {
    background: #f9fafb;
  }

  .btn-submit {
    background: #3b82f6;
    color: white;
    border: none;
  }

  .btn-submit:hover {
    background: #2563eb;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .btn-add {
      width: 100%;
      justify-content: center;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .full-width {
      grid-column: span 1;
    }
  }
</style>