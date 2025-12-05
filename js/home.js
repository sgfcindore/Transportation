window.addEventListener('load', () => {
  // Check if user is logged in
  const user = localStorage.getItem('sgfc_user');
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  // Display user info
  try {
    const userData = JSON.parse(user);
    const email = userData.email || 'user@example.com';
    const userName = email.split('@')[0];
    const firstLetter = userName.charAt(0).toUpperCase();
    
    // Update user name (capitalize first letter)
    const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);
    document.getElementById('userName').textContent = displayName;
    
    // Update email
    document.getElementById('userEmail').textContent = email;
    
    // Update avatar with first letter
    document.getElementById('userAvatar').textContent = firstLetter;
  } catch (error) {
    console.error('Error loading user data:', error);
    // Set defaults if parsing fails
    document.getElementById('userName').textContent = 'User';
    document.getElementById('userEmail').textContent = 'user@example.com';
    document.getElementById('userAvatar').textContent = 'U';
  }
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', function() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('sgfc_user');
    window.location.href = 'index.html';
  }
});
