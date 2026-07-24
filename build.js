const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

console.log('Building prodrec...');

// Read React UMD bundles (installed via npm)
const reactSrc = fs.readFileSync('./node_modules/react/umd/react.production.min.js', 'utf-8');
const reactDomSrc = fs.readFileSync('./node_modules/react-dom/umd/react-dom.production.min.js', 'utf-8');

// Read source
let jsx = fs.readFileSync('./timetracker.jsx', 'utf-8');

// Strip imports — React/ReactDOM come from inlined UMD
jsx = jsx.replace(/^import React.*?from 'react';\n/gm, '');
jsx = jsx.replace(/^import \{.*?\} from 'lucide-react';\n/gm, '');
jsx = jsx.replace('export default function TimeTracker()', 'function TimeTracker()');

// Inline icon components (no lucide-react dependency needed in browser)
const prelude = `
const { useState, useEffect, useRef } = React;

const ChevronLeft = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);
const ChevronRight = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);
const X = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
`;

const renderCall = `
const __root = ReactDOM.createRoot(document.getElementById('root'));
__root.render(<TimeTracker />);
`;

// Compile JSX → plain JS
let compiled;
try {
  const result = babel.transformSync(prelude + '\n' + jsx + '\n' + renderCall, {
    presets: [
      ['@babel/preset-react', { runtime: 'classic' }],
      ['@babel/preset-env', {
        targets: { browsers: ['last 2 Chrome versions', 'last 2 Safari versions', 'last 2 Firefox versions'] }
      }]
    ],
    filename: 'timetracker.jsx',
    compact: false,
  });
  compiled = result.code;
  console.log(`✓ Compiled: ${compiled.length} chars`);
} catch (e) {
  console.error('✗ Compile error:', e.message);
  process.exit(1);
}

// Build HTML
const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>prodrec</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%230c0c0d'/%3E%3Ctext y='78' x='10' font-size='80' fill='%235EEAD4' font-family='monospace'%3E%E2%88%91%3C/text%3E%3C/svg%3E">
  <style>
    html, body { margin: 0; padding: 0; background: #0c0c0d; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    #root { min-height: 100vh; }
    #root:empty::before {
      content: "LOADING…";
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      color: rgba(245,245,245,0.4);
      font-family: ui-monospace, "SF Mono", monospace;
      font-size: 11px; letter-spacing: 0.2em;
    }
    .__err__ {
      position: fixed; inset: 20px;
      background: #1a0a0a; color: #FCA5A5;
      border: 1px solid #FCA5A5; padding: 20px;
      font-family: ui-monospace, monospace; font-size: 12px;
      white-space: pre-wrap; overflow: auto;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.addEventListener('error', function(e) {
      const root = document.getElementById('root');
      if (root && !root.children.length) {
        root.innerHTML = '<div class="__err__">ERROR: ' + (e.message || e) + '</div>';
      }
    });
  </script>
  <script>${reactSrc}</script>
  <script>${reactDomSrc}</script>
  <script>
${compiled}
  </script>
</body>
</html>
`;

fs.writeFileSync('./index.html', html);
const kb = (fs.statSync('./index.html').size / 1024).toFixed(1);
console.log(`✓ index.html written: ${kb} KB`);
console.log('Done!');
