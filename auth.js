// Demo credentials (in real app, use server-side authentication)
const CUSTOMER_CREDENTIALS = {
  username: 'customer',
  password: '12345'
};

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: '12345'
};

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

function loginCustomer(username, password) {
  if (username === CUSTOMER_CREDENTIALS.username && password === CUSTOMER_CREDENTIALS.password) {
    const sessionToken = generateToken();
    localStorage.setItem('customerSession', JSON.stringify({
      username: username,
      token: sessionToken,
      loginTime: Date.now(),
      type: 'customer'
    }));
    return true;
  }
  return false;
}

function loginAdmin(username, password) {
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    const sessionToken = generateToken();
    localStorage.setItem('adminSession', JSON.stringify({
      username: username,
      token: sessionToken,
      loginTime: Date.now(),
      type: 'admin'
    }));
    return true;
  }
  return false;
}

function generateToken() {
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

function isCustomerLoggedIn() {
  const session = JSON.parse(localStorage.getItem('customerSession') || 'null');
  if (!session) return false;
  
  const isExpired = Date.now() - session.loginTime > SESSION_TIMEOUT;
  if (isExpired) {
    logoutCustomer();
    return false;
  }
  return true;
}

function isAdminLoggedIn() {
  const session = JSON.parse(localStorage.getItem('adminSession') || 'null');
  if (!session) return false;
  
  const isExpired = Date.now() - session.loginTime > SESSION_TIMEOUT;
  if (isExpired) {
    logoutAdmin();
    return false;
  }
  return true;
}

function getCustomerUsername() {
  const session = JSON.parse(localStorage.getItem('customerSession') || 'null');
  return session ? session.username : null;
}

function getAdminUsername() {
  const session = JSON.parse(localStorage.getItem('adminSession') || 'null');
  return session ? session.username : null;
}

function logoutCustomer() {
  localStorage.removeItem('customerSession');
  localStorage.removeItem('cart');
  window.location.href = 'index.html';
}

function logoutAdmin() {
  localStorage.removeItem('adminSession');
  window.location.href = 'index.html';
}

// Protect pages
function protectCustomerPage() {
  if (!isCustomerLoggedIn()) {
    alert('Please login as customer first!');
    window.location.href = 'customer-login.html';
  }
}

function protectAdminPage() {
  if (!isAdminLoggedIn()) {
    alert('Please login as admin first!');
    window.location.href = 'admin-login.html';
  }
}

function updateSessionInfo() {
  const userHeader = document.getElementById('userHeader');
  if (userHeader) {
    if (isCustomerLoggedIn()) {
      userHeader.textContent = `Logged in as: ${getCustomerUsername()}`;
    } else if (isAdminLoggedIn()) {
      userHeader.textContent = `Admin: ${getAdminUsername()}`;
    }
  }
}