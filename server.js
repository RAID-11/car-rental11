const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8080;
const SECRET = 'autolux_secret_2025';
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'cars.json');
const ADMIN_PATH = path.join(DATA_DIR, 'admin.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Init folders
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'public/images'))) {
  fs.mkdirSync(path.join(__dirname, 'public/images'), { recursive: true });
}

// Init DB
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([
    { id: uuidv4(), name: 'Dacia Logan', price: '250', description: 'Idéale pour vos déplacements en ville', image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400', category: 'economique', whatsapp: '212600000000' },
    { id: uuidv4(), name: 'Hyundai Tucson', price: '550', description: 'SUV moderne et spacieux', image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=400', category: 'suv', whatsapp: '212600000000' },
    { id: uuidv4(), name: 'Range Rover Vogue', price: '1800', description: "L'ultime expression du luxe", image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400', category: 'luxe', whatsapp: '212600000000' }
  ]));
}

if (!fs.existsSync(ADMIN_PATH)) {
  fs.writeFileSync(ADMIN_PATH, JSON.stringify({
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10)
  }));
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/images/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const readCars = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeCars = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Auth
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const admin = JSON.parse(fs.readFileSync(ADMIN_PATH, 'utf8'));
  if (username !== admin.username || !bcrypt.compareSync(password, admin.password))
    return res.status(401).json({ error: 'Identifiants incorrects' });
  const token = jwt.sign({ username }, SECRET, { expiresIn: '24h' });
  res.json({ token });
});

app.get('/api/cars', (req, res) => res.json(readCars()));

app.post('/api/cars', auth, (req, res) => {
  const cars = readCars();
  const car = { id: uuidv4(), ...req.body };
  cars.push(car);
  writeCars(cars);
  res.json(car);
});

app.put('/api/cars/:id', auth, (req, res) => {
  let cars = readCars();
  cars = cars.map(c => c.id === req.params.id ? { ...c, ...req.body } : c);
  writeCars(cars);
  res.json({ success: true });
});

app.delete('/api/cars/:id', auth, (req, res) => {
  let cars = readCars().filter(c => c.id !== req.params.id);
  writeCars(cars);
  res.json({ success: true });
});

app.post('/api/change-password', auth, (req, res) => {
  const { newPassword } = req.body;
  const admin = JSON.parse(fs.readFileSync(ADMIN_PATH, 'utf8'));
  fs.writeFileSync(ADMIN_PATH, JSON.stringify({
    ...admin,
    password: bcrypt.hashSync(newPassword, 10)
  }));
  res.json({ success: true });
});

app.post('/api/upload', auth, upload.single('image'), (req, res) => {
  res.json({ url: `/images/${req.file.filename}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AutoLux Server: http://localhost:${PORT}`);
});
