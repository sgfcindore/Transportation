# South Gujrat Freight Carrier - Transportation Management System

A comprehensive web-based transportation and logistics management system for South Gujrat Freight Carrier.

## 📁 Project Structure

```
sgfc-web-app/
├── index.html                  # Login page
├── home.html                   # Home/landing page  
├── dashboard.html              # Main dashboard
├── css/
│   ├── dashboard.css          # Dashboard styles
│   ├── home.css               # Home page styles
│   └── login.css              # Login page styles
├── js/
│   ├── firebase-config.js     # Firebase configuration
│   ├── utils.js               # Utility functions
│   ├── dashboard-main.js      # Main dashboard logic
│   ├── dashboard-security.js  # Security features
│   ├── dashboard-fixes.js     # Bug fixes and enhancements
│   ├── dashboard-deduplication.js # Duplicate prevention
│   ├── login.js               # Login functionality
│   └── home.js                # Home page functionality
├── ORIGINAL_FILES/            # Backup of original files
└── README.md                  # This file
```

## 🚀 Features

- **Daily Register Management** - Track daily operations
- **LR Creation** - Booking and Non-Booking LR management
- **Challan Book** - Manage challans and receipts
- **LR Received** - Track received LRs
- **Billing** - Invoice generation and management
- **Payment Tracking** - Monitor payments and receivables
- **Profit & Loss** - Financial analytics
- **Ledger** - Account management
- **Reports** - Comprehensive reporting
- **GST** - GST compliance and reporting

## 🛠️ Technologies Used

- HTML5, CSS3, JavaScript (ES6+)
- TailwindCSS for styling
- Firebase (Firestore) for data storage
- Firebase Authentication

## 📦 Setup Instructions

### 1. **Local Development**

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Login with your credentials

### 2. **Firebase Configuration**

The app is already configured with Firebase. The configuration is in:
- `js/firebase-config.js` (for dashboard)
- Inline in `index.html` (for authentication)

### 3. **Deploy to Web Server**

Upload all files to your web hosting:
```bash
# Example using FTP/SFTP
- Upload all HTML files to root
- Upload css/ folder
- Upload js/ folder
```

## 🔐 Security Features

- Input sanitization and validation
- XSS protection
- Secure password hashing
- Firebase Authentication
- Duplicate prevention system
- Admin access controls

## 📝 File Descriptions

### HTML Files
- `index.html` - Login page with Firebase Auth integration
- `home.html` - Welcome page after login
- `dashboard.html` - Main application dashboard with all features

### CSS Files
- `dashboard.css` - Professional corporate theme for dashboard
- `home.css` - Landing page styles with animations
- `login.css` - Login page styles with map animation

### JavaScript Files
- `firebase-config.js` - Firebase initialization
- `utils.js` - Helper functions (date formatting, number conversion, etc.)
- `dashboard-main.js` - Core dashboard functionality (7,900+ lines)
- `dashboard-security.js` - Security validations and sanitization
- `dashboard-fixes.js` - Bug fixes and patches
- `dashboard-deduplication.js` - Prevents duplicate records
- `login.js` - Login form handling
- `home.js` - Home page interactions

## 🔧 Maintenance

### Making Changes

1. **CSS Changes**: Edit files in `css/` folder
2. **JavaScript Changes**: Edit files in `js/` folder
3. **HTML Structure**: Edit the respective HTML file

### Important Notes

- Original files are backed up in `ORIGINAL_FILES/` folder
- Do not modify files in `ORIGINAL_FILES/` - they are for reference only
- Test changes locally before deploying to production

## 📊 Database Structure

The app uses Firebase Firestore with the following collections:
- `daily_register` - Daily register entries
- `booking_lr` - Booking LRs
- `non_booking_lr` - Non-booking LRs
- `challans` - Challan records
- `lr_received` - Received LR records
- `billing` - Bill records
- `payments` - Payment tracking

## 🐛 Bug Fixes Included

- Number to words conversion (Indian numbering system)
- Date formatting fixes
- Duplicate record prevention
- Form validation improvements
- Security enhancements
- Performance optimizations

## 📞 Support

For issues or questions, contact the development team.

## 📜 License

Proprietary - South Gujrat Freight Carrier

---

**Version**: 2.0 (Reorganized)  
**Last Updated**: November 2024  
**Status**: Production Ready ✅
