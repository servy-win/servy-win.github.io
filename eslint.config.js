import js from '@eslint/js'
import globals from 'globals'
import security from 'eslint-plugin-security'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    ignores: [
      'node_modules/',
      'public/',
      'dist/',
      '.vite/',
    ],
  },
  // 1. Add the security plugin's recommended configuration
  security.configs.recommended,
  
  // 2. Your custom project configuration
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { 
      js, 
      security 
    },
    // Note: We removed 'plugin:security/recommended' from here
    languageOptions: { 
      globals: globals.browser 
    },
    rules: {
      ...js.configs.recommended.rules, // Manually include JS recommended if needed
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      'no-unused-vars': 'warn',
      'no-unused-expressions': 'warn',
      'security/detect-object-injection': 'warn',
    },
  },
])
