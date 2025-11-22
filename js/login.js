    // Password toggle functionality
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    togglePassword.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Change icon
      if (type === 'text') {
        this.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
      } else {
        this.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    });
    
    // Form submission
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const successText = document.getElementById('successText');
    
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      // Hide previous messages
      errorMessage.classList.remove('show');
      successMessage.classList.remove('show');
      
      // Disable button and show loading
      loginButton.disabled = true;
      buttonText.innerHTML = '<div class="spinner"></div><span>Signing In...</span>';
      
      try {
        // Sign in with Firebase
        const userCredential = await window.signInWithEmailAndPassword(
          window.firebaseAuth,
          email,
          password
        );
        
        // Success
        successText.textContent = 'Login successful! Redirecting...';
        successMessage.classList.add('show');
        
        // Store user info
        localStorage.setItem('sgfc_user', JSON.stringify({
          email: userCredential.user.email,
          uid: userCredential.user.uid
        }));
        
        // Redirect to home page after 1 second
        setTimeout(() => {
          window.location.href = 'home.html';
        }, 1000);
        
      } catch (error) {
        // Error handling
        let errorMsg = 'Login failed. Please try again.';
        
        if (error.code === 'auth/invalid-email') {
          errorMsg = 'Invalid email address.';
        } else if (error.code === 'auth/user-not-found') {
          errorMsg = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
          errorMsg = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-credential') {
          errorMsg = 'Invalid credentials. Please check your email and password.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMsg = 'Too many failed attempts. Please try again later.';
        }
        
        errorText.textContent = errorMsg;
        errorMessage.classList.add('show');
        
        // Re-enable button
        loginButton.disabled = false;
        buttonText.innerHTML = 'Sign In';
      }
    });
    
    // Check if user is already logged in
    window.addEventListener('load', () => {
      const user = localStorage.getItem('sgfc_user');
      if (user) {
        window.location.href = 'home.html';
      }
    });
    
    // Add dynamic animation to trucks
    const createMovingTrucks = () => {
      const routes = [
        { x1: 200, y1: 195, x2: 267, y2: 272, delay: 0 },     // AP/Telangana
        { x1: 200, y1: 195, x2: 195, y2: 300, delay: 0.5 },   // Karnataka
        { x1: 200, y1: 195, x2: 212, y2: 355, delay: 1 },     // Tamil Nadu
        { x1: 200, y1: 195, x2: 115, y2: 185, delay: 1.5 },   // Gujarat
        { x1: 200, y1: 195, x2: 160, y2: 242, delay: 2 },     // Maharashtra
        { x1: 200, y1: 195, x2: 302, y2: 175, delay: 2.5 }    // West Bengal
      ];
      
      const trucksContainer = document.getElementById('trucks');
      
      routes.forEach((route, index) => {
        const truck = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        truck.innerHTML = `
          <rect x="-8" y="-4" width="16" height="8" fill="#fbbf24" rx="1"/>
          <rect x="2" y="-3" width="5" height="6" fill="#f59e0b" rx="1"/>
          <circle cx="-6" cy="4" r="1.5" fill="#333"/>
          <circle cx="4" cy="4" r="1.5" fill="#333"/>
          <animateMotion 
            dur="3s" 
            repeatCount="indefinite" 
            begin="${route.delay}s"
            path="M ${route.x1} ${route.y1} L ${route.x2} ${route.y2}"
          />
        `;
        truck.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
        trucksContainer.appendChild(truck);
      });
    };
    
    // Initialize truck animations
    createMovingTrucks();
