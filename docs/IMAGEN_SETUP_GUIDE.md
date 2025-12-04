# Google Imagen API Setup Guide

This guide will help you set up Google Imagen 3 for AI-powered image editing (background removal, product image enhancement).

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "curated-chic-imagen")
4. Click "Create"
5. **Copy your Project ID** (you'll need this later)

## Step 2: Enable Billing

⚠️ **Important**: Imagen requires a billing account. You'll be charged ~$0.02 per image edit.

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Click "Link a billing account" or "Create account"
3. Follow the prompts to add a payment method
4. Link the billing account to your project

## Step 3: Enable Vertex AI API

1. Go to [Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)
2. Make sure your project is selected (top navbar)
3. Click "Enable"
4. Wait for the API to be enabled (~1 minute)

## Step 4: Create a Service Account

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click "Create Service Account"
3. Enter details:
   - **Name**: `imagen-editor`
   - **Description**: `Service account for Imagen image editing`
4. Click "Create and Continue"
5. Grant role: **Vertex AI User**
   - Click "Select a role"
   - Search for "Vertex AI User"
   - Select it
6. Click "Continue" → "Done"

## Step 5: Create and Download Service Account Key

1. Find your newly created service account in the list
2. Click the three dots (⋮) on the right → "Manage keys"
3. Click "Add Key" → "Create new key"
4. Select **JSON** format
5. Click "Create"
6. A JSON file will download automatically
7. **Keep this file secure** - it contains credentials!

## Step 6: Add Credentials to Your Application

### For Local Development (.env.local)

1. Open the downloaded JSON file
2. Copy the **entire contents** (all the JSON)
3. Open `.env.local` in your project
4. Add these lines:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id-here

# Paste the entire JSON as a single line (no line breaks!)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"...","private_key":"..."}
```

**Example:**
```bash
GOOGLE_CLOUD_PROJECT=curated-chic-imagen

GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"curated-chic-imagen","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"imagen-editor@curated-chic-imagen.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/imagen-editor%40curated-chic-imagen.iam.gserviceaccount.com"}
```

### For Vercel (Production)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add two variables:

**Variable 1:**
- Name: `GOOGLE_CLOUD_PROJECT`
- Value: `your-project-id-here`

**Variable 2:**
- Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Value: (paste the entire JSON file contents as a single line)

4. Click "Save"
5. **Redeploy your application**

## Step 7: Test the Integration

1. Start your local dev server: `npm run dev`
2. Navigate to an item detail page
3. Click "Edit Image" on any product image
4. Click "Remove Background"
5. Wait ~10-15 seconds
6. You should see the edited image with a clean white background!

## Troubleshooting

### Error: "GOOGLE_CLOUD_PROJECT not configured"
- Make sure you added the environment variable
- Restart your dev server after adding `.env.local` variables

### Error: "Permission denied" or "403 Forbidden"
- Verify your service account has "Vertex AI User" role
- Check that Vertex AI API is enabled for your project

### Error: "Quota exceeded"
- You've hit the free tier limit
- Check your [Vertex AI quotas](https://console.cloud.google.com/iam-admin/quotas)
- Imagen has generous limits (1000 requests/minute)

### Error: "Billing not enabled"
- Imagen requires an active billing account
- Go to [Billing](https://console.cloud.google.com/billing) and set it up

### JSON Parsing Error
- Make sure `GOOGLE_APPLICATION_CREDENTIALS_JSON` is valid JSON
- No line breaks in the environment variable
- All quotes properly escaped

## Cost Estimation

- **Imagen 3**: ~$0.02 per image edit
- **Example**: 100 product images = $2.00
- Costs are tracked in your `ai_usage` table

## Security Notes

🔒 **IMPORTANT:**
- Never commit your service account JSON to git
- Add `.env.local` to `.gitignore` (already done)
- Keep your credentials secure
- Rotate keys periodically for security
- Use separate service accounts for dev/prod

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Imagen API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)
- [Google Cloud Pricing](https://cloud.google.com/vertex-ai/pricing)
