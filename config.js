// Everything personal about the site lives here. Edit freely.
window.MEMORIAL = {
  title: "Deaconess",
  firstNames: "Florence Yewande",
  surname: "Babayomi",
  born: "1945-02-24",
  died: "2026-10-06",

  verse: "I have fought a good fight, I have finished my course, I have kept the faith.",
  verseRef: "2 Timothy 4:7",

  // Paragraphs of her story. Add, remove or rewrite freely.
  story: [
    "Write about who she was here — where she was born, the family she raised, " +
      "the church she served as a deaconess, and the things everyone remembers her for.",
    "A second paragraph for the little things: her cooking, her laugh, her prayers, " +
      "the advice she always gave.",
  ],

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
