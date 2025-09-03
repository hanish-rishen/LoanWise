import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      '.vite',
      'node_modules',
      '**/Sidebar_broken.tsx',
      '**/Sidebar_old.tsx',
      '**/LoanApplicationsPage_backup.tsx',
      '**/ChatInterface_new.tsx',
      '**/VoiceMode_clean.tsx',
      '**/VoiceMode_new.tsx'
    ]
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        ecmaFeatures: {
          jsx: true,
        },
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-empty-pattern': 'off',
      'no-unsafe-finally': 'off',
      'react-hooks/rules-of-hooks': 'off', // Turn off for now
      'react-hooks/exhaustive-deps': 'off',
      'no-useless-escape': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
)
