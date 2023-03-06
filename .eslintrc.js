module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  // extends: [
  //   'eslint:recommended',
  //   'plugin:@typescript-eslint/recommended',
  // ],
  extends: [
    'airbnb-base',
    'airbnb-typescript/base'
  ],
  parserOptions: {
    project: './tsconfig.json'
  },
};
