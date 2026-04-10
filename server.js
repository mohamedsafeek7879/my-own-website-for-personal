const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const RESET_FILE = path.join(DATA_DIR, 'resetCodes.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const ensureDataFile = (filePath, defaultData) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const generateToken = () => {
  return crypto.randomBytes(24).toString('hex');
};

const createSession = (username, role) => {
  const sessions = readJson(SESSIONS_FILE);
  const token = generateToken();
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  sessions.push({ token, username, role, expiresAt });
  writeJson(SESSIONS_FILE, sessions);
  return token;
};

const getSession = (token) => {
  if (!token) return null;
  const sessions = readJson(SESSIONS_FILE);
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    const filtered = sessions.filter((s) => s.token !== token);
    writeJson(SESSIONS_FILE, filtered);
    return null;
  }
  return session;
};

const authMiddleware = (role) => (req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const token = auth.split(' ')[1];
  const session = getSession(token);
  if (!session || session.role !== role) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  req.session = session;
  next();
};

ensureDataFile(USERS_FILE, { customer: [], admin: [] });
ensureDataFile(SESSIONS_FILE, []);
ensureDataFile(MENU_FILE, {
  items: [
    {
      id: 1,
      name: 'Margherita Pizza',
      price: 299,
      description: 'Cheese pizza with basil and tomato',
      category: 'Mains',
      image: ''
    },
    {
      id: 2,
      name: 'Paneer Tikka',
      price: 239,
      description: 'Grilled paneer with spices',
      category: 'Appetizers',
      image: ''
    }
  ]
});
ensureDataFile(ORDERS_FILE, []);
ensureDataFile(RESET_FILE, { customer: {}, admin: {} });

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: 'Username, email, password and role are required' });
  }
  const usersData = readJson(USERS_FILE);
  const list = usersData[role];
  const existing = list.find((u) => u.username === username || u.email === email);
  if (existing) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }
  const hashed = hashPassword(password);
  list.push({ id: Date.now(), username, email, password: hashed });
  writeJson(USERS_FILE, usersData);
  return res.json({ success: true });
});

app.post('/api/auth/login', (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password || !role) {
    return res.status(400).json({ error: 'Identifier, password and role are required' });
  }
  const usersData = readJson(USERS_FILE);
  const list = usersData[role];
  const user = list.find((u) => u.username === identifier || u.email === identifier);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const hashed = hashPassword(password);
  if (user.password !== hashed) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createSession(user.username, role);
  return res.json({ token, username: user.username, role });
});

app.post('/api/auth/forgot', (req, res) => {
  const { identifier, role } = req.body;
  if (!identifier || !role) {
    return res.status(400).json({ error: 'Identifier and role are required' });
  }
  const usersData = readJson(USERS_FILE);
  const list = usersData[role];
  const user = list.find((u) => u.username === identifier || u.email === identifier);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }
  const resetCodes = readJson(RESET_FILE);
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  resetCodes[role][user.email] = { code, expiresAt: Date.now() + 10 * 60 * 1000 }; // 10 minutes
  writeJson(RESET_FILE, resetCodes);
  // In a real app, send email here
  console.log(`Reset code for ${user.email}: ${code}`);
  return res.json({ success: true, message: 'Reset code sent to your email' });
});

app.post('/api/auth/reset', (req, res) => {
  const { identifier, role, code, password } = req.body;
  if (!identifier || !role || !code || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const usersData = readJson(USERS_FILE);
  const list = usersData[role];
  const user = list.find((u) => u.username === identifier || u.email === identifier);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }
  const resetCodes = readJson(RESET_FILE);
  const resetData = resetCodes[role][user.email];
  if (!resetData || resetData.code !== code || Date.now() > resetData.expiresAt) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }
  const hashed = hashPassword(password);
  user.password = hashed;
  writeJson(USERS_FILE, usersData);
  delete resetCodes[role][user.email];
  writeJson(RESET_FILE, resetCodes);
  return res.json({ success: true });
});

app.get('/api/user', authMiddleware('customer'), (req, res) => {
  res.json({ loggedIn: true, role: 'customer', username: req.session.username });
});

app.get('/api/user', authMiddleware('admin'), (req, res) => {
  res.json({ loggedIn: true, role: 'admin', username: req.session.username });
});

app.get('/api/menu', (req, res) => {
  const menuData = readJson(MENU_FILE);
  res.json(menuData);
});

app.post('/api/menu', authMiddleware('admin'), (req, res) => {
  const { name, price, description, category, image } = req.body;
  if (!name || !price || !description || !category) {
    return res.status(400).json({ error: 'Name, price, description and category are required' });
  }
  const menuData = readJson(MENU_FILE);
  const newItem = {
    id: Date.now(),
    name,
    price: parseFloat(price),
    description,
    category,
    image: image || ''
  };
  menuData.items.push(newItem);
  writeJson(MENU_FILE, menuData);
  res.json({ success: true, item: newItem });
});

app.put('/api/menu/:id', authMiddleware('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, price, description, category, image } = req.body;
  if (!name || !price || !description || !category) {
    return res.status(400).json({ error: 'Name, price, description and category are required' });
  }
  const menuData = readJson(MENU_FILE);
  const item = menuData.items.find((i) => i.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  item.name = name;
  item.price = parseFloat(price);
  item.description = description;
  item.category = category;
  item.image = image || '';
  writeJson(MENU_FILE, menuData);
  res.json({ success: true, item });
});

app.delete('/api/menu/:id', authMiddleware('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const menuData = readJson(MENU_FILE);
  const index = menuData.items.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  menuData.items.splice(index, 1);
  writeJson(MENU_FILE, menuData);
  res.json({ success: true });
});

app.post('/api/orders', authMiddleware('customer'), (req, res) => {
  const { items, total } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items are required' });
  }
  const ordersData = readJson(ORDERS_FILE);
  const newOrder = {
    id: Date.now(),
    customer: req.session.username,
    items,
    total: parseFloat(total),
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  ordersData.push(newOrder);
  writeJson(ORDERS_FILE, ordersData);
  res.json({ success: true, orderId: newOrder.id });
});

app.get('/api/orders', authMiddleware('customer'), (req, res) => {
  const ordersData = readJson(ORDERS_FILE);
  const customerOrders = ordersData.filter((o) => o.customer === req.session.username);
  res.json(customerOrders);
});

app.get('/api/orders', authMiddleware('admin'), (req, res) => {
  const ordersData = readJson(ORDERS_FILE);
  res.json(ordersData);
});

app.put('/api/orders/:id/status', authMiddleware('admin'), (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  const ordersData = readJson(ORDERS_FILE);
  const order = ordersData.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  order.status = status;
  writeJson(ORDERS_FILE, ordersData);
  res.json({ success: true, order });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});