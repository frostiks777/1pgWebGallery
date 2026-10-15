# Changelog

## [1.1.3](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.2...v1.1.3) (2026-10-15)


### Bug Fixes

* **proxy:** bound the in-memory rate map ([#6](https://github.com/frostiks777/1pgWebGallery/issues/6)) ([d25437a](https://github.com/frostiks777/1pgWebGallery/commit/d25437aec57af849f57ae206258d2dc7f264e732))

## [1.1.2](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.1...v1.1.2) (2026-10-15)


### Bug Fixes

* **e2e:** raise expect.timeout and rewrite the baseline docs to match reality ([#11](https://github.com/frostiks777/1pgWebGallery/issues/11), [#12](https://github.com/frostiks777/1pgWebGallery/issues/12), [#13](https://github.com/frostiks777/1pgWebGallery/issues/13), [#15](https://github.com/frostiks777/1pgWebGallery/issues/15)) ([a9bfa01](https://github.com/frostiks777/1pgWebGallery/commit/a9bfa01f71d36639cbdb16d497d11bb4c26981f0))

## [1.1.1](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.0...v1.1.1) (2026-10-14)


### Bug Fixes

* **nginx:** кэш миниатюр, отключение логов /api/images и ротация логов ([#3](https://github.com/frostiks777/1pgWebGallery/issues/3), [#9](https://github.com/frostiks777/1pgWebGallery/issues/9)) ([e524a7d](https://github.com/frostiks777/1pgWebGallery/commit/e524a7dafcd4a75eeb2a1f2c3ab618334481e40c))
* **setup-nginx:** конфиг копируется из nginx.conf вместо своего шаблона ([#25](https://github.com/frostiks777/1pgWebGallery/issues/25)) ([9c08216](https://github.com/frostiks777/1pgWebGallery/commit/9c082166153014092ef38a7ee1963320b5e3fd4b))

## [1.1.0](https://github.com/frostiks777/1pgWebGallery/compare/v1.0.0...v1.1.0) (2026-10-13)


### Features

* **ci:** агент в GitHub Actions — /oc, триаж, ревью, регулярный аудит ([#17](https://github.com/frostiks777/1pgWebGallery/issues/17)) ([69df08e](https://github.com/frostiks777/1pgWebGallery/commit/69df08ec8abf05e70f751dc7414d95e2b48e2f64))


### Bug Fixes

* **ci:** narrow opencode permissions and check out the PR head ref ([#17](https://github.com/frostiks777/1pgWebGallery/issues/17)) ([71392a7](https://github.com/frostiks777/1pgWebGallery/commit/71392a79879e5f7a059d223f47afcb876651cc9e))

## 1.0.0 (2026-10-13)


### Features

* **gallery:** auto-generated video trailer previews on hover/open ([2311318](https://github.com/frostiks777/1pgWebGallery/commit/2311318db1f0f231a63037dfd4fcafbac41925ea))
* **gallery:** generate poster thumbnails for videos with no companion photo ([09f82bd](https://github.com/frostiks777/1pgWebGallery/commit/09f82bd1c125b65fc48013d2f22cad9989530946))
* **theme:** cyberpunk light palette, data-theme, and obsidian:theme storage ([5f34cdb](https://github.com/frostiks777/1pgWebGallery/commit/5f34cdbb07317f2dce013582277e7ef774a4e349))
* **theme:** cyberpunk light palette, data-theme, and obsidian:theme storage ([5f34cdb](https://github.com/frostiks777/1pgWebGallery/commit/5f34cdbb07317f2dce013582277e7ef774a4e349))
* **ui:** WebDAV status dot, auth row fix, layout tweaks (album, minimal, empire, bento), README ([a448a1a](https://github.com/frostiks777/1pgWebGallery/commit/a448a1ab68080edabd57c92fa5f08dbf745b799f))
* **ui:** индикатор WebDAV, правки Album/Minimal/Empire/Bento и README ([a448a1a](https://github.com/frostiks777/1pgWebGallery/commit/a448a1ab68080edabd57c92fa5f08dbf745b799f))


### Bug Fixes

* "Failed to load image" on fast lightbox navigation ([29452de](https://github.com/frostiks777/1pgWebGallery/commit/29452de719f022b3325cbda74926c0d820eccb7d))
* "Too Many Requests" error in gallery ([24be971](https://github.com/frostiks777/1pgWebGallery/commit/24be9710ac437b38ce181505fcddc33a5b5c116c))
* beforeunload blocks auth reload ([e03731a](https://github.com/frostiks777/1pgWebGallery/commit/e03731ae9e35fcab8f23a3e1bdfd5b996c42719e))
* **ci:** deploy user needs /bin/bash, not nologin ([62d5bd7](https://github.com/frostiks777/1pgWebGallery/commit/62d5bd796abc5e085e18fe3c1c7d98fa5f8e7f08))
* **ci:** merge static assets into release instead of nesting them ([46f5dde](https://github.com/frostiks777/1pgWebGallery/commit/46f5ddebebbb1bf0b6937d0d731eda45cb3f036a))
* **ci:** nginx static paths and .env.local both pointed at old checkout dir ([a995231](https://github.com/frostiks777/1pgWebGallery/commit/a995231dc8ef33ad34e687d711eed40ab692c06d))
* **e2e:** use localhost instead of 127.0.0.1 for the smoke test ([#13](https://github.com/frostiks777/1pgWebGallery/issues/13)) ([fb9a0f2](https://github.com/frostiks777/1pgWebGallery/commit/fb9a0f26e793262dc67ba874cbd9ca43029e20c1))
* Gallery not switching from demo after login ([b39606f](https://github.com/frostiks777/1pgWebGallery/commit/b39606fcd4211fc66dd1aa0bd52a000e17e6c71e))
* Gallery stays in demo mode after correct password ([c482ac3](https://github.com/frostiks777/1pgWebGallery/commit/c482ac3a707ea1b7a234303800a25a1090b4dac9))
* **gallery:** lightbox video controls were clipped by overflow-hidden ([27a9403](https://github.com/frostiks777/1pgWebGallery/commit/27a9403b28242674f52cf35e8c1f50ee20d4568e))
* **gallery:** trailer hover no longer permanently gives up after one failure ([45e231a](https://github.com/frostiks777/1pgWebGallery/commit/45e231a36e30060b10b802c366253ddf3cdb6cc1))
* **lint:** exclude Obsidian_Theme/ design mockups from eslint ([939a397](https://github.com/frostiks777/1pgWebGallery/commit/939a3973be5135a41c3490549f37499ef691779b))
* **lint:** restructure effects to clear react-hooks/set-state-in-effect ([#12](https://github.com/frostiks777/1pgWebGallery/issues/12)) ([8a922af](https://github.com/frostiks777/1pgWebGallery/commit/8a922af684a92a8819d4e90fd95166157d1eda16))
* **nginx:** give /_next/static/ priority over the image/font regex location ([2642342](https://github.com/frostiks777/1pgWebGallery/commit/2642342ce0a7be7b27302f8494de1d0b82dd17a7))
* **types:** make tsc --noEmit clean in video-stream route ([4370e29](https://github.com/frostiks777/1pgWebGallery/commit/4370e2936286fa59ed70885968115d545dba10e3))
* **ui:** WebDAV в шапке, отступ папок, меню сортировки, альбом и masonry ([2255417](https://github.com/frostiks777/1pgWebGallery/commit/2255417f0402ac36666a0ac3c9d1b43f8ac22b83))
* **ui:** WebDAV в шапке, отступ папок, меню сортировки, альбом и masonry ([2255417](https://github.com/frostiks777/1pgWebGallery/commit/2255417f0402ac36666a0ac3c9d1b43f8ac22b83))
* **ui:** выравнивание WebDAV, удаление Empire, отступы, Minimal/сортировка/подвал, зерно в светлой теме, README ([96395af](https://github.com/frostiks777/1pgWebGallery/commit/96395af90b333a7feb0ab8c2830e6404b72a0051))
* **ui:** выравнивание WebDAV, удаление Empire, отступы, Minimal/сортировка/подвал, зерно в светлой теме, README ([96395af](https://github.com/frostiks777/1pgWebGallery/commit/96395af90b333a7feb0ab8c2830e6404b72a0051))
