// Everything personal about the site lives here. Edit freely.
window.MEMORIAL = {
  title: "Deaconess",
  firstNames: "Florence Yewande",
  surname: "Babayomi",
  born: "1945-02-24",
  died: "2026-10-06",

  // Bible verses she held dear (shown under the hero). Add or remove freely.
  verses: [
    { text: "Those that put their trust in the Lord shall not be put to shame.", ref: "" },
    { text: "I will lift up my eyes unto the Lord; where will my help come from?", ref: "" },
  ],

  // Paragraphs of her story, in the family's own words.
  story: [
    "Mrs Babayomi is passionate about biblical tenets and as much as possible will always say be at peace " +
      "with each other be it among friends or family or neighbour's so she always advocate peace by saying " +
      "her mind that Jesus may come any time.",
    "She also loves to praise God no matter what and when she is extremely happy she rolls on the floor " +
      "and will keep singing.",
  ],

  // Moderation: entries listed here are hidden from the site (nothing is deleted).
  // Use the document ID from the Firebase console (Firestore → photos / tributes).
  hidden: {
    photos: [
      "WHT6oXBucwrACci8hRcY", // Mrs Oyelowo's photo (eating) — hidden at the family's request, 16 Oct 2026
    ],
    tributes: [],
  },

  // Guestbook storage (Firebase / Firestore web config).
  // Public by design: access is controlled by firestore.rules (deployed in the Firebase console).
  firebase: {
    apiKey: "AIzaSyCCEkovdfhKiKcC30BO-ZQMDt2d8lCel34",
    authDomain: "mrs-babayomi-memorial.firebaseapp.com",
    projectId: "mrs-babayomi-memorial",
    storageBucket: "mrs-babayomi-memorial.firebasestorage.app",
    messagingSenderId: "213717488008",
    appId: "1:213717488008:web:4aa5a38ca68a2bf16eea3d",
  },
};
