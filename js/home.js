    window.addEventListener('load', () => {
      const user = localStorage.getItem('sgfc_user');
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      
      // Display user info
      const userData = JSON.parse(user);
      const email = userData.email;
      const userName = email.split('@')[0];
      const firstLetter = userName.charAt(0).toUpperCase();
      
      document.getElementById('userName').textContent = userName.charAt(0).toUpperCase() + userName.slice(1);
      document.getElementById('userEmail').textContent = email;
      document.getElementById('userAvatar').textContent = firstLetter;
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', function() {
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('sgfc_user');
        window.location.href = 'index.html';
      }
    });
