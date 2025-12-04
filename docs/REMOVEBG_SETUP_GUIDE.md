# Remove.bg Setup Guide

This guide will help you set up Remove.bg for AI-powered background removal and clean white backgrounds for your product photos.

## Why Remove.bg?

Remove.bg is the industry standard for e-commerce product image editing:
- **Used by**: Shopify, eBay sellers, professional product photographers
- **Quality**: Professional-grade background removal with clean edges
- **White backgrounds**: Perfect for marketplace listings
- **Simple integration**: RESTful API, no complex setup
- **Free tier**: 50 images per month
- **Pricing**: $0.02 per image after free tier

## Step 1: Sign Up for Remove.bg

1. Go to [https://www.remove.bg/users/sign_up](https://www.remove.bg/users/sign_up)
2. Create a free account using email
3. Verify your email address

## Step 2: Get Your API Key

1. Go to [https://www.remove.bg/api](https://www.remove.bg/api)
2. Click "Get API Key" button
3. Your API key will be displayed - **copy it immediately**
4. Format: `xxxxxxxxxxxxxxxxxxxxx` (22 characters)

## Step 3: Add API Key to Your Application

### For Local Development (.env.local)

1. Open `.env.local` in your project root
2. Find the line that says:
   ```bash
   REMOVEBG_API_KEY=your_removebg_api_key_here
   ```
3. Replace `your_removebg_api_key_here` with your actual API key:
   ```bash
   REMOVEBG_API_KEY=xxxxxxxxxxxxxxxxxxxxx
   ```

### For Vercel (Production)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add a new variable:
   - **Name**: `REMOVEBG_API_KEY`
   - **Value**: `xxxxxxxxxxxxxxxxxxxxx` (your API key)
4. Click "Save"
5. **Redeploy your application**

## Step 4: Test the Integration

1. Start your local dev server: `npm run dev`
2. Navigate to an item's Listing Management page
3. Click "Edit Image" on any product photo
4. Click "Remove Background"
5. Wait ~3-5 seconds
6. You should see a clean white background!

## Features

Remove.bg automatically:
- Detects the main subject in your image
- Removes the background completely
- Replaces it with a solid white background (hex: #FFFFFF)
- Maintains image quality and edge details
- Optimizes for product photography

## Pricing

- **Free Tier**: 50 images per month
- **Pay-as-you-go**: $0.02 per image
- **Subscriptions available**: For higher volumes

Check your usage at: [https://www.remove.bg/dashboard](https://www.remove.bg/dashboard)

## Troubleshooting

### Error: "REMOVEBG_API_KEY not configured"
- Make sure you added the API key to `.env.local`
- Restart your dev server after adding the key
- For production, check Vercel environment variables

### Error: "Quota exceeded"
- You've used your 50 free images for the month
- Add a payment method at [https://www.remove.bg/api](https://www.remove.bg/api)
- Or wait until next month for quota reset

### Error: "403 Forbidden" or "401 Unauthorized"
- Check that your API key is correct
- Make sure there are no extra spaces in the key
- Verify your account is active

### Poor quality results
- Remove.bg works best with:
  - Clear, well-lit photos
  - Subject distinct from background
  - High-resolution images
- For best results, use images > 1000px width

## Alternative Options

If you need more features or different pricing:
- **Photoshop API**: Adobe's cloud-based editing
- **Clipping Magic**: Interactive background removal
- **Cloudinary**: Media management with background removal
- **ImgIX**: Image processing with AI features

## API Documentation

Full API docs: [https://www.remove.bg/api#remove-background](https://www.remove.bg/api#remove-background)

## Cost Tracking

All background removal costs are tracked in your `ai_usage` table:
- Endpoint: `image_edit`
- Model: `remove.bg`
- Cost: $0.02 per image

Query your usage:
```sql
SELECT SUM(total_cost_usd) as total_spent
FROM ai_usage
WHERE endpoint = 'image_edit';
```

## Security Notes

🔒 **IMPORTANT:**
- Never commit your API key to git
- Add `.env.local` to `.gitignore` (already done)
- Keep your API key secure
- Rotate keys if compromised
- Use separate keys for dev/prod

## Support

- Remove.bg Support: [support@remove.bg](mailto:support@remove.bg)
- API Status: [https://status.remove.bg/](https://status.remove.bg/)
- Community: [https://www.remove.bg/community](https://www.remove.bg/community)
