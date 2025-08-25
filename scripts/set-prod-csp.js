const fs = require('fs');
const path = require('path');

// Adjusted for Packaging Option A: renderer/dist
const html = path.join(__dirname, '../renderer/dist/index.html');
const strict = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com https://*.stripe.com;";

try {
  let s = fs.readFileSync(html, 'utf8');
  if (s.includes('http-equiv="Content-Security-Policy"')) {
    s = s.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/,
      `<meta http-equiv="Content-Security-Policy" content="${strict}">`);
  } else {
    s = s.replace(/<head>/i, `<head>\n  <meta http-equiv="Content-Security-Policy" content="${strict}">`);
  }
  fs.writeFileSync(html, s);
  console.log('[SVGwiz] CSP hardened for production at', html);
} catch (e) {
  console.error('[SVGwiz] Failed to set production CSP:', e.message);
  process.exitCode = 0; // do not fail the build if missing (e.g., dev runs)
}
