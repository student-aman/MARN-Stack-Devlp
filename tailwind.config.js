// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.{ejs,js}",      // Saari EJS files 'views' folder mein
    "./views/partials/**/*.{ejs,js}", // Agar 'views/partials' mein bhi EJS files hain
    "./public/js/**/*.js",        // Agar koi JavaScript files mein bhi Tailwind classes use ho rahi hain
    // Aur koi bhi file jismein tum Tailwind classes use karoge, uska path yahan add karo.
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}