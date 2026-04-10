const API_BASE = '/api';
let editItemId = null;

const getSessionToken = () => localStorage.getItem('sessionToken');

const loadAdminMenu = async () => {
  const response = await fetch(`${API_BASE}/menu`, {
    headers: { Authorization: `Bearer ${getSessionToken()}` }
  });
  return response.json();
};

const renderAdminMenu = async () => {
  const list = document.getElementById('adminList');
  if (!list) return;
  const items = await loadAdminMenu();
  if (!items.length) {
    list.innerHTML = '<li class="cart-item">No menu items.</li>';
    return;
  }
  list.innerHTML = items
    .map((item) => `
      <li class="cart-item">
        <div>
          <strong>${item.name}</strong><br/>
          ₹${item.price.toFixed(2)} • ${item.category}<br/>
          ${item.description || ''}
        </div>
        <div>
          <button onclick="startEdit(${item.id})">Edit</button>
          <button class="danger-btn" onclick="deleteMenuItem(${item.id})">Delete</button>
        </div>
      </li>
    `)
    .join('');
};

const getFormValues = () => ({
  name: document.getElementById('name').value.trim(),
  price: Number(document.getElementById('price').value),
  description: document.getElementById('description').value.trim(),
  category: document.getElementById('category').value,
  image: document.getElementById('image').value.trim()
});

const clearForm = () => {
  editItemId = null;
  document.getElementById('itemForm').reset();
  document.getElementById('saveBtn').textContent = 'Add Item';
};

const saveMenuItem = async (e) => {
  e.preventDefault();
  const item = getFormValues();
  if (!item.name || !item.price) {
    alert('Name and price are required.');
    return;
  }
  const url = editItemId ? `${API_BASE}/menu/${editItemId}` : `${API_BASE}/menu`;
  const method = editItemId ? 'PUT' : 'POST';
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSessionToken()}`
    },
    body: JSON.stringify(item)
  });
  const result = await response.json();
  if (result.error) {
    alert(result.error);
    return;
  }
  alert(editItemId ? 'Item updated.' : 'Item added.');
  clearForm();
  renderAdminMenu();
};

const startEdit = async (id) => {
  const items = await loadAdminMenu();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  document.getElementById('name').value = item.name;
  document.getElementById('price').value = item.price;
  document.getElementById('description').value = item.description;
  document.getElementById('category').value = item.category;
  document.getElementById('image').value = item.image;
  editItemId = item.id;
  document.getElementById('saveBtn').textContent = 'Update Item';
};

const deleteMenuItem = async (id) => {
  if (!confirm('Delete this item?')) return;
  const response = await fetch(`${API_BASE}/menu/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getSessionToken()}` }
  });
  const result = await response.json();
  if (result.error) {
    alert(result.error);
    return;
  }
  alert('Item deleted.');
  renderAdminMenu();
};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('itemForm').addEventListener('submit', saveMenuItem);
  document.getElementById('clearAll').addEventListener('click', async () => {
    if (!confirm('Clear all menu items?')) return;
    await fetch(`${API_BASE}/menu`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getSessionToken()}` }
    });
    renderAdminMenu();
  });
  renderAdminMenu();
});