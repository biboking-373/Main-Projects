<script>
  import { link, push } from 'svelte-spa-router';
  import { authAPI } from '../lib/api.js';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters';
      return;
    }

    loading = true;

    try {
      await authAPI.register(name, email, password);
      alert('Account created successfully! Please login.');
      push('/login');
    } catch (err) {
      error = err.response?.data?.message || 'Registration failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-header">
      <a href="/" use:link class="back-link">← Back to Home</a>
      <h1>Create Account</h1>
      <p>Join us for exclusive benefits</p>
    </div>
    
    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <form class="auth-form" onsubmit={handleSubmit}>
      <div class="form-group">
        <label for="name">Full Name</label>
        <input 
          id="name"
          type="text" 
          bind:value={name} 
          required 
          placeholder="John Doe"
          autocomplete="name"
        />
      </div>

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
          autocomplete="new-password"
        />
        <small>Minimum 8 characters</small>
      </div>

      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input 
          id="confirmPassword"
          type="password" 
          bind:value={confirmPassword} 
          required 
          placeholder="••••••••"
          autocomplete="new-password"
        />
      </div>

      <button type="submit" class="btn-submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>

    <div class="auth-switch">
      <p>Already have an account? <a href="/login" use:link>Sign in</a></p>
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
</style>