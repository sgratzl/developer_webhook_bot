module.exports = {
  env: {
    es6: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/consistent-type-assertions': ['error', {assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter'}],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/explicit-member-accessibility': ['error', {
      accessibility: 'no-public'
    }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/interface-name-prefix': ['error', { prefixWithI: 'always' }],
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/prefer-readonly': 'error',
    'quotes': 'off',
    '@typescript-eslint/no-unused-vars': ["error", {argsIgnorePattern: '^_'}],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/quotes': ['error', 'single'],
    '@typescript-eslint/restrict-plus-operands': 'error',
    'semi': 'off',
    '@typescript-eslint/semi': ['error', 'always']
  }
};
