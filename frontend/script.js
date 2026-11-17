// --- APP STATE & CONFIG --- //
const API_BASE = 'http://localhost:5000/api';

let state = {
  currentRole: 'student',
  user: {
    name: 'Alex Chen',
    major: 'Computer Science & Engineering',
    studentId: 'STU-2026-9482',
    email: 'alex.chen@university.edu',
    phone: '+1 (555) 234-5678',
    address: 'Dorm Block B, Room 402, Campus Quad',
    level: 2,
    levelTitle: 'Scholar Adventurer',
    xp: 420,
    xpToNextLevel: 1000,
    coins: 1250,
    totalCoinsEarned: 2450,
    streak: 5,
    lastDailyClaim: null,
    badges: ['First Quest Completed', 'Study Streak 5x', 'Tech Pioneer', 'Book Worm']
  },
  tasks: [],
  rewards: [],
  claims: [],
  submissions: [],
  activeTab: 'tasks',
  activeRewardCategory: 'All',
  activeInteractiveTaskId: null,
  photoPreviewData: null
};

// Canvas drawing state
let canvasCtx = null;
let isDrawing = false;

// --- INITIALIZATION --- //
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupEventListeners();
  initDrawingCanvas();
  loadAllData();
});

function initTheme() {
  const saved = localStorage.getItem('taskhub_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('taskhub_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// --- AUTHENTICATION --- //
function switchLoginRole(role) {
  const isStudent = role === 'student';
  document.getElementById('studentRoleTab').classList.toggle('active', isStudent);
  document.getElementById('adminRoleTab').classList.toggle('active', !isStudent);
  document.getElementById('studentLoginForm').classList.toggle('active', isStudent);
  document.getElementById('adminLoginForm').classList.toggle('active', !isStudent);
}

function openLoginOverlay() { document.getElementById('loginOverlay').classList.add('active'); }
function closeLoginOverlay() { document.getElementById('loginOverlay').classList.remove('active'); }

document.getElementById('studentLoginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.user.name = document.getElementById('loginStudentName').value || 'Alex Chen';
  state.user.major = document.getElementById('loginStudentMajor').value || 'Computer Science & Engineering';
  state.currentRole = 'student';

  document.getElementById('roleHeaderBadge').textContent = 'STUDENT';
  document.getElementById('studentHeaderStats').classList.remove('hidden');

  closeLoginOverlay();
  switchView('student');
  renderAll();
  showToast(`Logged in as Student ${state.user.name}`, 'success');
});

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('adminUser').value;
  const password = document.getElementById('adminPass').value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin', username, password })
    });

    if (res.ok) {
      state.currentRole = 'admin';
      document.getElementById('roleHeaderBadge').textContent = 'ADMIN CONTROL';
      document.getElementById('studentHeaderStats').classList.add('hidden');
      closeLoginOverlay();
      switchView('admin');
      renderAdminDashboard();
      showToast('Welcome Admin!', 'gold');
    } else {
      showToast('Invalid Admin Credentials', 'error');
    }
  } catch (err) {
    if (username === 'admin' && password === 'admin123') {
      state.currentRole = 'admin';
      document.getElementById('roleHeaderBadge').textContent = 'ADMIN CONTROL';
      document.getElementById('studentHeaderStats').classList.add('hidden');
      closeLoginOverlay();
      switchView('admin');
      renderAdminDashboard();
      showToast('Admin Mode Unlocked', 'gold');
    } else {
      showToast('Invalid Admin Credentials', 'error');
    }
  }
});

function switchView(role) {
  document.getElementById('studentView').classList.toggle('active', role === 'student');
  document.getElementById('adminView').classList.toggle('active', role === 'admin');
}

// --- DATA FETCHING & LOCALSTORAGE --- //
async function loadAllData() {
  try {
    const [uRes, tRes, rRes, cRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/user`),
      fetch(`${API_BASE}/tasks`),
      fetch(`${API_BASE}/rewards`),
      fetch(`${API_BASE}/claims`),
      fetch(`${API_BASE}/submissions`)
    ]);

    if (uRes.ok && tRes.ok && rRes.ok && cRes.ok) {
      state.user = await uRes.json();
      state.tasks = await tRes.json();
      state.rewards = await rRes.json();
      state.claims = await cRes.json();
      if (sRes.ok) state.submissions = await sRes.json();
    } else {
      loadFallback();
    }
  } catch (err) {
    loadFallback();
  }

  renderAll();
}

function loadFallback() {
  const u = localStorage.getItem('taskhub_user');
  const t = localStorage.getItem('taskhub_tasks');
  const r = localStorage.getItem('taskhub_rewards');
  const c = localStorage.getItem('taskhub_claims');
  const s = localStorage.getItem('taskhub_submissions');

  state.user = u ? JSON.parse(u) : state.user;
  state.tasks = t ? JSON.parse(t) : [
    { id: 'task-quiz-1', title: 'Solve 5-Question Basic Math & Science Quiz', type: 'quiz', category: 'Academic', coins: 200, difficulty: 'Medium', dueDate: 'Today, 6:00 PM', description: 'Complete all 5 math questions correctly to test your problem solving speed.', completed: false },
    { id: 'task-photo-1', title: 'Capture & Upload Photo of 10 Study Items on Desk', type: 'photo', category: 'General', coins: 250, difficulty: 'Hard', dueDate: 'Today, 9:00 PM', description: 'Take a clear picture of your organized study desk showing notebooks, pens & tech gear.', completed: false },
    { id: 'task-para-1', title: 'Write a 100-Word Essay on "AI in Future Education"', type: 'paragraph', category: 'Academic', coins: 180, difficulty: 'Medium', dueDate: 'Tomorrow, 5:00 PM', description: 'Write a thoughtful paragraph discussing how AI technology will transform learning.', completed: false },
    { id: 'task-draw-1', title: 'Draw a Science Diagram & Upload Picture/Canvas', type: 'drawing', category: 'Academic', coins: 220, difficulty: 'Epic', dueDate: 'Tomorrow, 8:00 PM', description: 'Use the drawing pad or upload a photo of your handwritten science diagram.', completed: false },
    { id: 'task-5', title: 'Clean & Sanitize Study Desk & Setup', type: 'standard', category: 'General', coins: 50, difficulty: 'Easy', dueDate: 'Today, 10:00 PM', description: 'Organize notebook files, sanitize workspace.', completed: true }
  ];
  state.rewards = r ? JSON.parse(r) : [
    { id: 'rew-1', title: 'Best-Seller Academic Book Set', category: 'Books & Study', coins: 600, image: 'assets/reward_books.png', badge: 'POPULAR', stock: 15, description: 'Set of 3 academic excellence books.', deliveryType: 'Physical Delivery' },
    { id: 'rew-2', title: 'Custom Student Oversized T-Shirt', category: 'Apparel', coins: 850, image: 'assets/reward_tshirt.png', badge: 'BESTSELLER', stock: 20, description: 'Heavy cotton graphic student t-shirt.', deliveryType: 'Physical Delivery' },
    { id: 'rew-3', title: 'Studio Wireless Headphones', category: 'Tech & Audio', coins: 2200, image: 'assets/reward_headphones.png', badge: 'PREMIUM', stock: 8, description: 'Deep bass noise canceling headphones.', deliveryType: 'Physical Delivery' },
    { id: 'rew-4', title: 'Noise-Canceling Wireless Earbuds', category: 'Tech & Audio', coins: 1600, image: 'assets/reward_earphones.png', badge: 'HOT', stock: 12, description: 'Compact ergonomic earbuds.', deliveryType: 'Physical Delivery' },
    { id: 'rew-5', title: 'Ergonomic Laptop Backpack', category: 'Gear', coins: 1400, image: 'assets/reward_backpack.png', badge: 'ESSENTIAL', stock: 10, description: 'Water-resistant tech backpack.', deliveryType: 'Physical Delivery' },
    { id: 'rew-6', title: 'Stainless Steel Water Flask', category: 'Gear', coins: 500, image: 'assets/reward_flask.png', badge: 'MUST HAVE', stock: 25, description: 'Thermal desk tumbler.', deliveryType: 'Physical Delivery' }
  ];
  state.claims = c ? JSON.parse(c) : [];
  state.submissions = s ? JSON.parse(s) : [];
}

function saveLocalState() {
  localStorage.setItem('taskhub_user', JSON.stringify(state.user));
  localStorage.setItem('taskhub_tasks', JSON.stringify(state.tasks));
  localStorage.setItem('taskhub_rewards', JSON.stringify(state.rewards));
  localStorage.setItem('taskhub_claims', JSON.stringify(state.claims));
  localStorage.setItem('taskhub_submissions', JSON.stringify(state.submissions));
}

// --- DAILY REWARD --- //
async function claimDailyReward() {
  const todayStr = new Date().toISOString().slice(0, 10);
  if (state.user.lastDailyClaim === todayStr) {
    showToast('Daily bonus already claimed today! Check back tomorrow.', 'info');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/user/daily-reward`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      triggerCelebration(data.totalDailyCoins, false);
      showToast(`🎁 Claimed Daily Reward: +${data.totalDailyCoins} Coins!`, 'gold');
    } else {
      claimDailyFallback();
    }
  } catch (err) {
    claimDailyFallback();
  }

  saveLocalState();
  renderAll();
}

function claimDailyFallback() {
  const todayStr = new Date().toISOString().slice(0, 10);
  state.user.lastDailyClaim = todayStr;
  state.user.streak = (state.user.streak || 0) + 1;
  const bonus = 100 + Math.min(200, state.user.streak * 20);

  state.user.coins += bonus;
  state.user.totalCoinsEarned += bonus;
  triggerCelebration(bonus, false);
  showToast(`🎁 Claimed Daily Bonus: +${bonus} Coins!`, 'gold');
}

// --- RENDERING PIPELINE --- //
function renderAll() {
  renderHeaderStats();
  renderHeroStats();
  renderTasks();
  renderRewards();
  renderClaims();
  renderProfile();
  if (state.currentRole === 'admin') renderAdminDashboard();
}

function renderHeaderStats() {
  document.getElementById('userCoinBalance').textContent = state.user.coins.toLocaleString();
  document.getElementById('userStreak').textContent = `${state.user.streak || 0} Days`;

  const todayStr = new Date().toISOString().slice(0, 10);
  const claimedToday = state.user.lastDailyClaim === todayStr;
  const dailyBtn = document.getElementById('claimDailyBtn');
  const dailyTxt = document.getElementById('dailyBtnText');

  if (claimedToday) {
    dailyBtn.classList.add('claimed');
    dailyTxt.textContent = 'Claimed Today ✅';
  } else {
    dailyBtn.classList.remove('claimed');
    dailyTxt.textContent = 'Daily Reward (+100 Coins)';
  }
}

function renderHeroStats() {
  document.getElementById('welcomeHeading').textContent = `Hello, ${state.user.name.split(' ')[0]}! Complete quests for rewards! 👋`;

  const xp = state.user.xp || 0;
  const xpToNext = state.user.xpToNextLevel || (state.user.level * 500);
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));

  document.getElementById('xpLevelNum').textContent = state.user.level || 1;
  document.getElementById('xpTextDisplay').textContent = `${xp} / ${xpToNext} XP`;
  document.getElementById('xpBarFill').style.width = `${pct}%`;

  document.getElementById('metricCoins').textContent = state.user.coins.toLocaleString();
  document.getElementById('metricTotalEarned').textContent = (state.user.totalCoinsEarned || 0).toLocaleString();
  document.getElementById('metricPendingTasks').textContent = state.tasks.filter(t => !t.completed).length;
  document.getElementById('metricClaimsCount').textContent = state.claims.length;

  document.getElementById('taskTabBadge').textContent = state.tasks.filter(t => !t.completed).length;
  document.getElementById('shopUserCoins').textContent = `🪙 ${state.user.coins.toLocaleString()}`;
  document.getElementById('claimsTabBadge').textContent = state.claims.length;
}

function renderTasks() {
  const container = document.getElementById('tasksGrid');
  const search = document.getElementById('taskSearchInput').value.toLowerCase();
  const catFilter = document.getElementById('categoryFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

  let filtered = state.tasks.filter(t => {
    const sMatch = t.title.toLowerCase().includes(search) || (t.description && t.description.toLowerCase().includes(search));
    const cMatch = catFilter === 'All' || t.category === catFilter;
    const stMatch = statusFilter === 'All' || (statusFilter === 'Pending' && !t.completed) || (statusFilter === 'Completed' && t.completed);
    return sMatch && cMatch && stMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center w-100 py-5" style="grid-column: 1 / -1; padding: 40px;">
        <i class="fa-solid fa-clipboard-check text-muted" style="font-size: 3rem; margin-bottom: 12px;"></i>
        <h3>No tasks found</h3>
        <p class="text-muted">Try interactive quests (Math Quiz, Photo Upload, Paragraph Essay)!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(task => {
    const catClass = getCategoryClass(task.category);
    const diffClass = getDifficultyClass(task.difficulty);

    let actionButton = '';
    if (task.completed) {
      actionButton = `<button class="btn-completed-done"><i class="fa-solid fa-check-circle"></i> Submitted Proof & Claimed (${task.coins} Coins)</button>`;
    } else {
      if (task.type === 'quiz') {
        actionButton = `<button class="btn-complete-claim" onclick="openInteractiveTaskModal('quiz', '${task.id}')"><i class="fa-solid fa-calculator"></i> Solve Math Quiz (+${task.coins} Coins)</button>`;
      } else if (task.type === 'photo') {
        actionButton = `<button class="btn-complete-claim" onclick="openInteractiveTaskModal('photo', '${task.id}')"><i class="fa-solid fa-camera"></i> Capture & Upload Photo (+${task.coins} Coins)</button>`;
      } else if (task.type === 'paragraph') {
        actionButton = `<button class="btn-complete-claim" onclick="openInteractiveTaskModal('paragraph', '${task.id}')"><i class="fa-solid fa-pen-nib"></i> Write Paragraph Essay (+${task.coins} Coins)</button>`;
      } else if (task.type === 'drawing') {
        actionButton = `<button class="btn-complete-claim" onclick="openInteractiveTaskModal('drawing', '${task.id}')"><i class="fa-solid fa-paintbrush"></i> Draw Diagram (+${task.coins} Coins)</button>`;
      } else {
        actionButton = `<button class="btn-complete-claim" onclick="completeStandardTask('${task.id}')"><i class="fa-solid fa-coins"></i> Complete & Claim ${task.coins} Coins</button>`;
      }
    }

    return `
      <div class="task-card ${task.completed ? 'completed' : ''}">
        <div class="task-card-header">
          <span class="category-tag ${catClass}">${task.category} • ${task.type ? task.type.toUpperCase() : 'TASK'}</span>
          <span class="task-coin-badge"><i class="fa-solid fa-bolt"></i> +${task.coins} Coins</span>
        </div>

        <div>
          <h3 class="task-title">${escapeHTML(task.title)}</h3>
          <p class="task-desc">${escapeHTML(task.description || 'Interactive task module.')}</p>
        </div>

        <div class="task-meta">
          <span class="difficulty-badge ${diffClass}"><i class="fa-solid fa-signal"></i> ${task.difficulty || 'Medium'}</span>
          <span><i class="fa-regular fa-clock"></i> ${task.dueDate || 'Today'}</span>
        </div>

        <div class="task-actions">
          ${actionButton}
          <button class="btn-delete-task" onclick="deleteTask('${task.id}')" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function renderRewards() {
  const container = document.getElementById('rewardsGrid');
  const cat = state.activeRewardCategory;

  let filtered = state.rewards.filter(r => cat === 'All' || r.category === cat);

  container.innerHTML = filtered.map(reward => {
    const canAfford = state.user.coins >= reward.coins;
    const inStock = reward.stock > 0;

    return `
      <div class="reward-card">
        <div class="reward-img-wrapper">
          <img src="${reward.image}" alt="${reward.title}" class="reward-img" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'">
          ${reward.badge ? `<span class="reward-badge-overlay">${reward.badge}</span>` : ''}
        </div>

        <div class="reward-body">
          <span class="reward-cat-tag">${reward.category}</span>
          <h3 class="reward-title">${escapeHTML(reward.title)}</h3>
          <p class="reward-desc">${escapeHTML(reward.description)}</p>
        </div>

        <div class="reward-footer">
          <div class="reward-price-row">
            <div class="reward-price"><i class="fa-solid fa-coins text-gold"></i> ${reward.coins.toLocaleString()}</div>
            <span class="stock-indicator">${inStock ? `${reward.stock} in stock` : 'Out of Stock'}</span>
          </div>

          ${!inStock ? `
            <button class="btn-claim-reward disabled" disabled>Out of Stock</button>
          ` : canAfford ? `
            <button class="btn-claim-reward" onclick="openClaimModal('${reward.id}')">
              <i class="fa-solid fa-gift"></i> Redeem Item
            </button>
          ` : `
            <button class="btn-claim-reward disabled" disabled>
              Need ${(reward.coins - state.user.coins).toLocaleString()} More Coins
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function renderClaims() {
  const container = document.getElementById('claimsList');

  if (!state.claims || state.claims.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5" style="background: var(--bg-card); padding: 40px; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <i class="fa-solid fa-box-open text-muted" style="font-size: 3rem; margin-bottom: 12px;"></i>
        <h3>No rewards claimed yet</h3>
        <p class="text-muted">Complete tasks to earn coins and claim books, t-shirts & audio gear!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.claims.map(claim => {
    let statusClass = 'status-processing';
    let icon = 'fa-truck-fast';
    if (claim.status === 'Delivered') { statusClass = 'status-delivered'; icon = 'fa-check-circle'; }
    else if (claim.status === 'Shipped') { statusClass = 'status-shipped'; icon = 'fa-box'; }

    return `
      <div class="claim-item-card">
        <div class="claim-item-info">
          <img src="${claim.image || 'assets/reward_books.png'}" alt="Item" class="claim-item-img" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'">
          <div class="claim-item-details">
            <h4>${escapeHTML(claim.rewardTitle)}</h4>
            <p><i class="fa-solid fa-coins text-gold"></i> Worth: <strong>${claim.coinsSpent || claim.itemWorth} Coins</strong> | Claimed: ${new Date(claim.claimedAt).toLocaleDateString()}</p>
            <p><i class="fa-solid fa-location-dot"></i> Deliver To: <strong>${escapeHTML(claim.studentName || state.user.name)}</strong> (${escapeHTML(claim.address || 'Campus Dorm')})</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
          <span class="claim-status-badge ${statusClass}"><i class="fa-solid ${icon}"></i> ${claim.status}</span>
          <div class="claim-code-box" title="Tracking Voucher Code">${claim.code}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderProfile() {
  document.getElementById('profileNameDisplay').textContent = state.user.name;
  document.getElementById('profileMajorDisplay').textContent = state.user.major;
  document.getElementById('profileIdDisplay').textContent = state.user.studentId;
  document.getElementById('profileLevelOverlay').textContent = `Lv. ${state.user.level}`;

  document.getElementById('pCoins').textContent = state.user.coins.toLocaleString();
  document.getElementById('pStreak').textContent = state.user.streak || 0;
  document.getElementById('pBadgesCount').textContent = (state.user.badges || []).length;

  document.getElementById('editName').value = state.user.name;
  document.getElementById('editMajor').value = state.user.major;
  document.getElementById('editAddress').value = state.user.address || 'Dorm Block B, Room 402';
  document.getElementById('editPhone').value = state.user.phone || '+1 (555) 234-5678';

  const badgesContainer = document.getElementById('badgesGrid');
  const allBadges = [
    { title: 'First Quest Completed', icon: 'fa-graduation-cap' },
    { title: 'Study Streak 5x', icon: 'fa-fire' },
    { title: 'Tech Pioneer', icon: 'fa-laptop-code' },
    { title: 'Book Worm', icon: 'fa-book-open' },
    { title: 'Centurion Scholar', icon: 'fa-crown' },
    { title: 'Reward Collector', icon: 'fa-gift' }
  ];

  badgesContainer.innerHTML = allBadges.map(b => {
    const isUnlocked = (state.user.badges || []).includes(b.title);
    return `
      <div class="badge-card" style="${isUnlocked ? '' : 'opacity: 0.45; filter: grayscale(1);'}">
        <div class="badge-icon"><i class="fa-solid ${b.icon}"></i></div>
        <div class="badge-title">${b.title}</div>
      </div>
    `;
  }).join('');
}

// --- ADMIN DASHBOARD --- //
function renderAdminDashboard() {
  renderAdminClaims();
  renderAdminSubmissions();
}

function renderAdminSubmissions() {
  const tableBody = document.getElementById('adminSubmissionsTableBody');

  if (!state.submissions || state.submissions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No student task submissions recorded yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.submissions.map(s => {
    let proofPreview = escapeHTML(s.proof);
    if (s.proof && s.proof.startsWith('data:image')) {
      proofPreview = `<img src="${s.proof}" style="max-height: 60px; border-radius: var(--radius-sm);" alt="Proof Image">`;
    }

    return `
      <tr>
        <td><strong>${escapeHTML(s.studentName)}</strong></td>
        <td>${escapeHTML(s.taskTitle)}</td>
        <td><span class="category-tag cat-academic">${s.type}</span></td>
        <td><span class="text-gold" style="font-weight: 800;">🪙 ${s.coinsEarned}</span></td>
        <td>${proofPreview}</td>
        <td><small class="text-muted">${new Date(s.submittedAt).toLocaleString()}</small></td>
      </tr>
    `;
  }).join('');
}

function renderAdminClaims() {
  const tableBody = document.getElementById('adminClaimsTableBody');
  if (!state.claims || state.claims.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No student orders found</td></tr>`;
    return;
  }

  tableBody.innerHTML = state.claims.map(c => `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${escapeHTML(c.studentName)}</td>
      <td>${escapeHTML(c.rewardTitle)}</td>
      <td><span class="text-gold" style="font-weight: 800;">🪙 ${c.coinsSpent || c.itemWorth}</span></td>
      <td>${escapeHTML(c.address)} <br><small class="text-muted">${escapeHTML(c.phone || '')}</small></td>
      <td>
        <select onchange="updateClaimStatus('${c.id}', this.value)" class="filter-select" style="padding: 4px 10px; font-size: 0.8rem;">
          <option value="Processing" ${c.status === 'Processing' ? 'selected' : ''}>⏳ Processing</option>
          <option value="Shipped" ${c.status === 'Shipped' ? 'selected' : ''}>📦 Shipped</option>
          <option value="Delivered" ${c.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
        </select>
      </td>
    </tr>
  `).join('');
}

// --- INTERACTIVE TASK MODAL HANDLERS --- //
function openInteractiveTaskModal(type, taskId = null) {
  state.activeInteractiveTaskId = taskId || (type === 'quiz' ? 'task-quiz-1' : type === 'photo' ? 'task-photo-1' : type === 'paragraph' ? 'task-para-1' : 'task-draw-1');

  if (type === 'quiz') openModal('quizTaskModal');
  else if (type === 'photo') openModal('photoTaskModal');
  else if (type === 'paragraph') openModal('paragraphTaskModal');
  else if (type === 'drawing') {
    openModal('drawingTaskModal');
    setTimeout(clearDrawingCanvas, 100);
  }
}

// Math Quiz Submission
document.getElementById('mathQuizForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q1 = document.querySelector('input[name="q1"]:checked')?.value;
  const q2 = document.querySelector('input[name="q2"]:checked')?.value;
  const q3 = document.querySelector('input[name="q3"]:checked')?.value;
  const q4 = document.querySelector('input[name="q4"]:checked')?.value;
  const q5 = document.querySelector('input[name="q5"]:checked')?.value;

  if (!q1 || !q2 || !q3 || !q4 || !q5) {
    showToast('Please answer all 5 quiz questions!', 'info');
    return;
  }

  let score = 0;
  if (q1 === '155') score += 20;
  if (q2 === '150') score += 20;
  if (q3 === '11') score += 20;
  if (q4 === '90') score += 20;
  if (q5 === '42') score += 20;

  const proofContent = `Passed Math & Science Quiz with score ${score}% (Q1:${q1}, Q2:${q2}, Q3:${q3}, Q4:${q4}, Q5:${q5})`;
  await submitTaskProof(state.activeInteractiveTaskId || 'task-quiz-1', 'quiz', proofContent, 200);

  closeModal('quizTaskModal');
  e.target.reset();
});

// Photo Upload Handler & Preview
function handlePhotoUploadPreview(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    state.photoPreviewData = event.target.result;
    document.getElementById('photoPreviewImg').src = state.photoPreviewData;
    document.getElementById('photoPreviewBox').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

document.getElementById('photoTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const notes = document.getElementById('photoNotesInput').value;
  const proofContent = state.photoPreviewData || `Uploaded Desk Photo: ${notes}`;

  await submitTaskProof(state.activeInteractiveTaskId || 'task-photo-1', 'photo', proofContent, 250);
  closeModal('photoTaskModal');
});

// Paragraph Essay Handler
function updateWordCountMeter() {
  const text = document.getElementById('paragraphTextarea').value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById('wordCountMeter').textContent = `Word Count: ${words} / 100`;
}

document.getElementById('paragraphTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('paragraphTextarea').value.trim();
  const words = text ? text.split(/\s+/).length : 0;

  if (words < 20) {
    showToast('Please write a slightly longer paragraph (at least 20 words)!', 'info');
    return;
  }

  await submitTaskProof(state.activeInteractiveTaskId || 'task-para-1', 'paragraph', text, 180);
  closeModal('paragraphTaskModal');
  e.target.reset();
});

// Canvas Drawing Handler
function initDrawingCanvas() {
  const canvas = document.getElementById('drawingCanvas');
  if (!canvas) return;
  canvasCtx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', (e) => { startDrawing(e.touches[0]); e.preventDefault(); });
  canvas.addEventListener('touchmove', (e) => { draw(e.touches[0]); e.preventDefault(); });
  canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
  isDrawing = true;
  const rect = document.getElementById('drawingCanvas').getBoundingClientRect();
  canvasCtx.beginPath();
  canvasCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = document.getElementById('drawingCanvas').getBoundingClientRect();
  const color = document.getElementById('drawColorPicker').value || '#6366f1';
  canvasCtx.strokeStyle = color;
  canvasCtx.lineWidth = 3;
  canvasCtx.lineCap = 'round';
  canvasCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  canvasCtx.stroke();
}

function stopDrawing() { isDrawing = false; }

function clearDrawingCanvas() {
  const canvas = document.getElementById('drawingCanvas');
  if (canvasCtx && canvas) {
    canvasCtx.fillStyle = '#1e293b';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

document.getElementById('drawingTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const canvas = document.getElementById('drawingCanvas');
  const drawingDataUrl = canvas ? canvas.toDataURL() : 'Science Diagram Sketch';

  await submitTaskProof(state.activeInteractiveTaskId || 'task-draw-1', 'drawing', drawingDataUrl, 220);
  closeModal('drawingTaskModal');
});

// Generic Task Submit Function
async function submitTaskProof(taskId, proofType, proofContent, defaultCoins) {
  let task = state.tasks.find(t => t.id === taskId);
  if (!task) {
    task = { id: taskId, title: 'Interactive Quest Task', type: proofType, coins: defaultCoins };
  }

  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofType, proofContent, studentName: state.user.name })
    });

    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      task.completed = true;
      if (data.submission) state.submissions.unshift(data.submission);
      triggerCelebration(data.earnedCoins, data.leveledUp);
    } else {
      submitTaskFallback(task, proofType, proofContent, defaultCoins);
    }
  } catch (err) {
    submitTaskFallback(task, proofType, proofContent, defaultCoins);
  }

  saveLocalState();
  renderAll();
}

function submitTaskFallback(task, proofType, proofContent, defaultCoins) {
  task.completed = true;
  const coins = task.coins || defaultCoins;

  state.user.coins += coins;
  state.user.totalCoinsEarned += coins;
  state.user.xp += Math.round(coins * 1.2);

  const sub = {
    id: 'sub-' + Date.now(),
    taskId: task.id,
    taskTitle: task.title,
    studentName: state.user.name,
    type: proofType,
    proof: proofContent,
    coinsEarned: coins,
    submittedAt: new Date().toISOString()
  };
  state.submissions.unshift(sub);
  triggerCelebration(coins, false);
}

async function completeStandardTask(taskId) {
  await submitTaskProof(taskId, 'standard', 'Standard completion confirmed.', 100);
}

// Admin Task & Reward Forms
document.getElementById('adminAddTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('adminTaskTitle').value;
  const category = document.getElementById('adminTaskCategory').value;
  const type = document.getElementById('adminTaskType').value;
  const difficulty = document.getElementById('adminTaskDifficulty').value;
  const coins = parseInt(document.getElementById('adminTaskCoins').value) || 150;
  const description = document.getElementById('adminTaskDesc').value;

  const taskObj = { title, category, type, difficulty, coins, dueDate: 'Today', description };

  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskObj)
    });
    if (res.ok) {
      const data = await res.json();
      state.tasks.unshift(data.task);
    } else {
      taskObj.id = 'task-' + Date.now();
      taskObj.completed = false;
      state.tasks.unshift(taskObj);
    }
  } catch (err) {
    taskObj.id = 'task-' + Date.now();
    taskObj.completed = false;
    state.tasks.unshift(taskObj);
  }

  saveLocalState();
  renderAll();
  e.target.reset();
  showToast(`Admin Created Task: "${title}" (+${coins} Coins)`, 'gold');
});

document.getElementById('adminAddRewardForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('adminRewardTitle').value;
  const category = document.getElementById('adminRewardCategory').value;
  const coins = parseInt(document.getElementById('adminRewardCoins').value) || 1000;
  const stock = parseInt(document.getElementById('adminRewardStock').value) || 10;
  const badge = document.getElementById('adminRewardBadge').value || 'NEW';
  const image = document.getElementById('adminRewardImage').value || 'assets/reward_backpack.png';
  const description = document.getElementById('adminRewardDesc').value;

  const rewardObj = { title, category, coins, stock, badge, image, description, deliveryType: 'Physical Delivery' };

  try {
    const res = await fetch(`${API_BASE}/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rewardObj)
    });
    if (res.ok) {
      const data = await res.json();
      state.rewards.unshift(data.reward);
    } else {
      rewardObj.id = 'rew-' + Date.now();
      state.rewards.unshift(rewardObj);
    }
  } catch (err) {
    rewardObj.id = 'rew-' + Date.now();
    state.rewards.unshift(rewardObj);
  }

  saveLocalState();
  renderAll();
  e.target.reset();
  showToast(`Admin Published Item: "${title}" (🪙 ${coins} Coins)`, 'gold');
});

async function updateClaimStatus(claimId, newStatus) {
  try {
    await fetch(`${API_BASE}/claims/${claimId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (e) {}

  const claim = state.claims.find(c => c.id === claimId);
  if (claim) claim.status = newStatus;

  saveLocalState();
  renderAll();
  showToast(`Order status updated to "${newStatus}"`, 'info');
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try { await fetch(`${API_BASE}/tasks/${taskId}`, { method: 'DELETE' }); } catch (e) {}
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  saveLocalState();
  renderAll();
  showToast('Task deleted', 'info');
}

document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('newTaskTitle').value;
  const category = document.getElementById('newTaskCategory').value;
  const type = document.getElementById('newTaskType').value;
  const coins = parseInt(document.getElementById('newTaskCoins').value) || 100;
  const dueDate = document.getElementById('newTaskDueDate').value || 'Today';
  const description = document.getElementById('newTaskDesc').value;

  const taskObj = { id: 'task-' + Date.now(), title, category, type, coins, difficulty: 'Medium', dueDate, description, completed: false };
  state.tasks.unshift(taskObj);
  saveLocalState();
  renderAll();
  closeModal('addTaskModal');
  e.target.reset();
  showToast(`Created quest "${title}"`, 'gold');
});

function openClaimModal(rewardId) {
  const reward = state.rewards.find(r => r.id === rewardId);
  if (!reward) return;

  document.getElementById('checkoutPreview').innerHTML = `
    <img src="${reward.image}" alt="Reward" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'">
    <div>
      <h4 style="font-size: 1.05rem; font-weight: 700;">${escapeHTML(reward.title)}</h4>
      <p style="font-size: 0.85rem; color: var(--text-muted);">${reward.category} • ${reward.deliveryType}</p>
      <p style="font-size: 1.1rem; font-weight: 800; color: var(--gold); margin-top: 4px;">Item Worth: 🪙 ${reward.coins.toLocaleString()} Coins</p>
    </div>
  `;

  document.getElementById('claimRewardId').value = reward.id;
  document.getElementById('claimStudentName').value = state.user.name;
  document.getElementById('claimAddress').value = state.user.address || 'Dorm Block B, Room 402, Campus Quad';
  document.getElementById('claimPhone').value = state.user.phone || '+1 (555) 234-5678';
  document.getElementById('claimEmail').value = state.user.email || 'alex.chen@university.edu';

  openModal('claimRewardModal');
}

document.getElementById('confirmClaimForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rewardId = document.getElementById('claimRewardId').value;
  const studentName = document.getElementById('claimStudentName').value;
  const phone = document.getElementById('claimPhone').value;
  const email = document.getElementById('claimEmail').value;
  const address = document.getElementById('claimAddress').value;
  const notes = document.getElementById('claimNotes').value;

  try {
    const res = await fetch(`${API_BASE}/rewards/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardId, studentName, phone, email, address, notes })
    });

    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      state.claims.unshift(data.claim);
      showToast(`🎁 Purchase Success! Tracking Code: ${data.claim.code}`, 'success');
    } else {
      redeemFallback(rewardId, studentName, phone, email, address, notes);
    }
  } catch (err) {
    redeemFallback(rewardId, studentName, phone, email, address, notes);
  }

  closeModal('claimRewardModal');
  saveLocalState();
  renderAll();
  switchTab('inventory');
});

function redeemFallback(rewardId, studentName, phone, email, address, notes) {
  const reward = state.rewards.find(r => r.id === rewardId);
  if (!reward || state.user.coins < reward.coins) return;

  state.user.coins -= reward.coins;
  reward.stock -= 1;

  const claimCode = `SHIP-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
  const claimObj = {
    id: 'CLM-' + Math.floor(10000 + Math.random() * 90000),
    rewardTitle: reward.title,
    coinsSpent: reward.coins,
    itemWorth: reward.coins,
    image: reward.image,
    status: 'Processing',
    claimedAt: new Date().toISOString(),
    code: claimCode,
    studentName: studentName || state.user.name,
    address: address || 'Campus Dorm',
    phone: phone || ''
  };

  state.claims.unshift(claimObj);
  showToast(`🎁 Purchase Success! Tracking Code: ${claimCode}`, 'success');
}

document.getElementById('editProfileForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.user.name = document.getElementById('editName').value;
  state.user.major = document.getElementById('editMajor').value;
  state.user.address = document.getElementById('editAddress').value;
  state.user.phone = document.getElementById('editPhone').value;

  saveLocalState();
  renderAll();
  showToast('Profile updated!', 'success');
});

// CELEBRATION
function triggerCelebration(earnedCoins, leveledUp) {
  playCoinChimeSound();
  if (typeof confetti === 'function') confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

  document.getElementById('earnedCoinsAmount').textContent = earnedCoins;
  document.getElementById('newBalanceAmount').textContent = state.user.coins.toLocaleString();

  const notice = document.getElementById('levelUpNotice');
  if (leveledUp) {
    document.getElementById('newLevelNoticeNum').textContent = state.user.level;
    notice.classList.remove('hidden');
  } else {
    notice.classList.add('hidden');
  }

  document.getElementById('celebrationModal').classList.add('active');
}

function playCoinChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine'; osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
    osc1.start(); osc2.start();
    osc1.stop(ctx.currentTime + 0.5); osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

function setupEventListeners() {
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });

  document.querySelectorAll('.shop-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.shop-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeRewardCategory = btn.getAttribute('data-cat');
      renderRewards();
    });
  });

  document.getElementById('taskSearchInput').addEventListener('input', renderTasks);
  document.getElementById('categoryFilter').addEventListener('change', renderTasks);
  document.getElementById('statusFilter').addEventListener('change', renderTasks);

  document.getElementById('openAddTaskModalBtn').addEventListener('click', () => openModal('addTaskModal'));
  document.getElementById('closeAddTaskModalBtn').addEventListener('click', () => closeModal('addTaskModal'));
  document.getElementById('cancelAddTaskBtn').addEventListener('click', () => closeModal('addTaskModal'));

  document.getElementById('closeClaimModalBtn').addEventListener('click', () => closeModal('claimRewardModal'));
  document.getElementById('cancelClaimBtn').addEventListener('click', () => closeModal('claimRewardModal'));
  document.getElementById('closeCelebrationBtn').addEventListener('click', () => closeModal('celebrationModal'));
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `${tabId}-panel`));
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = type === 'success' ? 'fa-check-circle' : type === 'gold' ? 'fa-coins text-gold' : 'fa-info-circle';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getCategoryClass(c) {
  if (c === 'Academic') return 'cat-academic';
  if (c === 'Fitness') return 'cat-fitness';
  if (c === 'Coding') return 'cat-coding';
  return 'cat-general';
}

function getDifficultyClass(d) {
  if (d === 'Easy') return 'diff-easy';
  if (d === 'Hard') return 'diff-hard';
  if (d === 'Epic') return 'diff-epic';
  return 'diff-medium';
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}