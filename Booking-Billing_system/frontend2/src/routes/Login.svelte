<script>
  import { link, push } from 'svelte-spa-router';
  import { authAPI } from '../lib/api.js';
  import { authStore } from '../lib/stores.js';

  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      const response = await authAPI.login(email, password);
      authStore.setUser(response.user);
      
      // Redirect based on role_id
      // role_id: 1 = customer, 2 = staff, 3 = admin
      if (response.user.role_id === 3) {
        // Admin or Staff - redirect to admin dashboard
        push('/admin/dashboard');
      } else if (response.user.role_id === 2){
         // Admin or Staff - redirect to admin dashboard
         push('/employee/dashboard');
      } else {
        // Customer - redirect to customer dashboard
        push('/customer/dashboard');
      }
    } catch (err) {
      error = err.response?.data?.message || 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-header">
      <a href="/" use:link class="back-link">← Back to Home</a>
      <h1>Welcome Back</h1>
      <p>Sign in to your account</p>
    </div>
    
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <form class="auth-form" onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input 
          id="email"
          type="email" 
          bind:value={email} 
          required 
          placeholder="johndoe11@gmail.com"
          autocomplete="email"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input 
          id="password"
          type="password" 
          bind:value={password} 
          required 
          placeholder="••••••••"
          autocomplete="current-password"
        />
      </div>

      <div class="form-footer">
        <a href="/forgot-password" use:link class="forgot-link">Forgot password?</a>
      </div>

      <button type="submit" class="btn-submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="auth-switch">
      <p>Don't have an account? <a href="/signup" use:link>Sign up</a></p>
    </div>
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
  
  .error-message {
    background: #fee;
    border: 1px solid #fcc;
    color: #c33;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  
  .auth-form {
    margin-bottom: 1.5rem;
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
  
  .form-footer {
    text-align: right;
    margin-bottom: 1.5rem;
  }
  
  .forgot-link {
    color: #667eea;
    font-size: 0.9rem;
  }
  
  .forgot-link:hover {
    text-decoration: underline;
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