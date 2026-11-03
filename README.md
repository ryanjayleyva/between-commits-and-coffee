# Between Commits and Coffee

Personal blog. Markdown posts with YAML frontmatter are compiled to static HTML
by Astro and served from a Cloudflare Worker.

![Between Commits and Coffee](./assets/between-commits-and-coffee-v2.jpeg)

## Testing

Tests run with [Vitest](https://vitest.dev) through Astro's `getViteConfig`.

```
pnpm test        # run once
pnpm test:watch  # re-run on change
```

Test files live in `tests/` and mirror `src/`, with one `*.test.ts` per source
file. For example, `src/lib/seo.ts` is tested by `tests/lib/seo.test.ts`.
Components are rendered with Astro's Container API.

Typed linting needs the generated `.astro/` types. Run `pnpm astro sync` once
after a fresh clone.

## License

Code is licensed under the [MIT License](./LICENSE). Blog content is copyright ©
2026 RJ Leyva and is not covered by it.
