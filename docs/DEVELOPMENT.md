# Building IBQgram / IBQgram derleme

The current native target is macOS on Apple Silicon. A native build needs Xcode, its command-line tools, Python 3, Node.js 20+, Homebrew, CMake, Ninja, Automake, Libtool, pkg-config, GNU tar, NASM, Meson and librsvg (`rsvg-convert`). Follow the pinned upstream [macOS instructions](https://github.com/telegramdesktop/tdesktop/blob/v7.4.4/docs/building-mac.md) for additional prerequisites. This is a source preview, not a notarized installer.

Mevcut native hedef Apple Silicon macOS'tur. İlk bağımlılık hazırlığı kapsamlı indirme, disk alanı ve derleme süresi gerektirir. Kurulu Telegram uygulamasının dosyaları kullanılmaz.

## 1. Public source preparation / Kaynak hazırlığı

```sh
npm run source:prepare
```

The script downloads public Telegram Desktop commit `bf4f714036f21c750d535dab199c811b3f9bfdd4` (v7.4.4), initializes its public submodules, and applies the two tracked patches. It preserves upstream licensing files and does not require access to private repositories. The full modified C++ source becomes available under `desktop/tdesktop/`; inspect it normally there.

The directory is ignored by the outer repository because the published source of our modifications is in `desktop/patches/`. If you edit native code, update the corresponding patch before publishing. Do not commit credentials or compiled resources into patches. `source:prepare` checks revision identity, avoids resetting an existing checkout and recognizes already-applied patches. On conflicts it stops rather than discarding work.

Betik public upstream kaynaklarını sabit sürümden indirir, alt modülleri kurar ve bütün değişikliklerimizi uygular. Native dosyalarda yaptığınız yeni değişiklikleri yayımlamadan önce yamalara aktarın; dış depo bu kaynak klasörünü takip etmez.

## 2. Native dependencies / Native bağımlılıklar

From the project root, install missing build tools with Homebrew according to upstream requirements. For the SVG icon build, install `librsvg` if `rsvg-convert` is unavailable.

```sh
cd desktop
TDESKTOP_MAC_TOOLCHAIN=system CMAKE_BUILD_PARALLEL_LEVEL=8 \
  ./tdesktop/Telegram/build/prepare/mac.sh skip-release
cd ..
```

This prepares dependencies under `desktop/Libraries/` and `desktop/ThirdParty/`, including Qt 6.11.2. Do not run two preparation jobs in the same directory. Do not use these dependency directories for personal data.

## 3. Application credentials / Uygulama bilgileri

```sh
cp .env.example .env
```

Edit `.env` locally with your own values from <https://my.telegram.org/apps>:

```dotenv
TDESKTOP_API_ID=
TDESKTOP_API_HASH=
```

These values identify the client application; they do not replace user login or user session keys. The native binary must use them and they can be extracted from a distributed build. Do not publish them in source, logs or screenshots. The configuration helper treats `.env` as data, not shell commands, and uses restricted local files for the CMake preload.

## 4. Configure, build and open / Derle ve aç

```sh
npm run native:configure
npm run native:build
npm run desktop:open
```

Use the generated `desktop/tdesktop/out/Debug/icqram.app`. The internal file name and storage identifiers intentionally retain their legacy spelling. The product displays IBQgram.

**Do not run Xcode clean or delete an existing output folder containing sessions.** This development build may keep portable account data beside build products. Never distribute the development folder or a package assembled from a logged-in environment. Automatic upstream updates and crash reporting are disabled by the project configuration.

The `--test-build` configuration option selects upstream limited test application credentials, not Telegram test data centers. It is only for local compilation experiments, never a public client configuration.

## 5. Local checks / Yerel kontroller

```sh
npm run source:prepare -- --minimal
npm run check
npm test
```

`--minimal` prepares Desktop and WebView source files for tests; it does not prepare every native build dependency. On non-macOS hosts, the macOS-only runtime test is skipped.

For optional UI packaging and resource comparison on macOS:

```sh
npm run ui:build
npm run ui:verify
npm run ui:verify -- --native
```

The last command requires the native bundle too. `npm run security:verify` expects local API configuration plus both built bundles and writes private evidence under `build/security/`. These are bounded checks, not a security certification.

GitHub Actions is disabled for this repository. Checks are run locally; no CI workflow or automatic publication job is included.

## Optional local sounds / İsteğe bağlı yerel sesler

Original recordings are not distributed. The UI packager includes recognized files under ignored `sounds/` only if you provide them locally and have the necessary rights. Missing recordings do not block source/UI packaging. Do not add them to commits or release archives without separately establishing redistribution rights.
