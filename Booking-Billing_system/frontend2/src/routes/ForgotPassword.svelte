<script>
  import { link } from 'svelte-spa-router';
  import { authAPI } from '../lib/api.js';

  let email = $state('');
  let success = $state(false);
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      await authAPI.forgotPassword(email);
      success = true;
    } catch (err) {
      error = err.response?.data?.message || 'Failed to send reset email. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="auth-page">
  <div class="auth-container">
    <div class="auth-header">
      <a href="/login" use:link class="back-link">← Back to Login</a>
      <h1>Forgot Password?</h1>
      <p>Enter your email to reset your password</p>
    </div>
    
    {#if success}
      <div class="success-message">
        <p>✓ Password reset instructions have been sent to your email.</p>
        <a href="/login" use:link class="btn-submit">Back to Login</a>
      </div>
    {:else}
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
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>

        <button type="submit" class="btn-submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
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
    margin: 0 0 1rem 0;
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
  }
  
  input:focus {
    outline: none;
    border-color: #667eea;
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
    display: block;
    text-align: center;
  }
  
  .btn-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
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
*/