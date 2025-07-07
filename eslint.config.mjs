import tseslint from '@electron-toolkit/eslint-config-ts';
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/out', '**/*.d.ts'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh,
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules,

      // Semicolon rules
      '@typescript-eslint/semi': ['error', 'always'],
      semi: 'off', // Turn off base rule as it conflicts with @typescript-eslint/semi

      // Code quality rules - less strict
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Too strict without strict mode
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-require-imports': 'warn',

      // General code quality
      'no-console': 'off', // Allow console statements for development
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-vars': 'off', // Using TypeScript version instead
      'prefer-const': 'error',
      'no-var': 'error',
      'no-case-declarations': 'error',

      // React specific
      'react/prop-types': 'off', // TypeScript handles this
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/jsx-props-no-spreading': 'off',
      'react/function-component-definition': 'off', // Allow flexible component definitions
      'react/no-unescaped-entities': 'warn',
      'react-refresh/only-export-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  eslintConfigPrettier
);
