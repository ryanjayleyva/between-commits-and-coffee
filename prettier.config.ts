import type { Config } from 'prettier'

const config: Config = {
  arrowParens: 'avoid',
  bracketSpacing: true,
  endOfLine: 'lf',
  printWidth: 80,
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',

  plugins: ['prettier-plugin-astro', '@ianvs/prettier-plugin-sort-imports'],

  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],

  importOrder: [
    '<BUILTIN_MODULES>',
    '^astro',
    '<THIRD_PARTY_MODULES>',
    '^@types',
    '^@/.*$',
    '^\\.\\.?/.*$',
    '\\.css$',
  ],
}

export default config
