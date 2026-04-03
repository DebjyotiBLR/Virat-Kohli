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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================
//  STEP 2: Set your group name & members here
// ============================================================
const GROUP_CONFIG = {
  name: "Our Crew",
  tagline: "Ideas, links, and conversations — all in one place.",
  accentColor: "#FF6B6B",
  members: [
    { name: "Alice",   role: "Admin",    avatar: "🦊", bio: "Loves design & coffee.",    color: "#FF6B6B" },
    { name: "Bob",     role: "Member",   avatar: "🐻", bio: "Backend wizard.",            color: "#4ECDC4" },
    { name: "Charlie", role: "Member",   avatar: "🐯", bio: "Always has wild ideas.",     color: "#FFE66D" },
    { name: "Diana",   role: "Member",   avatar: "🦋", bio: "Frontend & vibes.",          color: "#A8E6CF" },
    { name: "Ethan",   role: "Member",   avatar: "🦉", bio: "Data nerd & night owl.",     color: "#C7CEEA" }
  ]
};