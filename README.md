# 📸 Photo Gallery - WebDAV Cloud Photos

A beautiful, modern single-page photo gallery application with WebDAV cloud integration. View your photos in stunning collage layouts with smooth animations and an intuitive interface.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## ✨ Features

- **🖼️ Multiple Gallery Layouts**

  **Grid Layouts:**
  - **Masonry** - Pinterest-style staggered grid
  - **Bento Grid** - Modern asymmetric card layout

  **Artistic Layouts:**
  - **Honeycomb** - Unique hexagonal pattern
  - **Wave** - Dynamic wavy arrangement

  **Style Layouts:**
  - **Empire (Ампир)** - Classic luxury style with golden frames, ornate decorations, and elegant typography
  - **Minimalism (Минимализм)** - Clean, pure design with minimal elements and sophisticated simplicity
  - **Mediterranean (Средиземноморское побережье)** - Sea-inspired theme with turquoise accents, shutters, and coastal atmosphere

- **🔍 Full-Featured Lightbox**
  - Zoom in/out functionality
  - Keyboard navigation (← →)
  - Thumbnail strip for quick navigation
  - Photo download option

- **⚡ Smart Sorting**
  - Sort by name (A-Z, Z-A)
  - Sort by date (oldest/newest first)
  - Automatic sorting on load

- **☁️ WebDAV Integration**
  - Connect to any WebDAV-compatible cloud provider
  - Supports Nextcloud, ownCloud, Yandex.Disk, and more
  - Secure credential handling

- **🔒 Security First**
  - Environment variables for sensitive data
  - `.env.example` template provided
  - Credentials excluded from version control

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- WebDAV-compatible cloud storage (Nextcloud, ownCloud, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd photo-gallery
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

4. **Edit `.env.local` with your WebDAV credentials**
   ```env
   WEBDAV_URL=https://your-cloud.com/remote.php/dav/files/username/
   WEBDAV_USERNAME=your-username
   WEBDAV_PASSWORD=your-password-or-app-token
   PHOTOS_DIR=/Photos
   ```

5. **Start the development server**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

6. Open your browser and navigate to the preview panel

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

## 📁 Project Structure

```
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── README.md             # This file
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── photos/   # WebDAV API routes
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Main gallery page
│   │   └── globals.css   # Global styles
│   ├── components/
│   │   ├── gallery/      # Gallery components
│   │   │   ├── BentoLayout.tsx
│   │   │   ├── EmpireLayout.tsx
│   │   │   ├── HoneycombLayout.tsx
│   │   │   ├── Lightbox.tsx
│   │   │   ├── MasonryLayout.tsx
│   │   │   ├── MediterraneanLayout.tsx
│   │   │   ├── MinimalismLayout.tsx
│   │   │   ├── WaveLayout.tsx
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   └── ui/           # shadcn/ui components
│   └── lib/
│       ├── utils.ts      # Utility functions
│       └── webdav.ts     # WebDAV client
├── public/               # Static assets
│   └── demo-photos/      # Demo images for testing
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

#### Empire (Ампир) 👑
Classic luxury style inspired by French Empire aesthetics:
- Elegant golden and bronze frames
- Ornamental decorations (❧ symbols)
- Classic serif typography
- Decorative corners and patterns
- Cream and gold color palette
- Perfect for elegant portfolios and classic art displays

#### Minimalism (Минимализм) ➖
Clean, pure design philosophy:
- Pure white background
- Minimal borders and decorations
- Subtle grayscale effects
- Monospace typography for numbers
- Clean lines and plenty of whitespace
- Perfect for modern photography portfolios

#### Mediterranean (Средиземноморское побережье) 🌴
Sea-inspired coastal theme:
- Turquoise and teal accent colors
- Sandy beige backgrounds
- Decorative window shutters that open on hover
- Flower boxes and sea shell decorations
- Wave animations in the background
- Arch-shaped photo frames
- Perfect for travel and vacation photos

## 🔒 Security Best Practices

1. **Never commit `.env.local`** - Already excluded in `.gitignore`
2. **Use App Passwords** - Most cloud providers support generating app-specific passwords
3. **Limit Permissions** - Create a dedicated folder for gallery photos
4. **Use HTTPS** - Always use secure WebDAV endpoints

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **WebDAV**: [webdav](https://github.com/perry-mitchell/webdav-client)

## 📝 Scripts

```bash
bun run dev      # Start development server
bun run build    # Build for production
bun run lint     # Run ESLint
bun run start    # Start production server
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ using Next.js and Tailwind CSS
