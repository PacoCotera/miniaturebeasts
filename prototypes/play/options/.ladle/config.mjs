// The component catalogue (Ladle): the Options panel's parts in every state. Run: npm run catalogue (dev server) or npm run catalogue:build (static, to ./catalogue-out, not deployed).
export default {
  stories: "stories/**/*.stories.jsx",
  outDir: "catalogue-out",
  addons: {
    width: { enabled: true, options: { phone: 390, laptop: 1440 }, defaultState: 0 },   // the two widths the screens are signed at
    theme: { enabled: false },
  },
};
