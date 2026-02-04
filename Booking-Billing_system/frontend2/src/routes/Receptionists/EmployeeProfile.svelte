<script>
  import { onMount } from 'svelte';
  import { employeeProfileAPI } from '../../lib/employeeAPI';
  import EmployeeNavbar from '../../components/Employee-Navbar.svelte';

  let profile = {
    id: '',
    employee_number: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hire_date: '',
    status: ''
  };
  
  let loading = true;
  let error = null;
  let success = null;
  let editMode = false;
  let showPasswordModal = false;

  let editForm = {
    phone: ''
  };

  let passwordForm = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };

  onMount(async () => {
    await loadProfile();
  });

  async function loadProfile() {
    try {
      loading = true;
      error = null;
      const data = await employeeProfileAPI.getProfile();
      profile = data;
      editForm.phone = profile.phone || '';
    } catch (err) {
      console.error('Error loading profile:', err);
      error = 'Failed to load profile';
    } finally {
      loading = false;
    }
  }

  function enableEditMode() {
    editMode = true;
    editForm.phone = profile.phone || '';
  }

  function cancelEdit() {
    editMode = false;
    editForm.phone = profile.phone || '';
    error = null;
    success = null;
  }

  async function saveProfile() {
    try {
      error = null;
      success = null;
      await employeeProfileAPI.updateProfile(editForm);
      success = 'Profile updated successfully!';
      editMode = false;
      await loadProfile();
      
      setTimeout(() => {
        success = null;
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      error = err.response?.data?.message || 'Failed to update profile';
    }
  }

  function openPasswordModal() {
    passwordForm = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };
    showPasswordModal = true;
    error = null;
    success = null;
  }

  function closePasswordModal() {
    showPasswordModal = false;
    passwordForm = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };
    error = null;
  }

  async function changePassword() {
    try {
      error = null;
      success = null;

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        error = 'New password and confirmation do not match';
        return;
      }

      if (passwordForm.new_password.length < 6) {
        error = 'Password must be at least 6 characters';
        return;
      }

      await employeeProfileAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      success = 'Password changed successfully!';
      closePasswordModal();
      
      setTimeout(() => {
        success = null;
      }, 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      error = err.response?.data?.message || 'Failed to change password';
    }
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<EmployeeNavbar />

<div class="container">
  <div class="header">
    <h1>My Profile</h1>
    <p>View and manage your employee profile</p>
  </div>

  {#if error}
    <div class="error-message">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="success-message">
      {success}
    </div>
  {/if}

  {#if loading}
    <div class="loading-container">
      <div class="spinner"></div>
    </div>
  {:else}
    <div class="profile-grid">
      <!-- Profile Card -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar">
            <span class="avatar-text">{profile.name?.charAt(0) || 'E'}</span>
          </div>
          <div class="profile-info">
            <h2>{profile.name || 'Employee'}</h2>
            <p class="employee-number">#{profile.employee_number}</p>
            <span class="status-badge status-{profile.status?.toLowerCase() || 'active'}">
              {profile.status || 'Active'}
            </span>
          </div>
        </div>

        <div class="profile-details">
          <div class="detail-item">
            <span class="detail-icon">📧</span>
            <div>
              <p class="detail-label">Email</p>
              <p class="detail-value">{profile.email || 'N/A'}</p>
            </div>
          </div>

          <div class="detail-item">
            <span class="detail-icon">📱</span>
            <div>
              <p class="detail-label">Phone</p>
              {#if editMode}
                <input
                  type="text"
                  bind:value={editForm.phone}
                  class="edit-input"
                  placeholder="Enter phone number"
                />
              {:else}
                <p class="detail-value">{profile.phone || 'Not provided'}</p>
              {/if}
            </div>
          </div>

          <div class="detail-item">
            <span class="detail-icon">🏢</span>
            <div>
              <p class="detail-label">Department</p>
              <p class="detail-value">{profile.department || 'N/A'}</p>
            </div>
          </div>

          <div class="detail-item">
            <span class="detail-icon">💼</span>
            <div>
              <p class="detail-label">Position</p>
              <p class="detail-value">{profile.position || 'N/A'}</p>
            </div>
          </div>

          <div class="detail-item">
            <span class="detail-icon">📅</span>
            <div>
              <p class="detail-label">Hire Date</p>
              <p class="detail-value">{formatDate(profile.hire_date)}</p>
            </div>
          </div>
        </div>

        <div class="profile-actions">
          {#if editMode}
            <button on:click={saveProfile} class="btn-save">
              Save Changes
            </button>
            <button on:click={cancelEdit} class="btn-cancel">
              Cancel
            </button>
          {:else}
            <button on:click={enableEditMode} class="btn-edit">
              Edit Profile
            </button>
          {/if}
        </div>
      </div>

      <!-- Security Card -->
      <div class="security-card">
        <h3>Security</h3>
        <p class="card-description">Manage your account security settings</p>
        
        <div class="security-item">
          <div>
            <p class="security-title">Password</p>
            <p class="security-desc">Change your password regularly to keep your account secure</p>
          </div>
          <button on:click={openPasswordModal} class="btn-secondary">
            Change Password
          </button>
        </div>
      </div>

      <!-- Info Card -->
      <div class="info-card">
        <h3>Employment Information</h3>
        
        <div class="info-list">
          <div class="info-row">
            <span class="info-key">Employee ID:</span>
            <span class="info-value">#{profile.id}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Employee Number:</span>
            <span class="info-value">{profile.employee_number}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Department:</span>
            <span class="info-value">{profile.department}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Position:</span>
            <span class="info-value">{profile.position}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Status:</span>
            <span class="info-value">{profile.status}</span>
          </div>
          <div class="info-row">
            <span class="info-key">Hired:</span>
            <span class="info-value">{formatDate(profile.hire_date)}</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Change Password Modal -->
{#if showPasswordModal}
  <div class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change Password</h2>
        <button on:click={closePasswordModal} class="btn-close">
          <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form on:submit|preventDefault={changePassword} class="modal-body">
        <div class="form-group">
          <label class="form-label">Current Password *</label>
          <input
            type="password"
            bind:value={passwordForm.current_password}
            required
            class="form-input"
            placeholder="Enter current password"
          />
        </div>

        <div class="form-group">
          <label class="form-label">New Password *</label>
          <input
            type="password"
            bind:value={passwordForm.new_password}
            required
            minlength="6"
            class="form-input"
            placeholder="Enter new password"
          />
          <p class="form-hint">Minimum 6 characters</p>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm New Password *</label>
          <input
            type="password"
            bind:value={passwordForm.confirm_password}
            required
            class="form-input"
            placeholder="Confirm new password"
          />
        </div>

        <div class="modal-footer">
          <button type="button" on:click={closePasswordModal} class="btn-cancel-modal">
            Cancel
          </button>
          <button type="submit" class="btn-submit">
            Change Password
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .container {
    padding: 1.5rem;
    max-width: 1200px;
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
  }

  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .success-message {
    background-color: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
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

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .profile-grid {
      grid-template-columns: 2fr 1fr;
    }
  }

  .profile-card,
  .security-card,
  .info-card {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }

  .profile-card {
    grid-column: span 1;
  }

  @media (min-width: 768px) {
    .profile-card {
      grid-row: span 2;
    }
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1.5rem;
  }

  .avatar {
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .avatar-text {
    font-size: 2rem;
    font-weight: 700;
    color: white;
  }

  .profile-info h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.25rem 0;
  }

  .employee-number {
    color: #6b7280;
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 9999px;
    text-transform: capitalize;
  }

  .status-active {
    background: #d1fae5;
    color: #065f46;
  }

  .status-inactive {
    background: #fee2e2;
    color: #991b1b;
  }

  .profile-details {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .detail-item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .detail-icon {
    font-size: 1.5rem;
  }

  .detail-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0 0 0.25rem 0;
  }

  .detail-value {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #111827;
    margin: 0;
  }

  .edit-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
    width: 100%;
  }

  .edit-input:focus {
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
  }

  .profile-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn-save,
  .btn-edit {
    flex: 1;
    padding: 0.625rem 1rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-save:hover,
  .btn-edit:hover {
    background: #047857;
  }

  .btn-cancel {
    flex: 1;
    padding: 0.625rem 1rem;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel:hover {
    background: #f9fafb;
  }

  .security-card h3,
  .info-card h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
    margin: 0 0 0.5rem 0;
  }

  .card-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 1.5rem 0;
  }

  .security-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 0.5rem;
  }

  .security-title {
    font-weight: 500;
    color: #111827;
    margin: 0 0 0.25rem 0;
  }

  .security-desc {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  .btn-secondary {
    padding: 0.5rem 1rem;
    background: white;
    color: #059669;
    border: 1px solid #059669;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-secondary:hover {
    background: #059669;
    color: white;
  }

  .info-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 0.375rem;
  }

  .info-key {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .info-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
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
    max-width: 28rem;
    width: 100%;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal-header h2 {
    font-size: 1.25rem;
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

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
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
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
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
  }

  .btn-cancel-modal,
  .btn-submit {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel-modal {
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-cancel-modal:hover {
    background: #f9fafb;
  }

  .btn-submit {
    background: #059669;
    color: white;
    border: none;
  }

  .btn-submit:hover {
    background: #047857;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .profile-header {
      flex-direction: column;
      text-align: center;
    }

    .security-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .btn-secondary {
      width: 100%;
    }
  }
</style>