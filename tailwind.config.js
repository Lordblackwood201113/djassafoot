/** @type {import('tailwindcss').Config} */
// Thème « Noir » — fond noir, cartes sombres, bordures hairline, un seul accent blanc.
// La couleur ne sert QUE d'information (sauge = argent/positif, rouge désaturé = erreur/live).
// Noms de tokens conservés (ink/surface/red/green…) pour convertir l'app sans tout réécrire :
// seules les VALEURS changent.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        paper: '#F5F5F4', // blanc cassé — texte fort / boutons pleins
        ink: '#0A0A0B', // fond de l'app
        bg: '#0A0A0B',
        // Surfaces (cartes / blocs / pills) — du plus foncé au plus clair
        surface: '#151518',
        'surface-2': '#1C1C20',
        'surface-3': '#151518', // alias carte (token le plus utilisé)
        card: '#151518',
        tab: '#0F0F10', // barre d'onglets
        // Filets
        hairline: 'rgba(255,255,255,0.10)', // bordures
        line: 'rgba(255,255,255,0.06)', // séparateurs
        // Texte
        muted: '#A1A1AA', // secondaire
        'muted-2': '#6B7280', // tertiaire / placeholder
        // Couleur = information uniquement
        green: '#6FA287', // sauge — gains / positif / argent
        red: '#E5484D', // désaturé — erreur / live / danger
        // Podium (classement) — neutres chauds discrets
        gold: '#D9C48A',
        silver: '#B8BCC4',
        bronze: '#B98A63',
      },
      fontFamily: {
        // Sora = titres/chiffres ; Inter = tout le reste. Plus de Space Mono (effet « terminal »).
        display: ['Sora_800ExtraBold'],
        'display-bold': ['Sora_700Bold'],
        'display-semibold': ['Sora_600SemiBold'],
        ui: ['Inter_400Regular'],
        body: ['Inter_400Regular'],
        'ui-medium': ['Inter_500Medium'],
        'ui-semibold': ['Inter_600SemiBold'],
        'ui-bold': ['Inter_700Bold'],
        // `font-mono` / `font-mono-bold` re-mappés sur Inter → l'ancien look mono disparaît partout.
        mono: ['Inter_500Medium'],
        'mono-bold': ['Inter_600SemiBold'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
