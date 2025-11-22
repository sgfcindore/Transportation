#!/bin/bash

# SGFC Web App - Automated Verification Script
# This script checks if all files are present and properly linked

echo "======================================"
echo "  SGFC WEB APP VERIFICATION SCRIPT"
echo "======================================"
echo ""

PASS=0
FAIL=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check file existence
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((FAIL++))
    fi
}

# Function to check directory existence
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        ((FAIL++))
    fi
}

echo "1. Checking Directory Structure..."
echo "-----------------------------------"
check_dir "css"
check_dir "js"
check_dir "ORIGINAL_FILES"
echo ""

echo "2. Checking HTML Files..."
echo "-----------------------------------"
check_file "index.html"
check_file "home.html"
check_file "dashboard.html"
echo ""

echo "3. Checking CSS Files..."
echo "-----------------------------------"
check_file "css/login.css"
check_file "css/home.css"
check_file "css/dashboard.css"
echo ""

echo "4. Checking JavaScript Files..."
echo "-----------------------------------"
check_file "js/firebase-config.js"
check_file "js/login.js"
check_file "js/home.js"
check_file "js/utils.js"
check_file "js/dashboard-main.js"
check_file "js/dashboard-security.js"
check_file "js/dashboard-fixes.js"
check_file "js/dashboard-deduplication.js"
echo ""

echo "5. Checking File Sizes..."
echo "-----------------------------------"

# Check if dashboard-main.js is large enough (should be ~330KB)
if [ -f "js/dashboard-main.js" ]; then
    SIZE=$(stat -f%z "js/dashboard-main.js" 2>/dev/null || stat -c%s "js/dashboard-main.js" 2>/dev/null)
    if [ "$SIZE" -gt 300000 ]; then
        echo -e "${GREEN}✓${NC} dashboard-main.js size OK: $(($SIZE / 1024))KB"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} dashboard-main.js too small: $(($SIZE / 1024))KB (expected ~330KB)"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗${NC} dashboard-main.js not found"
    ((FAIL++))
fi
echo ""

echo "6. Checking HTML Links..."
echo "-----------------------------------"

# Check if dashboard.html has correct CSS link
if grep -q 'href="css/dashboard.css"' dashboard.html 2>/dev/null; then
    echo -e "${GREEN}✓${NC} dashboard.html → css/dashboard.css link found"
    ((PASS++))
else
    echo -e "${RED}✗${NC} dashboard.html missing css/dashboard.css link"
    ((FAIL++))
fi

# Check if dashboard.html has correct JS links
if grep -q 'src="js/dashboard-main.js"' dashboard.html 2>/dev/null; then
    echo -e "${GREEN}✓${NC} dashboard.html → js/dashboard-main.js link found"
    ((PASS++))
else
    echo -e "${RED}✗${NC} dashboard.html missing js/dashboard-main.js link"
    ((FAIL++))
fi

# Check if index.html has correct CSS link
if grep -q 'href="css/login.css"' index.html 2>/dev/null; then
    echo -e "${GREEN}✓${NC} index.html → css/login.css link found"
    ((PASS++))
else
    echo -e "${RED}✗${NC} index.html missing css/login.css link"
    ((FAIL++))
fi

# Check if home.html has correct CSS link
if grep -q 'href="css/home.css"' home.html 2>/dev/null; then
    echo -e "${GREEN}✓${NC} home.html → css/home.css link found"
    ((PASS++))
else
    echo -e "${RED}✗${NC} home.html missing css/home.css link"
    ((FAIL++))
fi
echo ""

echo "7. Checking Original Backups..."
echo "-----------------------------------"
check_file "ORIGINAL_FILES/dashboard.html"
check_file "ORIGINAL_FILES/index.html"
check_file "ORIGINAL_FILES/home.html"
echo ""

echo "======================================"
echo "        VERIFICATION RESULTS"
echo "======================================"
echo ""
echo -e "${GREEN}PASSED:${NC} $PASS tests"
echo -e "${RED}FAILED:${NC} $FAIL tests"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your web app is properly reorganized and ready to use!"
    echo ""
    echo "Next steps:"
    echo "1. Open index.html in your browser to test"
    echo "2. Check browser console (F12) for any errors"
    echo "3. If everything works, upload to GitHub!"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED!${NC}"
    echo ""
    echo "Please review the errors above and:"
    echo "1. Make sure all files were extracted properly"
    echo "2. Check that folder structure matches expected layout"
    echo "3. Verify file paths in HTML files"
    echo ""
    echo "See VERIFICATION_CHECKLIST.md for detailed troubleshooting."
    echo ""
    exit 1
fi
