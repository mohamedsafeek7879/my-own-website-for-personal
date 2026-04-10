const API_BASE = '/api';
let items = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];

const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));

const loadMenu = async () => {
  const response = await fetch(`${API_BASE}/menu`);
  items = await response.json();
};

const renderMenu = async () => {
  const container = document.getElementById('menuContainer');
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p>No menu items available.</p>';
    return;
  }
  container.innerHTML = items
    .map((item, index) => `
      <div class="card">
        <img src="${item.image || 'https://via.placeholder.com/400x240?text=No+Image'}" alt="${item.name}" />
        <div class="card-body">
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <p><strong>₹${Number(item.price).toFixed(2)}</strong></p>
          <p><em>${item.category}</em></p>
          <div class="quantity">
            <button onclick="changeQuantity(${index}, -1)">-</button>
            <input id="qty-${index}" type="number" value="0" readonly />
            <button onclick="changeQuantity(${index}, 1)">+</button>
          </div>
          <button class="primary-btn" onclick="addToCart(${index})">Add to Cart</button>
        </div>
      </div>
    `)
    .join('');
};

const getQuantity = (index) => {
  const input = document.getElementById(`qty-${index}`);
  return input ? Number(input.value) : 0;
};

const changeQuantity = (index, delta) => {
  const input = document.getElementById(`qty-${index}`);
  if (!input) return;
  const newQty = Math.max(0, Number(input.value) + delta);
  input.value = newQty;
};

const addToCart = (index) => {
  const qty = getQuantity(index);
  const item = items[index];
  if (!qty || qty <= 0) {
    alert('Set quantity first.');
    return;
  }
  const existing = cart.find((cartItem) => cartItem.id === item.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ ...item, quantity: qty });
  }
  saveCart();
  renderMenuCart();
  alert(`${qty}x ${item.name} added to cart.`);
};

const removeFromMenuCart = (index) => {
  cart.splice(index, 1);
  saveCart();
  renderMenuCart();
};

const renderMenuCart = () => {
  const list = document.getElementById('menuCartList');
  if (!list) return;
  if (!cart.length) {
    list.innerHTML = '<li class="cart-item">Your cart is empty.</li>';
    document.getElementById('viewOrderButton').style.display = 'none';
    return;
  }
  document.getElementById('viewOrderButton').style.display = 'block';
  list.innerHTML = cart
    .map(
      (item, index) => `
      <li class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <span class="small">${item.quantity} × ₹${item.price.toFixed(2)}</span>
        </div>
        <div>
          ₹${(item.price * item.quantity).toFixed(2)}
          <button class="delete-btn" onclick="removeFromMenuCart(${index})">Delete</button>
        </div>
      </li>
    `
    )
    .join('');
};

const renderOrder = () => {
  const list = document.getElementById('cartList');
  if (!list) return;
  if (!cart.length) {
    list.innerHTML = '<li class="cart-item">Your cart is empty.</li>';
    document.getElementById('checkoutButton').style.display = 'none';
    return;
  }
  document.getElementById('checkoutButton').style.display = 'block';
  let subtotal = 0;
  list.innerHTML = cart
    .map((item, index) => {
      const total = item.price * item.quantity;
      subtotal += total;
      return `
      <li class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <span class="small">${item.quantity} × ₹${item.price.toFixed(2)}</span>
        </div>
        <div>
          ₹${total.toFixed(2)}
          <button class="delete-btn" onclick="removeFromCart(${index})">Delete</button>
        </div>
      </li>`;
    })
    .join('');
  const tax = subtotal * 0.1;
  document.getElementById('subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('tax').textContent = tax.toFixed(2);
  document.getElementById('total').textContent = (subtotal + tax).toFixed(2);
};

const removeFromCart = (index) => {
  cart.splice(index, 1);
  saveCart();
  renderOrder();
};

const checkoutOrder = async () => {
  if (!cart.length) {
    alert('Your cart is empty.');
    return;
  }
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSessionToken()}`
    },
    body: JSON.stringify({
      items: cart,
      total
    })
  });
  const data = await response.json();
  if (data.id) {
    localStorage.setItem('currentOrderId', data.id);
    alert('Order saved. Go to payment page.');
    window.location.href = 'payment.html';
  } else {
    alert(data.error || 'Order failed.');
  }
};

const renderPayment = async () => {
  const list = document.getElementById('paymentCart');
  if (!list) return;
  const orderId = localStorage.getItem('currentOrderId');
  if (!orderId) {
    list.innerHTML = '<li class="cart-item">No order found.</li>';
    return;
  }
  const response = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${getSessionToken()}`
    }
  });
  const data = await response.json();
  if (data.error) {
    list.innerHTML = `<li class="cart-item">${data.error}</li>`;
    return;
  }
  let subtotal = 0;
  list.innerHTML = data.items
    .map((item) => {
      const total = item.quantity * item.price;
      subtotal += total;
      return `
      <li class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <span class="small">${item.quantity} × ₹${item.price.toFixed(2)}</span>
        </div>
        <div>₹${total.toFixed(2)}</div>
      </li>`;
    })
    .join('');
  const tax = subtotal * 0.1;
  document.getElementById('paymentTotal').textContent = (subtotal + tax).toFixed(2);
  document.getElementById('paymentDoneButton').onclick = async () => {
    const confirmResponse = await fetch(`${API_BASE}/orders/${orderId}/confirm-payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSessionToken()}`
      }
    });
    const result = await confirmResponse.json();
    if (result.success === false || result.error) {
      alert(result.error || 'Cannot confirm payment yet.');
      return;
    }
    alert('Payment confirmed. Thank you!');
    clearSession();
    window.location.href = 'menu.html';
  };
};

const renderAdminView = async () => {
  const list = document.getElementById('orderList');
  if (!list) return;
  const response = await fetch(`${API_BASE}/orders`, {
    headers: {
      Authorization: `Bearer ${getSessionToken()}`
    }
  });
  const orders = await response.json();
  if (!orders.length) {
    list.innerHTML = '<li class="cart-item">No orders yet.</li>';
    return;
  }
  list.innerHTML = orders
    .map((order) => `
      <li class="cart-item">
        <div>
          <strong>Order ${order.id}</strong><br/>
          Customer: ${order.customer}<br/>
          Status: ${order.status}<br/>
          Total: ₹${order.total.toFixed(2)}
        </div>
        <div>
          ${order.status === 'pending' ? `<button class="primary-btn" onclick="markReceived(${order.id})">Mark Received</button>` : ''}
        </div>
      </li>
    `)
    .join('');
};

const markReceived = async (orderId) => {
  const response = await fetch(`${API_BASE}/orders/${orderId}/mark-received`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSessionToken()}`
    }
  });
  const result = await response.json();
  if (result.error) {
    alert(result.error);
    return;
  }
  alert('Order marked as received.');
  renderAdminView();
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  renderMenu();
  renderMenuCart();
  renderOrder();
  renderPayment();
  renderAdminView();

  const viewOrderButton = document.getElementById('viewOrderButton');
  if (viewOrderButton) {
    viewOrderButton.addEventListener('click', () => window.location.href = 'order.html');
  }

  const checkoutButton = document.getElementById('checkoutButton');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', checkoutOrder);
  }
});