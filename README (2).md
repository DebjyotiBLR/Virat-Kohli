# 🔬 ABDevillors — Group Collaboration Hub

A private, secure group website for lab members to chat, share ideas, post links, and collaborate — with login protection, admin controls, and a fully responsive design that works on mobile, tablet, and desktop.

---

## 📁 File Structure

```
groupsite/
├── index.html              ← Main app (single page)
├── css/
│   └── style.css           ← All styling (dark theme, responsive)
├── js/
│   ├── firebase-config.js  ← 🔑 Firebase keys + group settings
│   └── app.js              ← All app logic
└── README.md
```

---

## 🚀 Setup

### Step 1 — Firebase (already done for ABDevillors)

Your Firebase project is already configured. The `js/firebase-config.js` file contains the live credentials for `abdevillors`. No changes needed unless you're starting a brand new project.

If you ever need to set up from scratch:
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a project → enable **Realtime Database** in test mode
3. Go to **Project Settings → Your apps → `</>`** → copy the `firebaseConfig` object
4. Paste it into `js/firebase-config.js`

---

### Step 2 — Customize your group (optional)

Open `js/firebase-config.js` and update `GROUP_CONFIG`:

```js
const GROUP_CONFIG = {
  name: "ABDevillors",
  tagline: "Ideas, links, and conversations — all in one place.",
  secretKeyword: "ABDev2025",   // Default keyword — change via Admin panel after first login
  adminUser: "Debjyoti",        // Whoever registers with this exact name gets Admin role
  members: [
    { name: "Debjyoti", role: "Admin", avatar: "🦁", bio: "Founder & lab admin.", color: "#FF6B6B" },
    // Add preset members here — they get their avatar/color auto-applied on register
  ]
};
```

---

### Step 3 — Deploy to GitHub Pages

1. Go to your GitHub repo: `github.com/DebjyotiBLR/Virat-Kohli`
2. Click **Add file → Upload files**
3. Upload with this exact structure (don't nest inside a subfolder):

```
Virat-Kohli/
├── index.html        ← must be at root level
├── css/
│   └── style.css
└── js/
    ├── app.js
    └── firebase-config.js
```

4. Commit → wait ~1 minute → visit:

**🌐 https://debjyotiblr.github.io/Virat-Kohli**

---

### Step 4 — Firebase Database Rules

In Firebase Console → **Realtime Database → Rules**, set:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Click **Publish**. This is required for chat, ideas, and links to work.

> For tighter security later, you can restrict rules to authenticated users once you add Firebase Auth.

---

## 🔐 Authentication & Access

The entire site is behind a login wall — nothing is visible without signing in.

### Registering (first time)
1. Click the **Register** tab on the login screen
2. Enter a **display name** (2–24 characters)
3. Enter your **Date of Birth** — this acts as your password, so use a real one you'll remember
4. Enter the **secret keyword** (share this only with lab members)
5. Hit **Create Account**

> **To get Admin:** register with the exact name set in `GROUP_CONFIG.adminUser` (default: `Debjyoti`)

### Signing In (returning)
1. Enter your **username** and **Date of Birth**
2. Hit **Sign In** — no keyword needed after the first registration

### Security features
- Session is re-validated against Firebase on every page load
- Banned users are blocked immediately, even mid-session
- Client-side rate limiting on chat (max 3 messages per 10 seconds)
- All input is sanitized before being written to the database
- Input length limits enforced (titles: 120 chars, messages: 500 chars)

---

## ⚙️ Admin Panel

The admin (whoever registered as `Debjyoti`) gets access to the **⚙️ Admin** page, which lets you:

| Action | Description |
|--------|-------------|
| View all members | See everyone who has registered |
| Remove / ban a member | They are immediately blocked from logging back in |
| Change the secret keyword | Rotate it anytime — existing members are unaffected |
| Post announcements | Pin important ones to the top |
| Clear all chat | Delete all messages permanently |
| View live stats | Count of messages, ideas, links, and members |

---

## ✨ Pages & Features

| Page | What you can do |
|------|----------------|
| 🏠 Home | Welcome screen with live stats, recent announcements, and activity feed |
| 📣 Announcements | Post group-wide updates; admins can pin important ones |
| 💬 Chat | Real-time group chat with live message sync |
| 💡 Ideas | Post ideas with tags, filter by category, upvote favourites |
| 🔗 Links | Share URLs with title, description, and category; filter by type |
| 👥 Members | Profile cards for everyone who has registered |
| ⚙️ Admin | Member management, keyword rotation, content moderation (admin only) |

---

## 📱 Responsive Design

| Device | Navigation |
|--------|-----------|
| **Mobile / Tablet** | Slide-in drawer (hamburger menu) + bottom tab bar |
| **Desktop / Laptop** | Top navigation bar with all pages |

Modals slide up from the bottom on mobile, and appear centered on desktop. Safe area insets are handled for iPhone notch and home bar.

---

## 🧪 Testing Locally (VS Code)

**Option 1 — Live Server (recommended)**
1. Install the **Live Server** extension by Ritwick Dey in VS Code
2. Open your `groupsite` folder in VS Code
3. Right-click `index.html` → **Open with Live Server**
4. Opens at `http://127.0.0.1:5500` and auto-refreshes on save ✅

**Option 2 — Terminal**
```bash
npx serve .
```
Then open `http://localhost:3000`

> Firebase must be configured before local testing — chat, ideas, and links won't work without it.

**Quick test checklist:**
- [ ] Register with name `Debjyoti` + your DoB + keyword `ABDev2025` → check you get the Admin page
- [ ] Register a second account in another browser / incognito window
- [ ] Send a chat message — verify it appears on both sides in real time
- [ ] Post an idea and upvote it
- [ ] Share a link
- [ ] From Admin panel: change the secret keyword, post a pinned announcement
- [ ] Test on your phone using your local IP (e.g. `http://192.168.x.x:5500`)

---

## 🔒 Securing the Database (recommended after setup)

The current rules allow open read/write (fine for a trusted group). For better security, update your Firebase rules to:

```json
{
  "rules": {
    "users":         { ".read": true, ".write": true },
    "banned":        { ".read": true, ".write": true },
    "settings":      { ".read": true, ".write": true },
    "chat":          { ".read": true, ".write": true },
    "ideas":         { ".read": true, ".write": true },
    "links":         { ".read": true, ".write": true },
    "announcements": { ".read": true, ".write": true }
  }
}
```

For full production security, consider adding **Firebase Authentication** so rules can be locked to signed-in users only.

---

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Database:** Firebase Realtime Database (free Spark plan)
- **Hosting:** GitHub Pages (free, no server needed)
- **Fonts:** Syne (display) + DM Sans (body) via Google Fonts
- **Auth:** Custom keyword + Date of Birth system (stored in Firebase)

---

## 🌐 Your Live Site

**https://debjyotiblr.github.io/Virat-Kohli**

Firebase project: `abdevillors` · Region: Asia Southeast 1
