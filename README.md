# 🌟 Group Website

A colorful, collaborative group website with real-time data powered by Firebase.

---

## 📁 File Structure

```
groupsite/
├── index.html          ← Main app (single page)
├── css/
│   └── style.css       ← All styling
├── js/
│   ├── firebase-config.js  ← 🔑 YOUR CONFIG GOES HERE
│   └── app.js          ← All app logic
└── README.md
```

---

## 🚀 Setup in 3 Steps

### Step 1 — Create a Firebase Project (free)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → Continue
3. Disable Google Analytics (optional) → **Create project**
4. In the left sidebar, click **Realtime Database** → **Create database**
5. Choose your region → Start in **test mode** (you can add rules later)
6. Go to **Project Settings** (gear icon ⚙️ top left) → **Your apps** → click `</>`
7. Register your app → Copy the `firebaseConfig` object

### Step 2 — Add your config

Open `js/firebase-config.js` and replace the placeholder values with your real Firebase config:

```js
const firebaseConfig = {
  apiKey: "your-real-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  ...
};
```

### Step 3 — Customize your group

In the same file, update `GROUP_CONFIG`:

```js
const GROUP_CONFIG = {
  name: "Your Group Name",
  tagline: "Your tagline here.",
  members: [
    { name: "Alice", role: "Admin", avatar: "🦊", bio: "...", color: "#FF6B6B" },
    // add everyone in your group
  ]
};
```

---

## 🌐 Deploy to GitHub Pages

1. Create a new GitHub repository (public)
2. Upload all files maintaining the folder structure
3. Go to **Settings → Pages → Source: main branch / root**
4. Your site will be live at `https://yourusername.github.io/repo-name`

> ⚠️ Firebase Realtime Database rules: For a private group, update your Firebase rules to restrict access. Default "test mode" allows anyone to read/write for 30 days.

---

## ✨ Features

| Page | What you can do |
|------|----------------|
| 🏠 Home | See announcements & live activity feed |
| 📣 Announcements | Post group-wide updates, pin important ones |
| 💬 Chat | Real-time group chat |
| 💡 Ideas | Post ideas, vote them up |
| 🔗 Links | Share & categorize useful links |
| 👥 Members | See everyone in the group |

---

## 🔒 Securing your database (after setup)

In Firebase Console → Realtime Database → Rules, replace with:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

For production, consider adding proper authentication. The current setup is open — great for trusted friend groups.
