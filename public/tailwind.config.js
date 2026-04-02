/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Naskh Arabic"', 'sans-serif'],
                serif: ['"Amiri"', 'serif'],
            },
            colors: {
                'wiki-bg': '#f8f9fa',
                'wiki-border': '#a2a9b1',
                'wiki-link': '#0645ad',
                'wiki-link-visited': '#0b0080',
                'wiki-text': '#202122',
                'wiki-panel': '#ffffff',
                'paper-bg': '#fffbf2',
                'paper-border': '#e8e4d9'
            }
        },
    },
    plugins: [],
}
