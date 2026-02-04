<script>
  import { authStore } from '../../lib/stores.js';
  import Navbar from '../../components/Navbar.svelte';

  let user = $state(null);

  let emailNotifications = $state(true);
  let smsNotifications = $state(false);
  let marketingEmails = $state(true);
  let profileVisible = $state(true);

  const unsubscribe = authStore.subscribe(state => {
    user = state.user;
  });

  function handleSaveSettings() {
    // later: send to backend
    alert('Settings saved successfully!');
  }

  // cleanup
  $effect(() => {
    return () => unsubscribe();
  });
</script>

<Navbar />

<div class="settings-page">
  <div class="container">
    <h1>Settings</h1>

    <div class="settings-card">
      <!-- Notifications -->
      <div class="setting-section">
        <h3>Notifications</h3>

        <div class="setting-item">
          <div class="setting-info">
            <h4>Email Notifications</h4>
            <p>Receive booking confirmations and updates via email</p>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={emailNotifications} />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>SMS Notifications</h4>
            <p>Receive booking reminders via text message</p>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={smsNotifications} />
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <h4>Marketing Emails</h4>
            <p>Receive promotional offers and deals</p>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={marketingEmails} />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Privacy -->
      <div class="setting-section">
        <h3>Privacy</h3>

        <div class="setting-item">
          <div class="setting-info">
            <h4>Profile Visibility</h4>
            <p>Make your profile visible to staff members</p>
          </div>
          <label class="toggle">
            <input type="checkbox" bind:checked={profileVisible} />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <button class="btn-save" onclick={handleSaveSettings}>
        Save Settings
      </button>
    </div>
  </div>
</div>

<style>
  .settings-page {
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

  .settings-card {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .setting-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e1e8ed;
  }

  .setting-section:last-of-type {
    border-bottom: none;
  }

  .setting-section h3 {
    color: #2c3e50;
    margin-bottom: 1.5rem;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
  }

  .setting-info h4 {
    margin: 0 0 0.25rem 0;
    color: #2c3e50;
  }

  .setting-info p {
    margin: 0;
    color: #7f8c8d;
    font-size: 0.9rem;
  }

  /* Toggle */
  .toggle {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 26px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 26px;
  }

  .slider::before {
    content: "";
    position: absolute;
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #667eea;
  }

  input:checked + .slider::before {
    transform: translateX(24px);
  }

  /* Save button */
  .btn-save {
    width: 100%;
    padding: 0.9rem;
    border-radius: 8px;
    border: none;
    background: #667eea;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .btn-save:hover {
    background: #5a67d8;
  }
</style>
