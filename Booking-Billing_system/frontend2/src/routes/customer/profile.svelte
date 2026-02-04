<script>
  import { authStore } from '../../lib/stores.js';
  import Navbar from '../../components/Navbar.svelte';

  let user = $state(null);

  authStore.subscribe(state => {
    user = state.user;
  });

  function getRoleName(roleId) {
    const roles = { 1: 'Customer', 2: 'Staff', 3: 'Admin' };
    return roles[roleId] || 'Unknown';
  }
</script>

<Navbar />

<div class="profile-page">
  <div class="container">
    <h1>My Profile</h1>

    <div class="profile-card">
      <div class="profile-header">
        <div class="avatar">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div class="user-info">
          <h2>{user?.name}</h2>
          <p class="role">{getRoleName(user?.role_id)}</p>
        </div>
      </div>

      <div class="profile-details">
        <div class="detail-section">
          <h3>Personal Information</h3>
          <div class="detail-item">
            <span class="label">Full Name</span>
            <span class="value">{user?.name}</span>
          </div>
          <div class="detail-item">
            <span class="label">Email</span>
            <span class="value">{user?.email}</span>
          </div>
          <div class="detail-item">
            <span class="label">User ID</span>
            <span class="value">#{user?.id}</span>
          </div>
        </div>

        <div class="detail-section">
          <h3>Account Details</h3>
          <div class="detail-item">
            <span class="label">Account Type</span>
            <span class="value">{getRoleName(user?.role_id)}</span>
          </div>
          <div class="detail-item">
            <span class="label">Member Since</span>
            <span class="value">{new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div class="profile-actions">
        <button class="btn-primary">Edit Profile</button>
        <button class="btn-secondary">Change Password</button>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-page {
    min-height: calc(100vh - 70px);
    background: #f5f7fa;
    padding: 2rem 1rem;
  }
  
  .container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    color: #2c3e50;
    margin-bottom: 2rem;
  }
  
  .profile-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  
  .profile-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 3rem 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    color: white;
  }
  
  .avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: white;
    color: #667eea;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
  }
  
  .user-info h2 {
    margin: 0 0 0.5rem 0;
  }
  
  .role {
    margin: 0;
    opacity: 0.9;
  }
  
  .profile-details {
    padding: 2rem;
  }
  
  .detail-section {
    margin-bottom: 2rem;
  }
  
  .detail-section:last-child {
    margin-bottom: 0;
  }
  
  .detail-section h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
  }
  
  .detail-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e1e8ed;
  }
  
  .detail-item:last-child {
    border-bottom: none;
  }
  
  .label {
    color: #7f8c8d;
  }
  
  .value {
    color: #2c3e50;
    font-weight: 600;
  }
  
  .profile-actions {
    padding: 2rem;
    background: #f8f9fa;
    display: flex;
    gap: 1rem;
  }
  
  .btn-primary, .btn-secondary {
    flex: 1;
    padding: 0.85rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
  }
  
  .btn-secondary {
    background: white;
    color: #667eea;
    border: 2px solid #667eea;
  }
  
  .btn-secondary:hover {
    background: #667eea;
    color: white;
  }
</style>
*/