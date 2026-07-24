# prodrec

Day-rate tracker for freelance contractors. Track working days per project, calculate net profit after tax and fees, export invoices.

**Live:** https://illiatverdun.github.io/prodrec/

## Structure

```
prodrec/
  timetracker.jsx   ← source (edit this)
  build.js          ← compiles JSX → index.html
  package.json      ← dependencies
  index.html        ← compiled output (deploy this)
```

## Local development

```bash
# 1. Clone
git clone https://github.com/illiatverdun/prodrec
cd prodrec

# 2. Install dependencies (one time only)
npm install

# 3. Edit source
# open timetracker.jsx, make changes

# 4. Build
node build.js

# 5. Preview — open index.html in browser
open index.html        # macOS
start index.html       # Windows

# 6. Deploy — commit and push
git add index.html
git commit -m "your message"
git push
# GitHub Pages auto-deploys in ~1 min
```

## Tech stack

- React 18 (inlined UMD, no bundler needed)
- JSX compiled by Babel at build time
- localStorage for data persistence (free tier)
- Supabase + Stripe planned for Pro tier
