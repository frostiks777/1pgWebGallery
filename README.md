# 📸 Photo Gallery - WebDAV Cloud Photos

A beautiful, modern, **highly optimized** single-page photo gallery application with WebDAV cloud integration. View your photos in stunning collage layouts with smooth animations and an intuitive interface.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ⚡ Performance Optimizations

This gallery has been **heavily optimized** for maximum performance:

- **🚀 70-75% faster** image loading with WebP optimization
- **📦 70% smaller** file sizes using Sharp image processing
- **💾 Intelligent caching** with 30-day browser cache + co-located WebDAV thumbnails
- **🔄 Smart prefetching** for instant navigation in Lightbox
- **⚛️ React optimizations** with memo, useMemo, useCallback
- **🎯 Lazy loading** and async decoding for smooth scrolling
- **📊 Performance Score > 90** in Lighthouse
- **📂 Fast folder navigation** via local dir-meta covers (no extra WebDAV requests)

See [PERFORMANCE.md](./PERFORMANCE.md) for detailed optimization report.

## ✨ Features

- **🖼️ 6 Gallery Layouts**

  **Grid Layouts:**
  - **Masonry** - Pinterest-style staggered grid
  - **Bento Grid** - Modern asymmetric card layout

  **Artistic Layouts:**
  - **Honeycomb** - Unique hexagonal pattern
  - **Wave** - Dynamic wavy arrangement

  **Style Layouts:**
  - **Minimalism (Минимализм)** - Clean list with thumbnails and monospace metadata
  - **Album** - Print-inspired layout with warm paper tones and mat frames

- **🔍 Full-Featured Lightbox**
  - Zoom in/out functionality
  - Keyboard navigation (← →)
  - Thumbnail strip for quick navigation
  - Photo download option
  - Hide / delete / cover / panorama controls inside lightbox

- **📁 Folder Navigation**
  - Breadcrumb navigation with Home button
  - Folder preview thumbnails (up to 3 cover photos per folder)
  - Automatic cover auto-populate on first visit

- **⭐ Photo Management**
  - **Hide photos** - hide from gallery, show all with one click
  - **Delete photos** - two-stage workflow: pending deletion with restore, then permanent removal
  - **Cover photos** - select up to 3 photos as folder cover (star icon)
  - **Panorama marking** - mark wide photos for special display

- **⚡ Smart Sorting**
  - Sort by name (A-Z, Z-A)
  - Sort by date (oldest/newest first)
  - Applies to both photos and folders

- **☁️ WebDAV Integration**
  - Connect to any WebDAV-compatible cloud provider
  - Supports Nextcloud, ownCloud, Yandex.Disk, and more
  - Demo mode with sample photos when WebDAV is not configured

- **🔒 Security**
  - Password-protected access via `WEBDAV_LOGON_PASSWORD`
  - Environment variables for sensitive data
  - Leave-page confirmation dialog
  - Session persists within browser tab

- **🎨 UI / UX**
  - Dark / light theme toggle
  - WebDAV connection indicator in the header (green when the server responds successfully, red on load errors, gray for demo mode, pulse while loading)
  - Film grain / scanline-style overlay on the page background; stronger grain on light theme for a tactile paper feel
  - Smooth scroll-to-top button (~1s animation)
  - Batch thumbnail generation with progress indicator
  - Responsive design for mobile and desktop
  - Framer Motion animations
  - **Bento** layout uses a four-column rhythm on large screens (dense CSS grid) for clearer alignment; narrower breakpoints fall back to 6- and 3-column patterns
  - **Minimal** layout lists each file with a thumbnail next to the name
  - **Album** layout uses tighter spacing below the global header for a print-style flow

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- WebDAV-compatible cloud storage (Nextcloud, ownCloud, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/frostiks777/1pgWebGallery.git
   cd 1pgWebGallery
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Edit `.env.local` with your credentials**
   ```env
   WEBDAV_URL=https://your-cloud.com/remote.php/dav/files/username/
   WEBDAV_USERNAME=your-username
   WEBDAV_PASSWORD=your-password-or-app-token
   PHOTOS_DIR=/Photos
   WEBDAV_LOGON_PASSWORD=your-gallery-access-password
   ```

5. **Start the development server**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

6. Open `http://localhost:3000` in your browser

## ⚙️ Configuration

### WebDAV Setup

#### Nextcloud
```
WEBDAV_URL=https://your-nextcloud.com/remote.php/dav/files/USERNAME/
```
> 💡 Use an App Password instead of your main password (Settings → Security → Create new App Password)

#### ownCloud
```
WEBDAV_URL=https://your-owncloud.com/remote.php/dav/files/USERNAME/
```

#### Yandex.Disk
```
WEBDAV_URL=https://webdav.yandex.com/
```

#### Box.com
```
WEBDAV_URL=https://dav.box.com/dav/
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `WEBDAV_URL` | Full WebDAV endpoint URL | ✅ Yes |
| `WEBDAV_USERNAME` | Your WebDAV username | ✅ Yes |
| `WEBDAV_PASSWORD` | Password or App Token | ✅ Yes |
| `PHOTOS_DIR` | Directory path for photos | No (default: `/Photos`) |
| `WEBDAV_LOGON_PASSWORD` | Gallery access password | No (gallery is open if not set) |
| `WEBDAV_COLOCATED_CACHE` | Write thumbnails to WebDAV `.thumbs/` folders | No (default: `true`) |
| `COLOCATED_THUMBS_DIR` | Name of the co-located thumbs folder | No (default: `.thumbs`) |
| `CACHE_DIR` | Local disk cache directory | No (default: `/tmp/photo-gallery-cache`) |

## 📁 Project Structure

```
├── .env.example          # Environment template
├── README.md             # This file
├── DEPLOYMENT.md         # Ubuntu Server deployment guide
├── INSTALL.md            # Step-by-step installation guide
├── PERFORMANCE.md        # Performance optimization report
├── MIGRATION.md          # API migration guide
├── CHECKLIST.md          # Post-deployment checklist
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Password authentication
│   │   │   ├── images/         # Unified image API (WebP, Sharp, 3 sizes)
│   │   │   │   └── generate/   # Batch thumbnail generation
│   │   │   ├── folders/        # WebDAV folder listing
│   │   │   ├── photos/         # Photo metadata
│   │   │   │   └── delete/     # Photo deletion
│   │   │   ├── hidden/         # Hidden photos management
│   │   │   ├── panoramas/      # Panorama photos management
│   │   │   ├── covers/         # Folder cover photos management
│   │   │   └── webdav/         # WebDAV connectivity test
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main gallery page (client)
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── gallery/            # Gallery components
│   │   │   ├── AlbumLayout.tsx
│   │   │   ├── BentoLayout.tsx
│   │   │   ├── HoneycombLayout.tsx
│   │   │   ├── Lightbox.tsx
│   │   │   ├── MasonryLayout.tsx
│   │   │   ├── MinimalismLayout.tsx
│   │   │   ├── PhotoCard.tsx
│   │   │   ├── WaveLayout.tsx
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── ui/                 # shadcn/ui components
│   └── lib/
│       ├── auth.ts             # Authentication utilities
│       ├── dir-meta.ts         # Directory metadata (hidden, panoramas, covers)
│       ├── utils.ts            # Utility functions
│       └── webdav.ts           # WebDAV client
├── public/                     # Static assets & demo photos
└── package.json
```

## 🎨 Gallery Layouts

### Grid Layouts

#### Masonry
Classic Pinterest-style layout with staggered heights. Perfect for photos of varying aspect ratios.

#### Bento Grid
Modern asymmetric grid inspired by Apple's bento boxes. Features varying card sizes for visual interest.

### Artistic Layouts

#### Honeycomb
Unique hexagonal layout that creates a striking visual pattern. Great for portfolios.

#### Wave
Dynamic wavy arrangement with varying rotations and heights. Creates an artistic, playful feel.

### Style Layouts

#### Minimalism (Минимализм) ➖
Clean list layout:
- Thumbnail, filename, and synthetic metadata per row
- Monospace typography; row actions on hover

#### Album
Print-inspired photo album layout:
- Warm paper and linen background tones
- White mat / print frames for each photo
- Repeating 7-tile pattern: one featured 2×2 tile among six standard tiles
- Clean lowercase captions beneath each photo

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Already excluded in `.gitignore`
2. **Use App Passwords** - Most cloud providers support generating app-specific passwords
3. **Set `WEBDAV_LOGON_PASSWORD`** - Protect gallery access with a password
4. **Limit Permissions** - Create a dedicated folder for gallery photos
5. **Use HTTPS** - Always use secure WebDAV endpoints

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **WebDAV**: [webdav](https://github.com/perry-mitchell/webdav-client)
- **Image Optimization**: [Sharp](https://sharp.pixelplumbing.com/)
- **Validation**: [Zod](https://zod.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.dev/)

## 🎨 Image Optimization Features

- **Automatic WebP conversion** for 25-35% smaller file sizes
- **Three optimized sizes**:
  - Thumbnail: 400×400px (for gallery grid)
  - Medium: 1200×1200px (for Lightbox viewing)
  - Full: 2400×2400px (for downloads)
- **Two-level caching**: local disk + co-located WebDAV `.thumbs/`
- **Prefetching** adjacent images in Lightbox for instant navigation
- **Lazy loading** with async decoding for smooth performance
- **Batch generation** button for pre-generating all thumbnails

## 📝 Scripts

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run lint     # Run ESLint
bun run start    # Start production server
```

## 📊 Performance Benchmarks

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Image Size | 2-5 MB | 500KB-1.5MB | **70-75%** ↓ |
| Load Time (100 photos) | 15-20s | 3-5s | **75%** ↓ |
| Memory Usage | 500 MB | 150 MB | **70%** ↓ |
| Lightbox Navigation | 500-800ms | 50-100ms | **85%** ↓ |

See [PERFORMANCE.md](./PERFORMANCE.md) for complete optimization details.

## 🚀 Deployment

Detailed deployment instructions for Ubuntu Server are available in [DEPLOYMENT.md](./DEPLOYMENT.md).  
Step-by-step installation guide: [INSTALL.md](./INSTALL.md).

### Quick Deploy

```bash
git clone https://github.com/frostiks777/1pgWebGallery.git
cd 1pgWebGallery

bun install

cp .env.example .env.local
# Edit .env.local with your WebDAV credentials

bun run build
bun run start
```

### After deployment checklist

See [CHECKLIST.md](./CHECKLIST.md) for step-by-step verification guide.

## 📚 Documentation

- **[INSTALL.md](./INSTALL.md)** - Step-by-step installation guide (Ubuntu 22)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Ubuntu Server deployment with Nginx + SSL
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Detailed performance optimization report
- **[MIGRATION.md](./MIGRATION.md)** - API migration guide (old → unified endpoint)
- **[CHECKLIST.md](./CHECKLIST.md)** - Post-deployment verification checklist

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🇷🇺 Краткое описание

**Photo Gallery** — одностраничная веб-галерея фотографий с подключением к облачному хранилищу через WebDAV.

- **6 макетов** отображения: Masonry, Bento, Honeycomb, Wave, Minimalism, Album
- **Лайтбокс** с зумом, навигацией по клавиатуре, полоской миниатюр и скачиванием
- **Управление фото**: скрытие, удаление (с восстановлением), выбор обложек папок, пометка панорам
- **Навигация по папкам** с хлебными крошками и превью-обложками
- **Сортировка** по имени и дате (для фото и папок)
- **Защита паролем** через переменную `WEBDAV_LOGON_PASSWORD`
- **Демо-режим** с примерами фото при отсутствии WebDAV
- **Тёмная / светлая тема**
- **Оптимизация**: WebP через Sharp, двухуровневый кеш, ленивая загрузка, предзагрузка в лайтбоксе
- **Деплой**: Next.js 16 + TypeScript + Tailwind CSS 4 + Bun

Подробнее: [DEPLOYMENT.md](./DEPLOYMENT.md) (развертывание), [INSTALL.md](./INSTALL.md) (установка), [PERFORMANCE.md](./PERFORMANCE.md) (оптимизация).

---

Made with ❤️ using Next.js and Tailwind CSS
