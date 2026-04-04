[![deploy](https://github.com/servy-win/servy-win.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/servy-win/servy-win.github.io/actions/workflows/deploy.yml)
[![lighthouse](https://github.com/servy-win/servy-win.github.io/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/servy-win/servy-win.github.io/actions/workflows/lighthouse.yml)
[![test](https://github.com/servy-win/servy-win.github.io/actions/workflows/test.yml/badge.svg)](https://github.com/servy-win/servy-win.github.io/actions/workflows/test.yml)
[![codecov](https://img.shields.io/codecov/c/github/servy-win/servy-win.github.io/main?label=coverage&t=0)](https://codecov.io/gh/servy-win/servy-win.github.io)

<!--
[![security](https://github.com/servy-win/servy-win.github.io/actions/workflows/security.yml/badge.svg)](https://github.com/servy-win/servy-win.github.io/actions/workflows/security.yml)
-->

# Servy Website Source

This repository contains the source code for the official Servy website. The site is a high-performance static application built with modern web standards and a focus on Core Web Vitals.

## Overview

The website serves as the primary documentation and distribution hub for Servy, a Windows service wrapper. It is designed to be lightweight, accessible, and fast, utilizing vanilla JavaScript and optimized build processes.

## Technical Architecture

The project employs several advanced front-end techniques to ensure optimal performance:

* **Build Tooling:** Powered by Vite for fast development and optimized Rollup-based production builds.
* **Lazy-Loaded Analytics:** Google Analytics scripts are deferred until the first user interaction (scroll, mouse move, or touch) to prevent main-thread blocking during initial load.
* **Conditional Fetching:** The statistics page utilizes GitHub API ETags and LocalStorage caching to minimize API calls and respect rate limits.
* **Performance Throttling:** Scroll-based UI updates (such as the back to top button) are throttled using `requestAnimationFrame` to avoid layout thrashing.
* **Resource Preloading:** A custom injection script handles CSS preloading to prevent render-blocking delays.



## Project Structure

* **index.html:** The main landing page.
* **stats/:** Directory containing the GitHub statistics dashboard.
* **contact/:** Directory containing the contact form.
* **src/js/:** Modular JavaScript logic including analytics, utility functions, and API handlers.
* **src/css/:** Component-based CSS utilizing CSS variables for theme management.

## Development

### Prerequisites

* Node.js (Latest LTS recommended)
* npm

### Installation

```bash
npm install
```

### Local Development

To start the development server with Hot Module Replacement:

```bash
npm run dev
```

### Production Build

To generate the optimized static files in the dist directory:

```bash
npm run build
```

The build process includes:
* Minification via Terser.
* CSS minification and prefixing.
* Asset hashing for cache busting.
* HTML validation and linting.

## Code Quality

The codebase enforces strict standards through the following tools:

* **ESLint:** Standardizes JavaScript style and catches potential errors.
* **HTML-Validate:** Ensures semantic and accessible HTML structures.
* **Husky:** Manages git hooks to run linters before commits.

## Deployment

The site is automatically deployed to GitHub Pages via GitHub Actions upon merging to the main branch. The workflow handles the build process and pushes the resulting artifacts to the deployment environment.

## License

This website source code is released under the MIT License. Details can be found in the [LICENSE](https://github.com/servy-win/servy-win.github.io/blob/main/LICENSE.txt) file.
