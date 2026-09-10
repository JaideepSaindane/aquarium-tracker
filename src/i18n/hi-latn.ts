// Hinglish (Latin script), specs/T-024. Technical terms — species names,
// "ammonia", "pH", parameter/medication names, units — are NEVER
// translated, per the hard rule in that spec and docs/05-content-guide.md
// §5. These are machine-drafted for a real Hinglish speaker to review
// before launch (the spec's own explicit instruction) — flagged in
// specs/PROGRESS.md, not silently treated as launch-ready.
import type { Dictionary } from "./types";

const hiLatn: Dictionary = {
  tabs: {
    tanks: "Mere Tanks",
    dex: "Dex",
    home: "Home",
    ask: "Ask Aqua",
    community: "Community",
    settings: "Settings",
    profile: "Mera Profile",
  },
  common: {
    comingSoon: "Ye screen abhi banaya nahi gaya hai.",
    save: "Save karein",
    cancel: "Cancel karein",
    remove: "Hatayein",
    add: "Add karein",
    loading: "Load ho raha hai...",
  },
  emergency: {
    title: "Emergency",
  },
  onboarding: {
    welcomeTitle: "AquaAI mein swagat hai",
    welcomeSubtitle: "Apne tank ki photo lijiye, expert advice paaiye — pehli machli se lekar ek thriving planted tank tak.",
    getStarted: "Shuru karein",
    plannerTitle: "Tank banane mein madad karein",
    plannerBody:
      "Jald hi aayega — ek guided setup planner jo aapke tank ke size aur fish ke hisaab se equipment suggest karega. Abhi ke liye, app explore karein ya apna existing tank add karein.",
  },
  home: {
    title: "Mere Tanks",
    newTank: "+ Naya tank",
    noTanksYet: "Abhi koi tank nahi hai. Ek tank scan karke chand minute mein set up karein.",
    emptyHeading: "Chaliye aapka pehla tank set up karte hain",
    haveTankCta: "Pehle se tank hai? Yahan add karein",
    plannerCta: "Tank banane mein madad karein",
    scanATank: "Tank scan karein →",
    addByHand: "Ya haath se add karein →",
    emergencyLink: "Fish ke saath abhi kuch galat ho raha hai? Emergency →",
  },
  settings: {
    title: "My Profile & Settings",
    profileTitle: "My Info",
    profileSubtitle: "Optional hai — sirf aapko dikhega, aapke account se linked.",
    exportTitle: "Apna data export karein",
    exportSubtitle: "Sab kuch, hamesha free. Aapka data aapka hai, hamara nahi.",
    languageTitle: "Language",
    languageSubtitle: "Poora interface turant badal jaata hai, restart ki zaroorat nahi.",
    startOver: "Phir se shuru karein",
  },
};

export default hiLatn;
