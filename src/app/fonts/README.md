# Bundled fonts

Latin-subset woff2 files downloaded from Google Fonts so `next build` does not
need outbound HTTPS (plan A0.4). All three families are licensed under the
SIL Open Font License 1.1:

- Inter — https://fonts.google.com/specimen/Inter
- JetBrains Mono — https://fonts.google.com/specimen/JetBrains+Mono
- Instrument Serif — https://fonts.google.com/specimen/Instrument+Serif

| File | Family | Weights / styles |
|---|---|---|
| `Inter-Variable.woff2` | Inter | 100–900 |
| `JetBrainsMono-Variable.woff2` | JetBrains Mono | 100–800 |
| `InstrumentSerif-Regular.woff2` | Instrument Serif | 400 normal |
| `InstrumentSerif-Italic.woff2` | Instrument Serif | 400 italic |

`src/app/layout.tsx` loads them with `next/font/local`; the CSS variables
`--font-inter`, `--font-jetbrains-mono` and `--font-instrument-serif` are the
same as before, so no component changes are needed.
