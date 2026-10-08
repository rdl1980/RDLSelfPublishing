import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  languageOptions: {
    globals: {
      chrome: 'readonly',
      defineBackground: 'readonly',
      defineContentScript: 'readonly',
      createShadowRootUi: 'readonly',
      document: 'readonly',
      window: 'readonly',
      location: 'readonly',
      fetch: 'readonly',
      DOMParser: 'readonly',
      Document: 'readonly',
      Element: 'readonly',
      HTMLElement: 'readonly',
      AbortSignal: 'readonly',
      RequestInit: 'readonly',
      setTimeout: 'readonly',
      clearInterval: 'readonly',
      setInterval: 'readonly',
      console: 'readonly',
      URL: 'readonly',
      MessageEvent: 'readonly',
    },
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
});
