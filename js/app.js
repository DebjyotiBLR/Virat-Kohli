// ── APP STATE ──────────────────────────────────────────────
let currentUser = null;
let currentPage = 'home';
let votedIdeas = JSON.parse(localStorage.getItem('votedIdeas') || '[]');

// ── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  buildMemberSelect();
  navigateTo('home');
  loadStats();

  document.getElementById('user-select').addEventListener('change', e => {
    const idx = parseInt(e.target.value);
    currentUser = idx >= 0 ? GROUP_CONFIG.members[idx] : null;
    updateUserDisplay();
  });
});

// ── NAVIGATION ─────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  const loaders = {
    home: loadHome,
    chat: loadChat,
    ideas: loadIdeas,
    links: loadLinks,
    members: loadMembers,
    announcements: loadAnnouncements
  };
  if (loaders[page]) loaders[page]();
}

function buildNav() {
  const ul = document.querySelector('.nav-links');
  const pages = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'announcements', label: 'Announcements', icon: '📣' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'ideas', label: 'Ideas', icon: '💡' },
    { id: 'links', label: 'Links', icon: '🔗' },
    { id: 'members', label: 'Members', icon: '👥' },
  ];
  ul.innerHTML = pages.map(p =>
    `<li><a href="#" data-page="${p.id}" onclick="navigateTo('${p.id}'); return false;">${p.icon} ${p.label}</a></li>`
  ).join('');
}

function buildMemberSelect() {
  const sel = document.getElementById('user-select');
  sel.innerHTML = `<option value="-1">👤 Select you</option>` +
    GROUP_CONFIG.members.map((m, i) =>
      `<option value="${i}">${m.avatar} ${m.name}</option>`
    ).join('');
}

function updateUserDisplay() {
  // refresh chat if open
  if (currentPage === 'chat') loadChat();
}

// ── HOME PAGE ──────────────────────────────────────────────
function loadHome() {
  loadRecentAnnouncements();
  loadRecentActivity();
}

function loadStats() {
  const refs = ['chat', 'ideas', 'links'];
  refs.forEach(ref => {
    db.ref(ref).once('value', snap => {
      const count = snap.numChildren();
      const el = document.getElementById('stat-' + ref);
      if (el) el.textContent = count;
    });
  });
}

function loadRecentAnnouncements() {
  const el = document.getElementById('home-announcements');
  if (!el) return;
  db.ref('announcements').orderByChild('ts').limitToLast(3).once('value', snap => {
    const items = [];
    snap.forEach(c => items.unshift(c.val()));
    if (!items.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📣</div><p>No announcements yet.</p></div>`;
      return;
    }
    el.innerHTML = items.map(a => `
      <div class="card announcement-card ${a.pinned ? 'pinned' : ''}" style="margin-bottom:0.75rem">
        <div class="flex-between">
          <span class="fw-600" style="font-size:0.95rem">${esc(a.title)}</span>
          ${a.pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
        </div>
        <p class="text-muted text-sm mt-1">${esc(a.body)}</p>
        <div class="feed-time mt-1">${a.author} · ${timeAgo(a.ts)}</div>
      </div>`).join('');
  });
}

function loadRecentActivity() {
  const el = document.getElementById('activity-feed');
  if (!el) return;
  const events = [];
  const done = () => {
    events.sort((a,b) => b.ts - a.ts);
    el.innerHTML = events.slice(0,8).map(e => `
      <div class="feed-item">
        <div class="feed-dot" style="background:${e.color}"></div>
        <div>
          <div class="feed-text">${e.text}</div>
          <div class="feed-time">${timeAgo(e.ts)}</div>
        </div>
      </div>`).join('') || `<p class="text-muted text-sm">No activity yet.</p>`;
  };

  let pending = 3;
  const finish = () => { pending--; if (!pending) done(); };

  db.ref('chat').limitToLast(5).once('value', snap => {
    snap.forEach(c => {
      const v = c.val();
      events.push({ ts: v.ts, color: 'var(--teal)', text: `<strong>${esc(v.author)}</strong> sent a message in chat` });
    });
    finish();
  });
  db.ref('ideas').limitToLast(5).once('value', snap => {
    snap.forEach(c => {
      const v = c.val();
      events.push({ ts: v.ts, color: 'var(--yellow)', text: `<strong>${esc(v.author)}</strong> posted idea: <em>${esc(v.title)}</em>` });
    });
    finish();
  });
  db.ref('links').limitToLast(5).once('value', snap => {
    snap.forEach(c => {
      const v = c.val();
      events.push({ ts: v.ts, color: 'var(--purple)', text: `<strong>${esc(v.author)}</strong> shared a link: <em>${esc(v.title)}</em>` });
    });
    finish();
  });
}

// ── CHAT ───────────────────────────────────────────────────
let chatListener = null;

function loadChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  if (chatListener) db.ref('chat').off('value', chatListener);

  container.innerHTML = '';
  chatListener = db.ref('chat').orderByChild('ts').on('value', snap => {
    container.innerHTML = '';
    snap.forEach(c => appendMessage(c.val()));
    container.scrollTop = container.scrollHeight;
  });
}

function appendMessage(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  const mine = currentUser && msg.author === currentUser.name;
  const member = GROUP_CONFIG.members.find(m => m.name === msg.author) || { avatar: '👤', color: '#ccc' };

  const div = document.createElement('div');
  div.className = `msg ${mine ? 'mine' : ''}`;
  div.innerHTML = `
    <div class="msg-avatar" style="background:${member.color}20">${member.avatar}</div>
    <div>
      ${!mine ? `<div style="font-size:0.75rem;color:var(--text3);margin-bottom:3px">${esc(msg.author)}</div>` : ''}
      <div class="msg-bubble">${esc(msg.text)}</div>
      <div class="msg-meta">${timeAgo(msg.ts)}</div>
    </div>`;
  container.appendChild(div);
}

function sendMessage() {
  if (!currentUser) { showToast('Pick your name first! 👆'); return; }
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  db.ref('chat').push({
    author: currentUser.name,
    text,
    ts: Date.now()
  });
  input.value = '';
  loadStats();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement?.id === 'chat-input') {
    sendMessage();
  }
});

// ── IDEAS ──────────────────────────────────────────────────
function loadIdeas() {
  const el = document.getElementById('ideas-list');
  if (!el) return;
  el.innerHTML = `<div class="text-muted text-sm">Loading...</div>`;

  db.ref('ideas').orderByChild('ts').on('value', snap => {
    const ideas = [];
    snap.forEach(c => ideas.unshift({ id: c.key, ...c.val() }));

    const filter = document.getElementById('idea-filter')?.value || 'all';
    const filtered = filter === 'all' ? ideas : ideas.filter(i => i.tag === filter);

    if (!filtered.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">💡</div><p>No ideas yet. Be the first!</p></div>`;
      return;
    }
    el.innerHTML = `<div class="card-grid">${filtered.map(idea => `
      <div class="card idea-card">
        <div class="flex-between" style="margin-bottom:8px">
          <span class="tag" style="background:${tagColor(idea.tag)}20;color:${tagColor(idea.tag)}">${esc(idea.tag || 'general')}</span>
          <span class="text-sm text-muted">${esc(idea.author)}</span>
        </div>
        <div class="fw-600" style="margin-bottom:6px">${esc(idea.title)}</div>
        <div class="text-muted text-sm">${esc(idea.desc)}</div>
        <div class="idea-votes">
          <button class="vote-btn ${votedIdeas.includes(idea.id) ? 'voted' : ''}" onclick="voteIdea('${idea.id}', ${idea.votes||0})">
            👍 ${idea.votes || 0}
          </button>
          <span class="text-sm text-muted">${timeAgo(idea.ts)}</span>
        </div>
      </div>`).join('')}</div>`;
  });
}

function voteIdea(id, currentVotes) {
  if (!currentUser) { showToast('Pick your name to vote! 👆'); return; }
  if (votedIdeas.includes(id)) { showToast('Already voted!'); return; }

  votedIdeas.push(id);
  localStorage.setItem('votedIdeas', JSON.stringify(votedIdeas));
  db.ref('ideas/' + id).update({ votes: currentVotes + 1 });
  showToast('Vote cast! 🙌');
}

function submitIdea() {
  if (!currentUser) { showToast('Pick your name first! 👆'); return; }
  const title = document.getElementById('idea-title').value.trim();
  const desc  = document.getElementById('idea-desc').value.trim();
  const tag   = document.getElementById('idea-tag').value;

  if (!title) { showToast('Give your idea a title!'); return; }

  db.ref('ideas').push({
    author: currentUser.name,
    title, desc, tag,
    votes: 0,
    ts: Date.now()
  });

  closeModal('modal-idea');
  loadStats();
  showToast('Idea posted! 💡');
}

// ── LINKS ──────────────────────────────────────────────────
function loadLinks() {
  const el = document.getElementById('links-list');
  if (!el) return;
  el.innerHTML = `<div class="text-muted text-sm">Loading...</div>`;

  db.ref('links').orderByChild('ts').on('value', snap => {
    const links = [];
    snap.forEach(c => links.unshift({ id: c.key, ...c.val() }));

    const cat = document.getElementById('link-cat-filter')?.value || 'all';
    const filtered = cat === 'all' ? links : links.filter(l => l.category === cat);

    if (!filtered.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">🔗</div><p>No links shared yet.</p></div>`;
      return;
    }
    el.innerHTML = `<div class="card-grid">${filtered.map(link => `
      <a class="card link-card" href="${esc(link.url)}" target="_blank" rel="noopener">
        <div class="flex-between" style="margin-bottom:8px">
          <span class="tag" style="background:var(--purple)20;color:#5a4099">${esc(link.category)}</span>
          <span class="text-sm text-muted">${esc(link.author)}</span>
        </div>
        <div class="fw-600" style="margin-bottom:5px">${esc(link.title)}</div>
        <div class="text-muted text-sm">${esc(link.desc || '')}</div>
        <div class="link-domain">🌐 ${getDomain(link.url)} · ${timeAgo(link.ts)}</div>
      </a>`).join('')}</div>`;
  });
}

function submitLink() {
  if (!currentUser) { showToast('Pick your name first! 👆'); return; }
  const url      = document.getElementById('link-url').value.trim();
  const title    = document.getElementById('link-title').value.trim();
  const desc     = document.getElementById('link-desc').value.trim();
  const category = document.getElementById('link-category').value;

  if (!url || !title) { showToast('URL and title are required!'); return; }

  db.ref('links').push({ author: currentUser.name, url, title, desc, category, ts: Date.now() });
  closeModal('modal-link');
  loadStats();
  showToast('Link shared! 🔗');
}

// ── MEMBERS ────────────────────────────────────────────────
function loadMembers() {
  const el = document.getElementById('members-list');
  if (!el) return;
  el.innerHTML = `<div class="card-grid">${GROUP_CONFIG.members.map(m => `
    <div class="card member-card">
      <div class="member-avatar" style="background:${m.color}30">${m.avatar}</div>
      <div class="member-name">${esc(m.name)}</div>
      <div class="member-role">${esc(m.role)}</div>
      <div class="member-bio">${esc(m.bio)}</div>
    </div>`).join('')}</div>`;
}

// ── ANNOUNCEMENTS ──────────────────────────────────────────
function loadAnnouncements() {
  const el = document.getElementById('announcements-list');
  if (!el) return;
  el.innerHTML = `<div class="text-muted text-sm">Loading...</div>`;

  db.ref('announcements').orderByChild('ts').on('value', snap => {
    const items = [];
    snap.forEach(c => items.unshift(c.val()));

    if (!items.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📣</div><p>No announcements yet.</p></div>`;
      return;
    }
    el.innerHTML = items.map(a => `
      <div class="card announcement-card ${a.pinned ? 'pinned' : ''}" style="margin-bottom:1rem">
        <div class="flex-between" style="margin-bottom:8px">
          <span class="fw-600">${esc(a.title)}</span>
          ${a.pinned ? '<span class="pin-badge">📌 Pinned</span>' : ''}
        </div>
        <p class="text-muted" style="font-size:0.92rem;line-height:1.6">${esc(a.body)}</p>
        <div class="feed-time mt-1">${esc(a.author)} · ${timeAgo(a.ts)}</div>
      </div>`).join('');
  });
}

function submitAnnouncement() {
  if (!currentUser) { showToast('Pick your name first! 👆'); return; }
  const title  = document.getElementById('ann-title').value.trim();
  const body   = document.getElementById('ann-body').value.trim();
  const pinned = document.getElementById('ann-pinned').checked;

  if (!title || !body) { showToast('Fill in title and message!'); return; }

  db.ref('announcements').push({
    author: currentUser.name, title, body, pinned, ts: Date.now()
  });
  closeModal('modal-ann');
  showToast('Announcement posted! 📣');
}

// ── MODALS ─────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// click outside to close
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
  }
});

// ── HELPERS ────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function tagColor(tag) {
  const map = {
    feature: '#4ECDC4', bug: '#FF6B6B', design: '#C7CEEA',
    research: '#FFB347', general: '#A8E6CF', other: '#A09080'
  };
  return map[tag] || '#A09080';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
