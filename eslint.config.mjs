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

  // Type-check regular TS/JS files (astro-eslint-parser handles .astro separately)
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
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

  // Apply TS recommended rules to .astro frontmatter without overriding the parser
  {
    files: ['**/*.astro'],
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },

  // Use @typescript-eslint/no-unused-vars
  {
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // Config files use loosely-typed plugin APIs
  {
    files: ['eslint.config.*'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  // Keep Prettier in charge of formatting
  eslintConfigPrettier
)
