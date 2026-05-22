#!/bin/bash
set -e

echo "🏗️  Building Savanna Finance Landing Page for production..."

# Override NEXT_PUBLIC_APP_URL for production build
export NEXT_PUBLIC_APP_URL="https://savanna.finance"

# Clean previous build
rm -rf out .next

# Build static export
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Output size:"
du -sh out/
echo ""
echo "📁 Static files ready in ./out/"
echo ""
echo "🚀 Deploy commands:"
echo "   Vercel:         npx vercel --prod"
echo "   Netlify:        npx netlify deploy --prod --dir=out"
echo "   Cloudflare:     npx wrangler pages deploy out"
echo "   Manual:         rsync -avz out/ user@server:/var/www/savanna/"
