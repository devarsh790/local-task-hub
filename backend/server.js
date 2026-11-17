const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../frontend')));

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading data file:', err);
    return null;
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing data file:', err);
    return false;
  }
}

function checkLevelUp(user) {
  let leveledUp = false;
  const xpThreshold = user.level * 500;
  user.xpToNextLevel = xpThreshold;

  while (user.xp >= user.xpToNextLevel) {
    user.xp -= user.xpToNextLevel;
    user.level += 1;
    user.xpToNextLevel = user.level * 500;
    leveledUp = true;
  }

  if (user.level === 1) user.levelTitle = "Novice Student";
  else if (user.level === 2) user.levelTitle = "Scholar Adventurer";
  else if (user.level === 3) user.levelTitle = "Honor Student";
  else if (user.level === 4) user.levelTitle = "Dean's List Scholar";
  else if (user.level >= 5) user.levelTitle = "Master Academician";

  return leveledUp;
}

// REST ENDPOINTS

app.post('/api/login', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });
  const { role, username, password } = req.body;

  if (role === 'admin') {
    if (username === db.admin.username && password === db.admin.password) {
      return res.json({ success: true, role: 'admin', user: db.admin, message: 'Welcome Admin!' });
    }
    return res.status(401).json({ error: 'Invalid Admin Credentials' });
  }

  return res.json({ success: true, role: 'student', user: db.user, message: `Welcome ${db.user.name}!` });
});

app.get('/api/user', (req, res) => {
  const db = readData();
  res.json(db ? db.user : {});
});

app.post('/api/user/daily-reward', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });

  const todayStr = new Date().toISOString().slice(0, 10);
  if (db.user.lastDailyClaim === todayStr) {
    return res.status(400).json({ error: 'Daily reward already claimed today!' });
  }

  db.user.lastDailyClaim = todayStr;
  db.user.streak = (db.user.streak || 0) + 1;

  const totalDailyCoins = 100 + Math.min(200, db.user.streak * 20);
  db.user.coins += totalDailyCoins;
  db.user.totalCoinsEarned += totalDailyCoins;
  db.user.xp += 50;

  checkLevelUp(db.user);
  writeData(db);

  res.json({ message: `🎁 Daily Bonus +${totalDailyCoins} Coins!`, totalDailyCoins, user: db.user });
});

app.get('/api/tasks', (req, res) => {
  const db = readData();
  res.json(db ? db.tasks : []);
});

app.post('/api/tasks', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });

  const { title, category, coins, difficulty, dueDate, description, type } = req.body;
  const newTask = {
    id: 'task-' + Date.now(),
    title,
    type: type || 'standard',
    category: category || 'General',
    coins: parseInt(coins) || 100,
    difficulty: difficulty || 'Medium',
    dueDate: dueDate || 'Today',
    description: description || '',
    completed: false,
    createdAt: new Date().toISOString()
  };

  db.tasks.unshift(newTask);
  writeData(db);
  res.status(201).json({ message: 'Task created', task: newTask });
});

// Interactive Task Submission (Math Quiz, Photo Upload, Paragraph Essay, Drawing)
app.post('/api/tasks/:id/submit', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });

  const taskId = req.params.id;
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.completed) return res.status(400).json({ error: 'Task already completed & claimed!' });

  const { proofType, proofContent, studentName } = req.body;

  task.completed = true;
  task.completedAt = new Date().toISOString();

  const earnedCoins = task.coins || 100;
  const earnedXP = Math.round(earnedCoins * 1.2);

  db.user.coins += earnedCoins;
  db.user.totalCoinsEarned += earnedCoins;
  db.user.xp += earnedXP;
  const leveledUp = checkLevelUp(db.user);

  // Record submission proof
  if (!db.submissions) db.submissions = [];
  const newSubmission = {
    id: 'sub-' + Date.now(),
    taskId: task.id,
    taskTitle: task.title,
    studentName: studentName || db.user.name,
    type: proofType || task.type || 'standard',
    proof: proofContent || 'Task completed.',
    coinsEarned: earnedCoins,
    submittedAt: new Date().toISOString()
  };

  db.submissions.unshift(newSubmission);
  writeData(db);

  res.json({
    message: `Quest completed! +${earnedCoins} Coins Claimed!`,
    earnedCoins,
    earnedXP,
    leveledUp,
    task,
    submission: newSubmission,
    user: db.user
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });
  db.tasks = db.tasks.filter(t => t.id !== req.params.id);
  writeData(db);
  res.json({ message: 'Task deleted' });
});

app.get('/api/submissions', (req, res) => {
  const db = readData();
  res.json(db ? (db.submissions || []) : []);
});

app.get('/api/rewards', (req, res) => {
  const db = readData();
  res.json(db ? db.rewards : []);
});

app.post('/api/rewards', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });

  const { title, category, coins, image, badge, stock, description } = req.body;
  const newReward = {
    id: 'rew-' + Date.now(),
    title,
    category: category || 'Gear',
    coins: parseInt(coins) || 500,
    image: image || 'assets/reward_books.png',
    badge: badge || 'NEW ITEM',
    stock: parseInt(stock) || 10,
    description: description || 'Store item',
    deliveryType: 'Physical Delivery'
  };

  db.rewards.unshift(newReward);
  writeData(db);
  res.status(201).json({ message: 'Store item added', reward: newReward });
});

app.post('/api/rewards/claim', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });

  const { rewardId, studentName, phone, address, email, notes } = req.body;
  const reward = db.rewards.find(r => r.id === rewardId);

  if (!reward) return res.status(404).json({ error: 'Reward item not found' });
  if (db.user.coins < reward.coins) {
    return res.status(400).json({ error: `Insufficient coins balance. Need ${reward.coins - db.user.coins} more coins.` });
  }

  db.user.coins -= reward.coins;
  reward.stock -= 1;

  const codePrefix = reward.deliveryType === 'Digital Pass' ? 'VOUCHER' : 'SHIP';
  const claimCode = `${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

  const newClaim = {
    id: 'CLM-' + Math.floor(10000 + Math.random() * 90000),
    rewardTitle: reward.title,
    category: reward.category,
    coinsSpent: reward.coins,
    itemWorth: reward.coins,
    image: reward.image,
    status: 'Processing',
    claimedAt: new Date().toISOString(),
    code: claimCode,
    studentName: studentName || db.user.name,
    email: email || db.user.email,
    phone: phone || '',
    address: address || 'Campus Dorm',
    notes: notes || ''
  };

  db.claims.unshift(newClaim);
  writeData(db);

  res.json({ message: 'Item claimed!', claim: newClaim, user: db.user });
});

app.get('/api/claims', (req, res) => {
  const db = readData();
  res.json(db ? db.claims : []);
});

app.put('/api/claims/:id/status', (req, res) => {
  const db = readData();
  if (!db) return res.status(500).json({ error: 'Database read error' });

  const { status } = req.body;
  const claim = db.claims.find(c => c.id === req.params.id);
  if (claim) claim.status = status;

  writeData(db);
  res.json({ message: 'Order status updated', claim });
});

app.listen(PORT, () => {
  console.log(`🚀 Student QuestHub listening at http://localhost:${PORT}`);
});