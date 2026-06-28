/** @type {import('tailwindcss').Config} */
// Tokens OFFICIELS extraits du design Pencil (djassa.pen › variables).
// Noms identiques aux variables du design pour un mapping design → code 1:1.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        ink: '#0A1230',
        red: '#E5342B', // accent / "Foot" du logo / CTA
        muted: '#9AA4CC', // texte secondaire
        surface: '#1B2658', // cartes
        'surface-2': '#232F66', // cartes secondaires / badges
        green: '#3FCB86', // gains / validation (dégradé « Prono Result »)
        // Dégradé de fond (vertical) : bottom → mid → top
        'blue-bottom': '#0A1230',
        'blue-mid': '#16215C',
        'blue-top': '#2C40A0',
      },
      fontFamily: {
        // font-display = Sora (titres/scores/chiffres) ; font-ui = Inter (texte courant)
        display: ['Sora_800ExtraBold'],
        'display-bold': ['Sora_700Bold'],
        'display-semibold': ['Sora_600SemiBold'],
        ui: ['Inter_400Regular'],
        'ui-medium': ['Inter_500Medium'],
        'ui-semibold': ['Inter_600SemiBold'],
        'ui-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
