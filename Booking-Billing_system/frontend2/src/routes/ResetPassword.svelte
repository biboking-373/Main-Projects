<script>
  import { link, push } from 'svelte-spa-router';
  import api from '../lib/http.js';
  import { onMount } from 'svelte';

  let newPassword = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let success = $state(false);
  let loading = $state(false);
  let token = $state('');

  // Extract token from URL on mount
  onMount(() => {
  console.log('🔍 ResetPassword mounted!');
  console.log('🔍 window.location.href:', window.location.href);
  console.log('🔍 window.location.hash:', window.location.hash);
  
  const hashParts = window.location.hash.split('?');
  console.log('🔍 Hash parts:', hashParts);
  
  const urlParams = new URLSearchParams(hashParts[1]);
  const tokenFromUrl = urlParams.get('token');
  
  console.log('🔍 Token from URL:', tokenFromUrl);
  
  if (tokenFromUrl) {
    token = tokenFromUrl;
    console.log('✅ Token set successfully');
  } else {
    error = 'Invalid or missing reset token';
    console.log('❌ No token found');
  }
});

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';

    if (newPassword !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (newPassword.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    if (!token) {
      error = 'Invalid reset token';
      return;
    }

    loading = true;

    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      
      success = true;
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        push('/login');
      }, 3000);
    } catch (err) {
      error = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-header">
      <a href="/login" use:link class="back-link">← Back to Login</a>
      <h1>Reset Password</h1>
      <p>Enter your new password</p>
    </div>
    
    {#if success}
      <div class="success-message">
        <p>✓ Password reset successful!</p>
        <p>Redirecting to login in 3 seconds...</p>
        <a href="/login" use:link class="btn-submit">Go to Login Now</a>
      </div>
    {:else}
      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <form class="auth-form" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="newPassword">New Password</label>
          <input 
            id="newPassword"
            type="password" 
            bind:value={newPassword} 
            required 
            placeholder="••••••••"
            autocomplete="new-password"
            disabled={!token}
          />
          <small>Minimum 8 characters</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm New Password</label>
          <input 
            id="confirmPassword"
            type="password" 
            bind:value={confirmPassword} 
            required 
            placeholder="••••••••"
            autocomplete="new-password"
            disabled={!token}
          />
        </div>

        <button type="submit" class="btn-submit" disabled={loading || !token}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <div class="auth-switch">
        <p>Remember your password? <a href="/login" use:link>Sign in</a></p>
      </div>
    {/if}
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  .auth-container {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    width: 100%;
    max-width: 440px;
  }
  
  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .back-link {
    display: inline-block;
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .back-link:hover {
    text-decoration: underline;
  }
  
  h1 {
    margin: 0 0 0.5rem 0;
    color: #2c3e50;
    font-size: 2rem;
  }
  
  .auth-header p {
    color: #7f8c8d;
    margin: 0;
  }
  
  .success-message {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
    padding: 1.5rem;
    border-radius: 6px;
    text-align: center;
  }
  
  .success-message p {
    margin: 0.5rem 0;
  }

  .success-message .btn-submit {
    margin-top: 1rem;
  }
  
  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  
  .form-group {
    margin-bottom: 1.25rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #2c3e50;
    font-size: 0.9rem;
  }
  
  input {
    width: 100%;
    padding: 0.85rem;
    border: 1.5px solid #e1e8ed;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  
  input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
  
  small {
    display: block;
    margin-top: 0.25rem;
    color: #7f8c8d;
    font-size: 0.8rem;
  }
  
  .btn-submit {
    width: 100%;
    padding: 0.85rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    display: block;
    text-align: center;
    text-decoration: none;
  }
  
  .btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
  }
  
  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .auth-switch {
    text-align: center;
    padding-top: 1.5rem;
    border-top: 1px solid #e1e8ed;
    margin-top: 1.5rem;
  }
  
  .auth-switch p {
    margin: 0;
    color: #7f8c8d;
  }
  
  .auth-switch a {
    color: #667eea;
    font-weight: 600;
  }
  
  .auth-switch a:hover {
    text-decoration: underline;
  }
</style>