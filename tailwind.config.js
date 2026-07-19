/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0C1220",       // sfondo principale, blu notte
        panel: "#131B2E",     // pannelli/card
        panel2: "#1A2440",    // pannelli in evidenza
        paper: "#E9ECF5",     // testo chiaro
        cobalt: "#1B2A57",    // accento secondario scuro (badge, bottoni outline)
        gold: "#C6FF4D",      // accento primario: verde lime elettrico
        line: "#263151",      // separatori
        muted: "#7C88A6",     // testo secondario
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
