# Changelog

## [1.2.5](https://github.com/frostiks777/1pgWebGallery/compare/v1.2.4...v1.2.5) (2026-10-26)


### Bug Fixes

* **gallery:** повторять 503 при загрузке миниатюр ([#98](https://github.com/frostiks777/1pgWebGallery/issues/98)) ([b1c1d59](https://github.com/frostiks777/1pgWebGallery/commit/b1c1d590ba169cd0a73f6a2e6040efd07a06d958))
* **gallery:** повторять 503 при загрузке миниатюр ([#98](https://github.com/frostiks777/1pgWebGallery/issues/98)) ([4a811d7](https://github.com/frostiks777/1pgWebGallery/commit/4a811d7fee9007b604d6d6c188a33746dd374543))
* **images:** резервировать слот постера до await, один путь для демо и WebDAV ([#99](https://github.com/frostiks777/1pgWebGallery/issues/99)) ([e737961](https://github.com/frostiks777/1pgWebGallery/commit/e73796118013a4948944db8634f22e2a136df93e))
* **images:** резервировать слот постера до await, один путь для демо и WebDAV ([#99](https://github.com/frostiks777/1pgWebGallery/issues/99)) ([8da62b5](https://github.com/frostiks777/1pgWebGallery/commit/8da62b5c84dbfee0a6822843d5be291e5fb5d55f))
* **nginx:** cookie в cache key миниатюр ([#91](https://github.com/frostiks777/1pgWebGallery/issues/91)) ([2e98353](https://github.com/frostiks777/1pgWebGallery/commit/2e983532410b338a3c519ee127ce9c8c5b2c154b))
* **nginx:** извлекать cookie gallery-auth через map ([#91](https://github.com/frostiks777/1pgWebGallery/issues/91)) ([3580f3d](https://github.com/frostiks777/1pgWebGallery/commit/3580f3db197b8e7db3118df30e1baf88a2674dca))
* **nginx:** не отдавать авторизованные миниатюры из кэша анонимному клиенту ([#91](https://github.com/frostiks777/1pgWebGallery/issues/91)) ([f764c20](https://github.com/frostiks777/1pgWebGallery/commit/f764c20c73bb623e0e4f584e67ff180aaa118618))
* **nginx:** не отдавать авторизованные миниатюры из кэша анонимному клиенту ([#91](https://github.com/frostiks777/1pgWebGallery/issues/91)) ([c9a010b](https://github.com/frostiks777/1pgWebGallery/commit/c9a010be943bbbff6db1f4cac879501dbf9f5517))

## [1.2.4](https://github.com/frostiks777/1pgWebGallery/compare/v1.2.3...v1.2.4) (2026-10-21)


### Bug Fixes

* **audit:** drop the stale 'e2e not run locally' claim ([#35](https://github.com/frostiks777/1pgWebGallery/issues/35)) ([c1b3342](https://github.com/frostiks777/1pgWebGallery/commit/c1b3342581c0fa7db77845bcaacbaacdaaf9a6a1))
* **audit:** аудит больше не открывает PR — отчёт вне git, токен раннера ([#80](https://github.com/frostiks777/1pgWebGallery/issues/80)) ([552dcde](https://github.com/frostiks777/1pgWebGallery/commit/552dcde0044816c2cff76d68a4413c13a1e98f80))
* **audit:** аудит больше не открывает PR — отчёт вне git, токен раннера ([#80](https://github.com/frostiks777/1pgWebGallery/issues/80)) ([22ef1e6](https://github.com/frostiks777/1pgWebGallery/commit/22ef1e607583a986108f2590b845f42cc45717c8))

## [1.2.3](https://github.com/frostiks777/1pgWebGallery/compare/v1.2.2...v1.2.3) (2026-10-21)


### Bug Fixes

* **deploy:** cp -r public/. — public больше не вкладывается в release/public/public ([#37](https://github.com/frostiks777/1pgWebGallery/issues/37)) ([71a7da4](https://github.com/frostiks777/1pgWebGallery/commit/71a7da4ae5b0f1cd53fb52db5d14598a1335cf4f))

## [1.2.2](https://github.com/frostiks777/1pgWebGallery/compare/v1.2.1...v1.2.2) (2026-10-20)


### Bug Fixes

* **audit:** install bun in the lighthouse job ([#68](https://github.com/frostiks777/1pgWebGallery/issues/68)) ([985840a](https://github.com/frostiks777/1pgWebGallery/commit/985840a69234ed0b828fa4e931136bbf52afa766))
* **audit:** install bun in the lighthouse job ([#68](https://github.com/frostiks777/1pgWebGallery/issues/68)) ([1b57bbd](https://github.com/frostiks777/1pgWebGallery/commit/1b57bbd4d91c2370c8c507ec39ec593363a93633))

## [1.2.1](https://github.com/frostiks777/1pgWebGallery/compare/v1.2.0...v1.2.1) (2026-10-19)


### Bug Fixes

* **opencode:** resolve peer sessions via session.get, visible stream warning, smoke script ([#47](https://github.com/frostiks777/1pgWebGallery/issues/47) follow-up) ([254f5c0](https://github.com/frostiks777/1pgWebGallery/commit/254f5c0c4df39cf05d4e843562719b7f5b4f48d9))

## [1.2.0](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.7...v1.2.0) (2026-10-19)


### Features

* **telegram:** make session notifications informative ([b7e5bb6](https://github.com/frostiks777/1pgWebGallery/commit/b7e5bb6dc184c7227f1654389831fed3235ae68b))
* **telegram:** make session notifications informative ([0a4dab1](https://github.com/frostiks777/1pgWebGallery/commit/0a4dab1934ea4551ede95ec046e9fbb60226b8ed))


### Bug Fixes

* **opencode:** point subagents at a working free model ([3a5df67](https://github.com/frostiks777/1pgWebGallery/commit/3a5df678b24d9c8ceefd3e716067a5f236b34f09))
* **opencode:** point subagents at a working free model ([df7804a](https://github.com/frostiks777/1pgWebGallery/commit/df7804a15c35745233f86080d7284cba7e2435de))

## [1.1.7](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.6...v1.1.7) (2026-10-16)


### Bug Fixes

* **images:** stop pulling whole videos into RAM to extract one poster frame ([7531bc0](https://github.com/frostiks777/1pgWebGallery/commit/7531bc04e9ddc86cd073a0f354a1db8d3e626b82))
* **images:** не втягивать видео целиком в RAM ради одного кадра постера ([768d914](https://github.com/frostiks777/1pgWebGallery/commit/768d914a5eef2d7a71d1cdc1d692884ae13b6e37))

## [1.1.6](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.5...v1.1.6) (2026-10-15)


### Bug Fixes

* address PR review - unblock the nightly audit, purge npx remnants ([a2e8329](https://github.com/frostiks777/1pgWebGallery/commit/a2e83299cd192d065305deee128abe8659a60145))
* make bun the only package manager, refuse npm ([#36](https://github.com/frostiks777/1pgWebGallery/issues/36)) ([eea11b5](https://github.com/frostiks777/1pgWebGallery/commit/eea11b5ab5ba40badc9eeb19ca9678736a1676b3))
* make bun the only package manager, refuse npm ([#36](https://github.com/frostiks777/1pgWebGallery/issues/36)) ([4294fb0](https://github.com/frostiks777/1pgWebGallery/commit/4294fb0d8b395634103385245fa47054635139af))
* **opencode:** filter peer sessions by sessionID — the location filter in [#42](https://github.com/frostiks777/1pgWebGallery/issues/42) was a no-op ([0c5d1dd](https://github.com/frostiks777/1pgWebGallery/commit/0c5d1ddfbe734adaa5bec10c7996e6ee8935fc1d))

## [1.1.5](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.4...v1.1.5) (2026-10-15)


### Bug Fixes

* **opencode:** port telegram-autostart plugin to the v2 plugin API ([349f60f](https://github.com/frostiks777/1pgWebGallery/commit/349f60f341ebb7a3e573c0d241a9ac1307cd1c5f))
* **opencode:** port telegram-autostart plugin to the v2 plugin API ([26e35eb](https://github.com/frostiks777/1pgWebGallery/commit/26e35eb4ee3a20e9f130e0046cb94b2232b7ba22))
* **opencode:** use v2 session execution events and the v2 event payload ([16170c1](https://github.com/frostiks777/1pgWebGallery/commit/16170c1cc62bfced23228f12cf742717c4d68bb0))


### Performance Improvements

* **images:** disable the 50 MB libvips decoded-image cache ([#4](https://github.com/frostiks777/1pgWebGallery/issues/4)) ([cef4e68](https://github.com/frostiks777/1pgWebGallery/commit/cef4e681e88644df1e7f16f430994a4aedf40c1c))

## [1.1.4](https://github.com/frostiks777/1pgWebGallery/compare/v1.1.3...v1.1.4) (2026-10-15)


### Bug Fixes

* **ci:** модель агента в Variable, таймаут ревью 20 минут, объяснение сбоя ([#40](https://github.com/frostiks777/1pgWebGallery/issues/40)) ([7526538](https://github.com/frostiks777/1pgWebGallery/commit/7526538477a894420ec4544ac06ae11ab9267fbc))
* **ci:** модель агента в Variable, таймаут ревью 20 минут, объяснение сбоя ([#40](https://github.com/frostiks777/1pgWebGallery/issues/40)) ([5a11a9e](https://github.com/frostiks777/1pgWebGallery/commit/5a11a9e164c420660c4857433236dfbebc26057b))

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
