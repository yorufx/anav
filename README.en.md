<h1 align="center">A Navigation</h1>

<p align="center">
  <a href="./README.en.md">English</a> | <a href="./README.md">简体中文</a>
</p>

## Introduction

## Core Features ✨

This is why I developed my own navigation page.

- 🌐 **Intranet Detection** - Ideal for home NAS services, no need to configure two different bookmarks for LAN and tunneled domains
- 👤 **Profiles** - Use different configurations on work and home computers
- 🔍 **Smart Search** - More convenient operations, search or open bookmarks, freely configure various search engines

## More Features

Nothing much to say.

- 🏷️ **Tag System** - Categorize bookmarks with tags, supports drag-and-drop sorting
- 🌓 **Theme Toggle** - Light/dark themes, follows system or manual switch
- 🌍 **Localization** - Supports Chinese and English interfaces
- 📱 **Responsive Design** - Adapts to desktop and mobile devices
- 🖼️ **Background Images** - Upload multiple background images, automatically selects landscape/portrait based on device orientation
- 🚀 **Low Memory Usage** - Build with Rust.

![Memory](./docs/images/2026-01-12-22-41-42.png)

## Development

Create a `.env` file:

```text
VITE_API_URL="http://localhost:33989"
```

Start the backend:

```bash
cargo run
```

Start the frontend:

```bash
bun run dev
```

## Build 🛠

```bash
bun run build
cargo build --release
```

## Installation

### Docker

TODO

## User Guide 📖

### Quick Search

The goal is to access frequently used websites with just `Ctrl + T` + a few letters to filter + `TAB`, without any mouse operation (similar to browser address bar behavior).

#### Default Search Engine

After opening the homepage, the search box is automatically focused. You can type directly and press Enter to search:

![Search](./docs/images/2026-01-12-22-08-58.png)

#### Quick Open Bookmarks

Search filters through tags. After selecting a bookmark, press TAB to navigate directly to that webpage:

![Filter](./docs/images/2026-01-12-22-11-06.png)

#### Search with Bookmarks

Bookmarks can be configured with a search template URL for quick search engine selection:

For example, for Baidu Translate, configure the search URL as `https://fanyi.baidu.com/mtpe-individual/transText?query={}`. For bookmarks with a configured search URL, the TAB key no longer navigates directly to the webpage, but uses that bookmark for searching:

![Bookmark Search](./docs/images/2026-01-12-22-17-02.png)

After selecting a search engine with TAB, press TAB again to navigate directly to that webpage; or continue typing and press Enter to search using that bookmark. In this example, it navigates directly to the translation result.

![Bookmark Search](./docs/images/2026-01-12-22-18-56.png)

### Profiles

The purpose is to use different bookmarks on work and personal computers.

![Profiles](./docs/images/2026-01-12-22-25-54.png)

### Intranet Detection

Used for home NAS services, automatically switches between intranet and public domain names.

Add an intranet URL in settings. Each time you open the navigation page, it will automatically detect if that URL is accessible. After successful access, all bookmarks switch to intranet links (if available).

**Note**: Due to browser mixed content restrictions, if the navigation page is deployed under HTTPS, the intranet detection URL also needs to be HTTPS.

![Settings](./docs/images/2026-01-12-22-28-09.png)

#### Intranet Mode

After intranet detection passes, the settings icon in the bottom right corner turns green:

![Intranet Mode](./docs/images/2026-01-12-22-33-42.png)
