# PDF Maker

Create A4 PDFs from HTML or public webpages using a React frontend and Laravel API. This repository also includes the original TypeScript PDF-rendering library.

## Features

- Create PDFs from pasted HTML or a public URL.
- Preview HTML edits in the browser and download the resulting PDF.
- Generate PDFs through the Laravel API.
- Use the original Puppeteer-based TypeScript library for URL, HTML, and Handlebars rendering.

## Installation

### Requirements

- PHP 8.2 or later, with `curl`, `dom`, and `mbstring` extensions
- Composer
- Node.js 20.19 or later, and npm

### Setup

Clone the repository and enter its folder:

```powershell
git clone https://github.com/smalpray/pdf-maker.git
cd pdf-maker
```

Install the Laravel and React dependencies:

```powershell
composer install --working-dir=backend
npm --prefix frontend install
```

Create Laravel's environment file and generate its application key:

```powershell
if (-not (Test-Path backend\.env)) {
    Copy-Item backend\.env.example backend\.env
}
php backend\artisan key:generate
```

No database setup is required for the current PDF workflows.

## Run the app

From the repository root, start both the React frontend and Laravel API:

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Press **Ctrl+C** to stop the servers. If the launcher says a server is already running, open the URL—it has detected an existing server.

## API

Send HTML to `POST /api/pdf`:

```json
{
  "mode": "html",
  "html": "<h1>Hello, PDF!</h1>"
}
```

Or send a public URL:

```json
{
  "mode": "url",
  "url": "https://example.com"
}
```

Successful requests return an `application/pdf` file. Invalid requests return a JSON error.

## Original TypeScript library

The `src/` directory contains the original Puppeteer-based library. Example:

```typescript
import { render } from '@hitechline/pdf-maker';

const pdf = await render({
  handler: 'html',
  options: {
    content: '<h1>Hello, PDF!</h1>',
  },
});
```

It also supports URL and Handlebars handlers.

## URL rendering notes

The Laravel web app fetches HTML from a public HTTP or HTTPS URL and converts it to PDF. Local and private addresses are blocked, and redirects are not followed. Since the web app uses Dompdf rather than a full browser, JavaScript-rendered content and remote images or styles may not appear in the PDF.

## Tests and build

Run these commands from the repository root:

```powershell
php backend\artisan test
npm --prefix frontend run build
```
