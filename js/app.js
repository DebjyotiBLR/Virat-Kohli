// ═══════════════════════════════════════════════════
//  ABDevillors — App Logic
// ═══════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────
let currentUser  = null;
let votedIdeas   = JSON.parse(localStorage.getItem('abd_voted') || '[]');
let currentPage  = 'home';
let chatListener = null;
let ideaListener = null;
let linkListener = null;
let annListener  = null;

// Rate limiting: max 3 messages per 10 seconds
const MSG_WINDOW = 10000, MSG_LIMIT = 3;
let msgTimestamps = [];

// ── BOOT ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore session from sessionStorage
  const saved = sessionStorage.getItem('abd_session');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      // Verify user still exists and isn't banned
      db.ref('banned/' + sanitizeKey(user.name)).once('value', snapBan => {
        if (snapBan.exists()) { sessionStorage.removeItem('abd_session'); showAuthScreen(); return; }
        db.ref('users/' + sanitizeKey(user.name)).once('value', snap => {
          if (!snap.exists()) { sessionStorage.removeItem('abd_session'); showAuthScreen(); return; }
          currentUser = snap.val();
          sessionStorage.setItem('abd_session', JSON.stringify(currentUser));
          showApp();
        });
      });
    } catch { showAuthScreen(); }
  } else {
    showAuthScreen();
  }
});

// ── AUTH SCREEN ────────────────────────────────────
function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display   = 'none';
}
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-shell').style.display   = 'block';
  document.title = GROUP_CONFIG.name;
  buildNav();
  updateNavUser();
  navigateTo('home');
  loadStats();
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f =>
    f.classList.toggle('active', f.id === 'form-' + tab));
  clearAuthMessages();
}
function clearAuthMessages() {
  document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
    el.classList.remove('show');
  });
}
function showAuthError(id, msg)   { const el = document.getElementById(id); if(el){el.textContent = msg; el.classList.add('show');} }
function showAuthSuccess(id, msg) { const el = document.getElementById(id); if(el){el.textContent = msg; el.classList.add('show');} }

// ── REGISTER ───────────────────────────────────────
function doRegister() {
  const name    = document.getElementById('reg-name').value.trim();
  const dob     = document.getElementById('reg-dob').value;
  const keyword = document.getElementById('reg-keyword').value.trim();
  const errEl   = 'reg-error';
  clearAuthMessages();

  if (!name || !dob || !keyword) { showAuthError(errEl, 'Please fill in all fields.'); return; }
  if (name.length < 2 || name.length > 24) { showAuthError(errEl, 'Name must be 2–24 characters.'); return; }
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) { showAuthError(errEl, 'Name can only contain letters, numbers, spaces, _ or -'); return; }

  // Verify keyword
  db.ref('settings/keyword').once('value', snap => {
    const activeKeyword = snap.val() || GROUP_CONFIG.secretKeyword;
    if (keyword !== activeKeyword) {
      showAuthError(errEl, '❌ Wrong keyword. Ask your lab admin.');
      return;
    }
    db.ref('users/' + sanitizeKey(name)).once('value', snap2 => {
      if (snap2.exists()) { showAuthError(errEl, '⚠️ Username taken. Try another.'); return; }
      db.ref('banned/' + sanitizeKey(name)).once('value', snap3 => {
        if (snap3.exists()) { showAuthError(errEl, '🚫 This account has been removed by admin.'); return; }

        const preset = GROUP_CONFIG.members.find(m => m.name.toLowerCase() === name.toLowerCase());
        const member = {
          name,
          dob,
          avatar: preset?.avatar || randomAvatar(),
          color:  preset?.color  || randomColor(),
          role:   name === GROUP_CONFIG.adminUser ? 'Admin' : (preset?.role || 'Member'),
          bio:    preset?.bio || '',
          joinedTs: Date.now()
        };
        db.ref('users/' + sanitizeKey(name)).set(member, err => {
          if (err) { showAuthError(errEl, 'Something went wrong. Please try again.'); return; }
          currentUser = member;
          sessionStorage.setItem('abd_session', JSON.stringify(currentUser));
          showApp();
        });
      });
    });
  });
}

// ── LOGIN ──────────────────────────────────────────
function doLogin() {
  const name  = document.getElementById('login-name').value.trim();
  const dob   = document.getElementById('login-dob').value;
  const errEl = 'login-error';
  clearAuthMessages();

  if (!name || !dob) { showAuthError(errEl, 'Please fill in all fields.'); return; }

  db.ref('banned/' + sanitizeKey(name)).once('value', snapBan => {
    if (snapBan.exists()) { showAuthError(errEl, '🚫 This account has been removed by admin.'); return; }
    db.ref('users/' + sanitizeKey(name)).once('value', snap => {
      if (!snap.exists()) { showAuthError(errEl, '⚠️ No account found. Register first!'); return; }
      const member = snap.val();
      if (member.dob !== dob) { showAuthError(errEl, '❌ Date of birth doesn\'t match.'); return; }
      currentUser = member;
      sessionStorage.setItem('abd_session', JSON.stringify(currentUser));
      showApp();
    });
  });
}

function doLogout() {
  if (!confirm('Log out of ABDevillors?')) return;
  currentUser = null;
  sessionStorage.removeItem('abd_session');
  // Detach all Firebase listeners
  if (chatListener) { db.ref('chat').off('value', chatListener); chatListener = null; }
  if (ideaListener) { db.ref('ideas').off('value', ideaListener); ideaListener = null; }
  if (linkListener) { db.ref('links').off('value', linkListener); linkListener = null; }
  if (annListener)  { db.ref('announcements').off('value', annListener); annListener = null; }
  showAuthScreen();
}

// ── NAVIGATION ─────────────────────────────────────
function navigateTo(page, closeDrawer = true) {
  if (closeDrawer) closeNav();
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll('.topnav-links a').forEach(a =>
    a.classList.toggle('active', a.dataset.page === page));
  document.querySelectorAll('.bnav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.drawer-nav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.page === page));

  const loaders = {
    home: loadHome, chat: loadChat, ideas: loadIdeas,
    links: loadLinks, members: loadMembers,
    announcements: loadAnnouncements, admin: loadAdmin
  };
  if (loaders[page]) loaders[page]();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildNav() {
  const pages = [
    { id: 'home',          label: 'Home',          icon: '🏠' },
    { id: 'announcements', label: 'Announce',       icon: '📣' },
    { id: 'chat',          label: 'Chat',           icon: '💬' },
    { id: 'ideas',         label: 'Ideas',          icon: '💡' },
    { id: 'links',         label: 'Links',          icon: '🔗' },
    { id: 'members',       label: 'Members',        icon: '👥' },
  ];
  if (currentUser?.role === 'Admin') pages.push({ id: 'admin', label: 'Admin', icon: '⚙️' });

  // Desktop top nav
  const ul = document.getElementById('nav-links-desktop');
  if (ul) ul.innerHTML = pages.map(p =>
    `<li><a href="#" data-page="${p.id}" onclick="navigateTo('${p.id}');return false;">
      <span class="nav-icon">${p.icon}</span>${p.label}
    </a></li>`
  ).join('');

  // Bottom nav (mobile) — 5 items max
  const bottomPages = [
    { id: 'home',  icon: '🏠', label: 'Home' },
    { id: 'chat',  icon: '💬', label: 'Chat' },
    { id: 'ideas', icon: '💡', label: 'Ideas' },
    { id: 'links', icon: '🔗', label: 'Links' },
    { id: 'members',icon:'👥', label: 'People' },
  ];
  const bn = document.getElementById('bottom-nav-items');
  if (bn) bn.innerHTML = bottomPages.map(p =>
    `<button class="bnav-item" data-page="${p.id}" onclick="navigateTo('${p.id}')">
      <span class="bnav-icon">${p.icon}</span>
      <span>${p.label}</span>
    </button>`
  ).join('');

  // Drawer nav
  const dn = document.getElementById('drawer-nav-items');
  if (dn) dn.innerHTML = pages.map(p =>
    `<button class="drawer-nav-item" data-page="${p.id}" onclick="navigateTo('${p.id}')">
      <span class="dnav-icon">${p.icon}</span>${p.label}
    </button>`
  ).join('');
}

function updateNavUser() {
  if (!currentUser) return;
  const chip = document.getElementById('nav-user-chip');
  if (chip) chip.innerHTML = `
    <div class="nav-avatar" style="background:${currentUser.color}30">${currentUser.avatar}</div>
    ${esc(currentUser.name)}`;

  const du = document.getElementById('drawer-user-info');
  if (du) du.innerHTML = `
    <div class="drawer-avatar" style="background:${currentUser.color}30;border:2px solid ${currentUser.color}40">${currentUser.avatar}</div>
    <div>
      <div class="drawer-username">${esc(currentUser.name)}</div>
      <div class="drawer-role">${currentUser.role === 'Admin' ? '⚙️ Admin' : '👤 Member'}</div>
    </div>`;
}

// ── DRAWER ─────────────────────────────────────────
function openNav() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeNav() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── HOME ────────────────────────────────────────────
function loadHome() {
  loadRecentAnnouncements();
  loadRecentActivity();
}
function loadStats() {
  ['chat','ideas','links'].forEach(ref => {
    db.ref(ref).once('value', snap => {
      const el = document.getElementById('stat-' + ref);
      if (el) el.textContent = snap.numChildren();
    });
  });
}
function loadRecentAnnouncements() {
  const el = document.getElementById('home-announcements');
  if (!el) return;
  db.ref('announcements').orderByChild('ts').limitToLast(3).once('value', snap => {
    const items = []; snap.forEach(c => items.unshift(c.val()));
    if (!items.length) {
      el.innerHTML = `<div class="empty" style="padding:24px 0"><div class="empty-icon">📣</div><p>No announcements yet.</p></div>`;
      return;
    }
    el.innerHTML = items.map(a => `
      <div class="card ann-card ${a.pinned?'pinned':''}" style="margin-bottom:10px">
        <div class="ann-title-row">
          <span class="ann-title">${esc(a.title)}</span>
          ${a.pinned?'<span class="pin-badge">📌 Pinned</span>':''}
        </div>
        <p class="ann-body">${esc(a.body)}</p>
        <div class="feed-time mt-1">${esc(a.author)} · ${timeAgo(a.ts)}</div>
      </div>`).join('');
  });
}
function loadRecentActivity() {
  const el = document.getElementById('activity-feed');
  if (!el) return;
  el.innerHTML = `<div class="empty" style="padding:16px 0"><p>Loading activity...</p></div>`;
  const events = []; let pending = 3;
  const finish = () => {
    if (--pending > 0) return;
    events.sort((a,b) => b.ts - a.ts);
    const top = events.slice(0, 10);
    if (!top.length) { el.innerHTML = `<div class="empty" style="padding:16px 0"><div class="empty-icon">🌱</div><p>No activity yet — kick things off!</p></div>`; return; }
    el.innerHTML = `<div class="feed-list">${top.map(e => `
      <div class="feed-item">
        <div class="feed-dot" style="background:${e.color}"></div>
        <div>
          <div class="feed-text">${e.text}</div>
          <div class="feed-time">${timeAgo(e.ts)}</div>
        </div>
      </div>`).join('')}</div>`;
  };
  db.ref('chat').limitToLast(5).once('value', snap => {
    snap.forEach(c => { const v=c.val(); events.push({ts:v.ts,color:'var(--teal)',text:`<strong>${esc(v.author)}</strong> sent a chat message`}); });
    finish();
  });
  db.ref('ideas').limitToLast(5).once('value', snap => {
    snap.forEach(c => { const v=c.val(); events.push({ts:v.ts,color:'var(--yellow)',text:`<strong>${esc(v.author)}</strong> posted idea: <em>${esc(v.title)}</em>`}); });
    finish();
  });
  db.ref('links').limitToLast(5).once('value', snap => {
    snap.forEach(c => { const v=c.val(); events.push({ts:v.ts,color:'var(--purple)',text:`<strong>${esc(v.author)}</strong> shared: <em>${esc(v.title)}</em>`}); });
    finish();
  });
}

// ── CHAT ────────────────────────────────────────────
function loadChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  if (chatListener) db.ref('chat').off('value', chatListener);
  container.innerHTML = '';
  chatListener = db.ref('chat').orderByChild('ts').limitToLast(120).on('value', snap => {
    container.innerHTML = '';
    snap.forEach(c => renderMessage(c.val(), container));
    container.scrollTop = container.scrollHeight;
  });
}

function renderMessage(msg, container) {
  const mine   = currentUser && msg.author === currentUser.name;
  const member = getMember(msg.author);
  const div    = document.createElement('div');
  div.className = `msg${mine?' mine':''}`;
  div.innerHTML = `
    <div class="msg-avatar" style="background:${member.color}25">${member.avatar}</div>
    <div>
      ${!mine ? `<div class="msg-name">${esc(msg.author)}</div>` : ''}
      <div class="msg-bubble">${esc(msg.text)}</div>
      <div class="msg-time">${timeAgo(msg.ts)}</div>
    </div>`;
  container.appendChild(div);
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Basic client-side rate limit
  const now = Date.now();
  msgTimestamps = msgTimestamps.filter(t => now - t < MSG_WINDOW);
  if (msgTimestamps.length >= MSG_LIMIT) {
    showToast('Slow down! Too many messages. 🐢');
    return;
  }
  msgTimestamps.push(now);

  if (text.length > 500) { showToast('Message too long (max 500 chars)'); return; }

  db.ref('chat').push({ author: currentUser.name, text, ts: Date.now() });
  input.value = '';
  loadStats();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.id === 'chat-input') {
    e.preventDefault();
    sendMessage();
  }
});

// ── IDEAS ────────────────────────────────────────────
let ideaFilter = 'all';
function loadIdeas() {
  const el = document.getElementById('ideas-list');
  if (!el) return;
  if (ideaListener) db.ref('ideas').off('value', ideaListener);
  ideaListener = db.ref('ideas').orderByChild('ts').on('value', snap => {
    const ideas = []; snap.forEach(c => ideas.unshift({ id: c.key, ...c.val() }));
    renderIdeas(ideas);
  });
}
function renderIdeas(ideas) {
  const el = document.getElementById('ideas-list');
  if (!el) return;
  const filtered = ideaFilter === 'all' ? ideas : ideas.filter(i => i.tag === ideaFilter);
  if (!filtered.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">💡</div><p>No ideas ${ideaFilter!=='all'?'for this tag ':''} yet. Be the first!</p></div>`;
    return;
  }
  el.innerHTML = `<div class="card-grid">${filtered.map(idea => `
    <div class="card idea-card card-hover">
      <div class="flex-between">
        <span class="tag-chip" style="background:${tagColor(idea.tag)}22;color:${tagColor(idea.tag)}">${esc(idea.tag||'general')}</span>
        <span class="text-xs text-muted">${esc(idea.author)}</span>
      </div>
      <div class="idea-title">${esc(idea.title)}</div>
      <div class="idea-desc">${esc(idea.desc)}</div>
      <div class="idea-footer">
        <button class="vote-btn ${votedIdeas.includes(idea.id)?'voted':''}" onclick="voteIdea('${idea.id}',${idea.votes||0})">
          👍 ${idea.votes||0}
        </button>
        <span class="text-xs text-muted">${timeAgo(idea.ts)}</span>
      </div>
    </div>`).join('')}</div>`;
}
function setIdeaFilter(tag, btn) {
  ideaFilter = tag;
  document.querySelectorAll('.idea-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
function voteIdea(id, cur) {
  if (votedIdeas.includes(id)) { showToast('You already voted on this 👍'); return; }
  votedIdeas.push(id);
  localStorage.setItem('abd_voted', JSON.stringify(votedIdeas));
  db.ref('ideas/' + id).update({ votes: cur + 1 });
  showToast('Vote cast! 🙌');
}
function submitIdea() {
  const title = document.getElementById('idea-title').value.trim();
  const desc  = document.getElementById('idea-desc').value.trim();
  const tag   = document.getElementById('idea-tag').value;
  if (!title) { showToast('Give your idea a title!'); return; }
  if (title.length > 120) { showToast('Title too long (max 120 chars)'); return; }
  db.ref('ideas').push({ author: currentUser.name, title, desc, tag, votes: 0, ts: Date.now() });
  closeModal('modal-idea'); loadStats(); showToast('Idea posted! 💡');
  document.getElementById('idea-title').value = '';
  document.getElementById('idea-desc').value  = '';
}

// ── LINKS ────────────────────────────────────────────
let linkFilter = 'all';
function loadLinks() {
  const el = document.getElementById('links-list');
  if (!el) return;
  if (linkListener) db.ref('links').off('value', linkListener);
  linkListener = db.ref('links').orderByChild('ts').on('value', snap => {
    const links = []; snap.forEach(c => links.unshift({ id: c.key, ...c.val() }));
    renderLinks(links);
  });
}
function renderLinks(links) {
  const el = document.getElementById('links-list');
  if (!el) return;
  const filtered = linkFilter === 'all' ? links : links.filter(l => l.category === linkFilter);
  if (!filtered.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">🔗</div><p>No links yet. Share something!</p></div>`;
    return;
  }
  el.innerHTML = `<div class="card-grid">${filtered.map(link => `
    <a class="card link-card card-hover" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
      <div class="flex-between">
        <span class="tag-chip" style="background:var(--purple)18;color:var(--purple)">${esc(link.category)}</span>
        <span class="text-xs text-muted">${esc(link.author)}</span>
      </div>
      <div class="link-title">${esc(link.title)}</div>
      <div class="link-desc">${esc(link.desc||'')}</div>
      <div class="link-domain">
        🌐 ${getDomain(link.url)} · ${timeAgo(link.ts)}
        <span class="link-external">↗</span>
      </div>
    </a>`).join('')}</div>`;
}
function setLinkFilter(cat, btn) {
  linkFilter = cat;
  document.querySelectorAll('.link-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
function submitLink() {
  const url      = document.getElementById('link-url').value.trim();
  const title    = document.getElementById('link-title').value.trim();
  const desc     = document.getElementById('link-desc').value.trim();
  const category = document.getElementById('link-category').value;
  if (!url || !title) { showToast('URL and title are required!'); return; }
  try { new URL(url); } catch { showToast('Please enter a valid URL (include https://)'); return; }
  if (title.length > 120) { showToast('Title too long (max 120 chars)'); return; }
  db.ref('links').push({ author: currentUser.name, url, title, desc, category, ts: Date.now() });
  closeModal('modal-link'); loadStats(); showToast('Link shared! 🔗');
  document.getElementById('link-url').value = document.getElementById('link-title').value = document.getElementById('link-desc').value = '';
}

// ── MEMBERS ──────────────────────────────────────────
function loadMembers() {
  const el = document.getElementById('members-list');
  if (!el) return;
  el.innerHTML = `<div class="empty"><p>Loading...</p></div>`;
  db.ref('users').once('value', snap => {
    const members = []; snap.forEach(c => members.push(c.val()));
    if (!members.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">👥</div><p>No members yet.</p></div>`; return; }
    el.innerHTML = `<div class="card-grid">${members.map(m => `
      <div class="card member-card">
        <div class="member-avatar-wrap" style="background:${m.color||'#eee'}20;border-color:${m.color||'#eee'}40">
          ${m.avatar||'👤'}
        </div>
        <div class="member-name">
          ${esc(m.name)}
          ${m.role==='Admin'?'<span class="admin-badge">⚙ Admin</span>':''}
        </div>
        <div class="member-role">${esc(m.role||'Member')}</div>
        ${m.bio ? `<div class="member-bio">${esc(m.bio)}</div>` : ''}
        <div class="text-xs text-muted mt-1">Joined ${timeAgo(m.joinedTs)}</div>
      </div>`).join('')}</div>`;
  });
}

// ── ANNOUNCEMENTS ─────────────────────────────────────
function loadAnnouncements() {
  const el = document.getElementById('announcements-list');
  if (!el) return;
  if (annListener) db.ref('announcements').off('value', annListener);
  annListener = db.ref('announcements').orderByChild('ts').on('value', snap => {
    const items = []; snap.forEach(c => items.unshift({ id: c.key, ...c.val() }));
    // Sort: pinned first
    items.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0) || b.ts - a.ts);
    const canPost   = currentUser?.role === 'Admin';
    const canDelete = canPost;
    if (!items.length) {
      el.innerHTML = `<div class="empty"><div class="empty-icon">📣</div><p>No announcements yet.</p></div>`;
      return;
    }
    el.innerHTML = items.map(a => `
      <div class="card ann-card ${a.pinned?'pinned':''}" style="margin-bottom:12px">
        <div class="ann-title-row">
          <span class="ann-title">${esc(a.title)}</span>
          <div class="flex gap-8">
            ${a.pinned?'<span class="pin-badge">📌 Pinned</span>':''}
            ${canDelete?`<button class="btn btn-danger btn-sm" onclick="deleteAnn('${a.id}')">Delete</button>`:''}
          </div>
        </div>
        <p class="ann-body">${esc(a.body)}</p>
        <div class="feed-time mt-1">${esc(a.author)} · ${timeAgo(a.ts)}</div>
      </div>`).join('');
  });
}
function deleteAnn(id) {
  if (currentUser?.role !== 'Admin') return;
  if (!confirm('Delete this announcement?')) return;
  db.ref('announcements/' + id).remove();
  showToast('Announcement deleted');
}
function submitAnnouncement() {
  if (currentUser?.role !== 'Admin') { showToast('Only admins can post announcements'); return; }
  const title  = document.getElementById('ann-title').value.trim();
  const body   = document.getElementById('ann-body').value.trim();
  const pinned = document.getElementById('ann-pinned').checked;
  if (!title || !body) { showToast('Fill in both title and message!'); return; }
  if (title.length > 120) { showToast('Title too long'); return; }
  db.ref('announcements').push({ author: currentUser.name, title, body, pinned, ts: Date.now() });
  closeModal('modal-ann'); showToast('Posted! 📣');
  document.getElementById('ann-title').value = document.getElementById('ann-body').value = '';
  document.getElementById('ann-pinned').checked = false;
}

// ── ADMIN PANEL ───────────────────────────────────────
function loadAdmin() {
  if (currentUser?.role !== 'Admin') { navigateTo('home'); return; }
  loadAdminStats();
  loadAdminMembers();
  db.ref('settings/keyword').once('value', snap => {
    const el = document.getElementById('admin-keyword-display');
    if (el) el.textContent = snap.val() || GROUP_CONFIG.secretKeyword;
  });
}
function loadAdminStats() {
  ['chat','ideas','links'].forEach(ref => {
    db.ref(ref).once('value', snap => {
      const el = document.getElementById('admin-stat-' + ref);
      if (el) el.textContent = snap.numChildren();
    });
  });
  db.ref('users').once('value', snap => {
    const el = document.getElementById('admin-stat-users');
    if (el) el.textContent = snap.numChildren();
  });
}
function loadAdminMembers() {
  const el = document.getElementById('admin-members-list');
  if (!el) return;
  db.ref('users').once('value', snap => {
    const members = []; snap.forEach(c => members.push({ key: c.key, ...c.val() }));
    el.innerHTML = members.map(m => `
      <div class="admin-member-row">
        <div class="admin-member-info">
          <div style="width:38px;height:38px;border-radius:50%;background:${m.color||'#eee'}25;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${m.avatar||'👤'}</div>
          <div>
            <div class="fw-600" style="font-size:0.88rem">${esc(m.name)} ${m.role==='Admin'?'<span class="admin-badge">Admin</span>':''}</div>
            <div class="text-xs text-muted">Joined ${timeAgo(m.joinedTs)}</div>
          </div>
        </div>
        ${m.name !== currentUser.name
          ? `<button class="btn btn-danger btn-sm" onclick="removeMember('${m.key}','${esc(m.name)}')">Remove</button>`
          : '<span class="text-xs text-muted">You</span>'}
      </div>`).join('') || '<p class="text-muted text-sm">No members found.</p>';
  });
}
function removeMember(key, name) {
  if (currentUser?.role !== 'Admin') return;
  if (!confirm(`Remove ${name}? They will be banned and cannot log back in.`)) return;
  db.ref('users/' + key).remove();
  db.ref('banned/' + key).set({ name, bannedAt: Date.now(), by: currentUser.name });
  showToast(`${name} removed`);
  loadAdminMembers();
  loadAdminStats();
}
function saveNewKeyword() {
  if (currentUser?.role !== 'Admin') return;
  const kw = document.getElementById('admin-new-keyword').value.trim();
  if (!kw || kw.length < 4) { showToast('Keyword must be at least 4 characters'); return; }
  db.ref('settings/keyword').set(kw);
  document.getElementById('admin-keyword-display').textContent = kw;
  document.getElementById('admin-new-keyword').value = '';
  closeModal('modal-keyword');
  showToast('Secret keyword updated ✅');
}
function clearChat() {
  if (currentUser?.role !== 'Admin') return;
  if (!confirm('Delete ALL chat messages? This cannot be undone.')) return;
  db.ref('chat').remove();
  showToast('Chat cleared');
  loadAdminStats();
}

// ── MODALS ──────────────────────────────────────────
function openModal(id)  {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});
// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ── HELPERS ─────────────────────────────────────────
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function timeAgo(ts) {
  if (!ts) return '';
  const m = Math.floor((Date.now()-ts)/60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m/60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h/24) + 'd ago';
}
function getDomain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch { return url; }
}
function sanitizeKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g,'_');
}
function tagColor(tag) {
  const map = {feature:'#38c3d1',bug:'#ff5c6b',design:'#a78bfa',research:'#ffd166',general:'#06d6a0',other:'#8b90a8'};
  return map[tag] || '#8b90a8';
}
function getMember(name) {
  // Try preset config first
  const preset = GROUP_CONFIG.members.find(m => m.name === name);
  if (preset) return preset;
  // Fallback
  return { avatar: '👤', color: '#8b90a8' };
}
function randomAvatar() {
  const pool = ['🐱','🐶','🦊','🐻','🐼','🐨','🦁','🦋','🌸','🌟','🎭','🦄','🐙','🦉','🐲'];
  return pool[Math.floor(Math.random()*pool.length)];
}
function randomColor() {
  const pool = ['#FF6B6B','#4ECDC4','#FFE66D','#A8E6CF','#C7CEEA','#FFB347','#FF8CC6','#A78BFA'];
  return pool[Math.floor(Math.random()*pool.length)];
}
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}
