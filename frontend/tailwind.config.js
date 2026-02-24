/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                wind: {
                    light: '#e0f2fe',
                    DEFAULT: '#0ea5e9',
                    dark: '#0369a1',
                },
                solar: {
                    light: '#fef3c7',
                    DEFAULT: '#f59e0b',
                    dark: '#b45309',
                },
            },
            boxShadow: {
                'premium': '0 8px 30px rgba(0, 0, 0, 0.04)',
                'premium-hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
            }
        },
    },
    plugins: [],
}
