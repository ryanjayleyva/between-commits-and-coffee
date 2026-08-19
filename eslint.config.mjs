import eslint from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginAstro from 'eslint-plugin-astro'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  // Ignore build artifacts and lockfiles
  {
    ignores: ['dist', '.astro', 'node_modules', '.wrangler', 'pnpm-lock.yaml'],
  },

  // Use base JS recommended rules
  eslint.configs.recommended,

  // Use non-type-aware TS recommended rules
  ...tseslint.configs.recommended,

  // Type-check TS/JS in src, .astro handled separately
  {
    files: ['src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}', 'prettier.config.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Use Astro recommended rules (parser, processor, globals)
  ...eslintPluginAstro.configs['flat/recommended'],

  // Use @typescript-eslint/no-unused-vars
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },

  // Keep Prettier in charge of formatting
  eslintConfigPrettier
)
