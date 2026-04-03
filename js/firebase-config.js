// ============================================================
//  YOUR FIREBASE CONFIG — already filled in for ABDevillors
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDzecOtJM9gy7xU_KoAEQ59uib2ubM4tE4",
  authDomain: "abdevillors.firebaseapp.com",
  databaseURL: "https://abdevillors-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "abdevillors",
  storageBucket: "abdevillors.firebasestorage.app",
  messagingSenderId: "683003813250",
  appId: "1:683003813250:web:b1249142c849a56eff439b",
  measurementId: "G-2NL6G5RRS5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================
//  GROUP SETTINGS — customize these
// ============================================================
const GROUP_CONFIG = {
  name: "ABDevillors",
  tagline: "Ideas, links, and conversations — all in one place.",
  secretKeyword: "ABDev2025",   // Share ONLY with lab members — admin can change via panel
  adminUser: "Debjyoti",        // This username gets the Admin Panel
  members: [
    { name: "Debjyoti", role: "Admin",  avatar: "🦁", bio: "Founder & lab admin.",    color: "#FF6B6B" },
    { name: "Alice",    role: "Member", avatar: "🦊", bio: "Loves design & coffee.", color: "#4ECDC4" },
    { name: "Bob",      role: "Member", avatar: "🐻", bio: "Backend wizard.",         color: "#FFE66D" },
    { name: "Charlie",  role: "Member", avatar: "🐯", bio: "Always has wild ideas.",  color: "#A8E6CF" },
    { name: "Diana",    role: "Member", avatar: "🦋", bio: "Frontend & vibes.",       color: "#C7CEEA" }
  ]
};
