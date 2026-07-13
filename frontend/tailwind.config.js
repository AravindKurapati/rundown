/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        bg2: "var(--bg2)",
        bg3: "var(--bg3)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        air: "var(--air)",
        amber: "var(--amber)",
        good: "var(--good)",
        // multi-accent system (shared with the generative cover palette)
        coral: "var(--coral)",
        violet: "var(--violet)",
        teal: "var(--teal)",
        gold: "var(--gold)",
        rose: "var(--rose)",
      },
      fontFamily: {
        display: ['"Anton"', "Impact", '"Arial Narrow"', "sans-serif"],
        sans: ['"Fraunces"', "Georgia", "Cambria", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "Consolas", "monospace"],
      },
      letterSpacing: {
        marquee: "0.06em",
      },
    },
  },
  plugins: [],
};
