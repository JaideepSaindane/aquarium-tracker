// English strings. Hinglish translations are added in T-024 — see
// docs/04-design-system.md §Language and layout: Hinglish runs 15-25% longer,
// so every screen must be tested against a deliberately long string, not just
// against English.
const en = {
  tabs: {
    tanks: "Tanks",
    dex: "Dex",
    home: "Home",
    community: "Community",
    settings: "Settings",
  },
  common: {
    comingSoon: "This screen isn't built yet.",
    save: "Save",
    cancel: "Cancel",
    remove: "Remove",
    add: "Add",
    loading: "Loading...",
  },
  emergency: {
    title: "Emergency",
  },
  onboarding: {
    welcomeTitle: "Welcome to AquaAI",
    welcomeSubtitle: "Just a couple of quick things before you dive in.",
    getStarted: "Get started",
    plannerTitle: "Help me build a tank",
    plannerBody:
      "Coming soon — a guided setup planner that recommends equipment based on your tank size and fish. For now, explore the app or add a tank you already have.",
  },
  home: {
    title: "Tanks",
    newTank: "+ New tank",
    noTanksYet: "No tanks yet. Scan a tank to set one up in a couple of minutes.",
    emptyHeading: "Let's get your first tank set up",
    haveTankCta: "Already have a tank? Add it here",
    plannerCta: "Help me build a tank",
    scanATank: "Scan a tank →",
    addByHand: "Or add one by hand →",
    emergencyLink: "Something wrong with a fish right now? Emergency →",
  },
  settings: {
    title: "My Profile & Settings",
    profileTitle: "My Info",
    profileSubtitle: "Optional, and never leaves this device — no account, no sign-in.",
    exportTitle: "Export your data",
    exportSubtitle: "Everything, free forever, no account needed. Works offline.",
    languageTitle: "Language",
    languageSubtitle: "Switches the whole interface immediately, no restart needed.",
    startOver: "Start over",
  },
} as const;

export default en;
