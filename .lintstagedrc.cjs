module.exports = {
  '*.{ts,tsx,js,jsx}': (filenames) => {
    const filtered = filenames.filter(
      (f) => !f.includes('create-nexu/templates/')
    );
    if (filtered.length === 0) return [];
    return [`eslint --fix ${filtered.join(' ')}`, `prettier --write ${filtered.join(' ')}`];
  },
  '*.{json,md,yml,yaml}': (filenames) => {
    const filtered = filenames.filter(
      (f) => !f.includes('create-nexu/templates/')
    );
    if (filtered.length === 0) return [];
    return [`prettier --write ${filtered.join(' ')}`];
  },
};
