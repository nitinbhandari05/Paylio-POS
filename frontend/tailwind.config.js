/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#e53935",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};
