# SVGwiz

An open-source cross-platform desktop application powered by the SVGsus library, allowing you to clean, optimize, and transform SVG files.

## Features

- Clean and optimize SVG files
- Convert SVGs to various formats:
  - Cleaned SVG
  - SVG Symbol (for spritesheet use)
  - CSS Background with data URI
  - Pug/Jade Templates
  - Swift Code (UIKit/AppKit)
  - Android Vector Drawable XML
- Batch processing for multiple SVG files
- Live preview
- Customizable output options for each format

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)

### Installation

```bash
# Clone this repository
git clone https://github.com/yourusername/svgwiz.git

# Navigate to the directory
cd svgwiz

# Install dependencies
npm install
# or
yarn install
```

### Running in Development Mode

```bash
npm start
# or
yarn start
```

For debugging, use:

```bash
npm run dev
# or
yarn dev
```

## Building for Distribution

### Building for all platforms

```bash
npm run dist
# or
yarn dist
```

### Building for specific platforms

```bash
# Build for macOS
npm run dist -- --mac

# Build for Windows
npm run dist -- --win

# Build for Linux
npm run dist -- --linux
```

## Distribution Channels

### Homebrew (macOS)

1. Create a Homebrew tap repository
2. Add a cask formula following [Homebrew's documentation](https://docs.brew.sh/Cask-Cookbook)

Example formula:

```ruby
cask "svgwiz" do
  version "0.1.0"
  sha256 "<SHA256_HASH_OF_DMG>"

  url "https://github.com/yourusername/svgwiz/releases/download/v#{version}/SVGwiz-#{version}.dmg"
  name "SVGwiz"
  desc "Clean, optimize and transform your SVGs"
  homepage "https://github.com/yourusername/svgwiz"

  app "SVGwiz.app"
end
```

### Snapcraft (Linux)

1. Install Snapcraft: `sudo snap install snapcraft --classic`
2. Build the snap: `snapcraft`
3. Publish to Snap Store: `snap publish`

For more information, see the [Snapcraft documentation](https://snapcraft.io/docs).

### Flatpak (Linux)

1. Install Flatpak builder: `sudo apt install flatpak-builder`
2. Create a manifest file (see `flatpak/com.example.svgwiz.yml`)
3. Build the Flatpak package: `flatpak-builder --user --install build flatpak/com.example.svgwiz.yml`

For more information, see the [Flatpak documentation](https://docs.flatpak.org/).

## Licensing

SVGwiz supports offline license activation. Licenses are signed using Ed25519 and verified locally.

### Activate a license

1. Launch the app.
2. Click the **License** button in the header (or the **Enter License** button in the CTA bar).
3. Paste your license key in the format `payload.signature` (base64url).
4. Click **Validate & Activate**. On success, your plan is set to `pro` and the CTA bar is hidden.

### Environment variables

- `LICENSE_PUBLIC_KEY_BASE64`: Base64-encoded Ed25519 public key used to verify licenses.
- `STRIPE_PAYMENT_LINK`: Optional. If set, the app can open your purchase link from the CTA button.

You can also set/change these at runtime using the app’s internal controls (IPC via preload), but environment variables are recommended for packaged builds.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [SVGsus](https://github.com/department-stockholm/svgsus) - The core library that powers this application
- [Electron](https://www.electronjs.org/) - The framework used for building the desktop app
- [Department](https://department.se) - The original creators of SVGsus
