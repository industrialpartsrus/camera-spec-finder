# Logo Setup for Watermarks

## Instructions

Place your company logo here as: **logo.png**

### Requirements
- **Format**: PNG with transparency
- **Recommended size**: 500-1000px wide
- **Position**: Will appear in top-left corner of photos
- **Scaling**: Automatically resized to ~15% of photo width
- **Opacity**: Applied at 85% transparency

### After Upload

**IMPORTANT**: After adding logo.png to this directory, you must:

1. Commit the file to git:
   ```bash
   git add public/watermarks/logo.png
   git commit -m "Add company logo for watermarks"
   ```

2. Push to deploy:
   ```bash
   git push origin main
   ```

Vercel will automatically redeploy and include your logo. The watermark system will work without a logo (contact info only), but for best results, upload your logo and redeploy.

### Testing

After deployment, watermarks are applied automatically when publishing listings (if enabled). The system caches watermarked versions in Firebase Storage for fast repeat publishes.
