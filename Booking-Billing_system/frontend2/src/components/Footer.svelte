
<script>
  import { link } from 'svelte-spa-router';
</script>

<footer class="footer">
  <div class="container">
    <div class="footer-content">
      <div class="footer-section">
        <h3>🏨 Luxury Hotel</h3>
        <p>Experience comfort and elegance</p>
      </div>
      
      <div class="footer-section">
        <h4>Quick Links</h4>
        <a href="/" use:link>Home</a>
        <a href="/login" use:link>Login</a>
        <a href="/signup" use:link>Sign Up</a>
      </div>
      
      <div class="footer-section">
        <h4>Contact</h4>
        <p>Email: info@luxuryhotel.com</p>
        <p>Phone: (555) 123-4567</p>
      </div>
    </div>
    
    <div class="footer-bottom">
      <p>&copy; 2025 Luxury Hotel. All rights reserved.</p>
    </div>
  </div>
</footer>

<style>
  .footer {
    background: #2c3e50;
    color: white;
    padding: 3rem 2rem 1rem;
    margin-top: auto;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .footer-section h3 {
    margin-bottom: 0.5rem;
  }
  
  .footer-section h4 {
    margin-bottom: 1rem;
    color: #ecf0f1;
  }
  
  .footer-section p {
    color: #bdc3c7;
    margin: 0.5rem 0;
  }
  
  .footer-section a {
    display: block;
    color: #bdc3c7;
    margin: 0.5rem 0;
  }
  
  .footer-section a:hover {
    color: white;
  }
  
  .footer-bottom {
    border-top: 1px solid #34495e;
    padding-top: 1rem;
    text-align: center;
    color: #95a5a6;
  }
  
  .footer-bottom p {
    margin: 0;
  }
</style>
