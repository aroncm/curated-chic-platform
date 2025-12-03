# Zapier Email Integration Setup Guide

This guide explains how to set up the email-to-database ingestion workflow using Zapier.

## Overview

This integration allows you to send emails with item names and images to a dedicated Zapier email address, which automatically:
1. Parses the email content
2. Creates an item in your Supabase database
3. Uploads images to Supabase Storage
4. Makes the item ready for AI analysis

## Prerequisites

- Zapier account (Free or paid plan)
- Access to your VintageLab deployment
- Supabase project with admin access
- OpenAI API key configured (for AI analysis)

## Step 1: Configure Environment Variables

Add these variables to your `.env.local` file (and Vercel if deployed):

```bash
# Generate a secure random API key
# Run: openssl rand -hex 32
ZAPIER_API_KEY=your_secure_64_character_key_here

# Email of the user that will own imported items
ZAPIER_IMPORT_USER_EMAIL=imports@yourdomain.com

# Required for admin operations (find in Supabase Dashboard > Project Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Generate API Key

On Mac/Linux:
```bash
openssl rand -hex 32
```

On Windows (PowerShell):
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## Step 2: Create Import User in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter the email from `ZAPIER_IMPORT_USER_EMAIL` (e.g., `imports@yourdomain.com`)
5. Set a secure password (you won't need to log in with this account)
6. Confirm the user is created

## Step 3: Test the Endpoint Locally (Optional)

Before setting up Zapier, test the endpoint with curl:

```bash
curl -X POST http://localhost:3000/api/items/ingest \
  -H "Authorization: Bearer YOUR_ZAPIER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Vintage Glass",
    "images": [
      {
        "filename": "test.jpg",
        "data": "/9j/4AAQSkZJRg...",
        "mimeType": "image/jpeg"
      }
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "item_id": "uuid-here",
  "title": "Test Vintage Glass",
  "images_uploaded": 1,
  "images_failed": 0,
  "message": "Item created successfully and ready for analysis"
}
```

## Step 4: Create Zapier Workflow

### 4.1 Create New Zap

1. Go to [Zapier](https://zapier.com) and click **Create Zap**
2. Name it: "Email to VintageLab Import"

### 4.2 Set Up Trigger

1. **App**: Search for **Email Parser by Zapier**
2. **Event**: "New Email"
3. Click **Continue**
4. **Mailbox Setup**:
   - You'll get a custom email address like: `parser-123abc@robot.zapier.com`
   - Save this email address - you'll send item emails here
5. Send a test email with:
   - **Subject**: Name of the item (e.g., "Vintage Crystal Decanter")
   - **Attachments**: 1-5 images of the item
6. Zapier will receive the email - click **Test trigger**
7. Select the test email and click **Continue**

### 4.3 Set Up Action - Parse Email

1. **App**: Continue with **Email Parser by Zapier**
2. **Action**: "Parse Email"
3. **Configure**:
   - **Subject**: Map to "Subject" from trigger
   - **Body**: Map to "Body" from trigger (optional)
   - **Attachments**: Map to "Attachments" from trigger
4. Click **Test action** to verify parsing
5. Click **Continue**

### 4.4 Set Up Action - Transform Images (Code Step)

1. Click **+** to add another action
2. **App**: Search for **Code by Zapier**
3. **Event**: "Run Python"
4. **Configure**:
   - **Input Data**:
     - `subject`: Map to parsed subject from previous step
     - `attachments`: Map to attachments array from previous step
   - **Code**:

```python
import base64
import json

# Get inputs
subject = input_data.get('subject', 'Unnamed Item')
attachments = input_data.get('attachments', [])

# Transform attachments to base64
images = []
for i, attachment in enumerate(attachments[:5]):  # Max 5 images
    # Zapier provides base64 already in some cases
    file_content = attachment.get('file', '')
    filename = attachment.get('filename', f'image{i}.jpg')

    # Remove data URI prefix if present
    if ',' in file_content:
        file_content = file_content.split(',', 1)[1]

    images.append({
        'filename': filename,
        'data': file_content,
        'mimeType': attachment.get('mimetype', 'image/jpeg')
    })

# Return formatted data
return {
    'title': subject.strip(),
    'images': images
}
```

5. Click **Test action** to verify
6. Click **Continue**

### 4.5 Set Up Action - POST to VintageLab

1. Click **+** to add final action
2. **App**: Search for **Webhooks by Zapier**
3. **Event**: "POST"
4. **Configure**:
   - **URL**: `https://your-domain.vercel.app/api/items/ingest` (or `http://localhost:3000/api/items/ingest` for testing)
   - **Payload Type**: "json"
   - **Data**:
     ```json
     {
       "title": [Map to "title" from Code step],
       "images": [Map to "images" from Code step]
     }
     ```
   - **Headers**:
     - `Authorization`: `Bearer YOUR_ZAPIER_API_KEY`
     - `Content-Type`: `application/json`
   - **Wrap Request in Array**: No
5. Click **Test action**
6. Verify the item appears in your VintageLab dashboard
7. Click **Continue**

### 4.6 Publish Zap

1. Review all steps
2. Click **Publish Zap**
3. Turn the Zap **ON**

## Step 5: Usage

### Sending Items via Email

1. Compose new email
2. **To**: `parser-123abc@robot.zapier.com` (your custom Zapier address)
3. **Subject**: Item name (e.g., "Vintage Blue Glass Vase")
4. **Attachments**: Add 1-5 images of the item
5. Send email

### What Happens Next

1. Zapier receives email within ~1 minute
2. Email is parsed for subject and images
3. Item is created in your database
4. Images are uploaded to Supabase Storage
5. Item appears in your VintageLab dashboard with status "New"
6. Navigate to the item and click "Analyze This Item" to trigger AI identification

## Troubleshooting

### Error: "Unauthorized: Invalid or missing API key"

- Check that `ZAPIER_API_KEY` is set in your environment
- Verify the key in Zapier webhook headers matches exactly
- Ensure the Authorization header format is: `Bearer YOUR_KEY`

### Error: "Import user not found"

- Verify the user exists in Supabase Auth with the email from `ZAPIER_IMPORT_USER_EMAIL`
- Check that the email address matches exactly (including case)

### Error: "Storage bucket not configured"

- Ensure the `item-images` bucket exists in Supabase Storage
- Verify the bucket has public read access
- Check that `SUPABASE_SERVICE_ROLE_KEY` is correct

### Error: "All image uploads failed"

- Check image file sizes (Zapier has ~6MB limit per attachment)
- Verify base64 encoding is correct
- Check Supabase Storage quotas

### Images not appearing

- Check Supabase Storage > item-images bucket for uploaded files
- Verify `item_images` table has records
- Check browser console for CORS errors

## Advanced Configuration

### Custom Owner Assignment

To assign items to specific users based on sender email, modify the ingest endpoint:

1. Update `IngestRequest` type to accept `owner_email`
2. Modify `getImportUserId()` to look up user by email
3. Pass sender email from Zapier trigger

### Auto-Trigger AI Analysis

To automatically trigger analysis (costs OpenAI credits), modify the `triggerAnalysis()` function in the ingest endpoint to call the analysis logic directly instead of just marking as `idle`.

### Rate Limiting

Consider adding rate limiting to prevent abuse:
- Use Vercel's rate limiting middleware
- Add daily/hourly limits per API key
- Monitor usage in Supabase logs

## Monitoring

### Check Zapier History

1. Go to Zapier Dashboard
2. Click your Zap
3. View **Zap History** tab
4. See success/failure logs for each run

### Check VintageLab Logs

If deployed on Vercel:
1. Go to Vercel Dashboard
2. Select your project
3. Click **Logs** tab
4. Filter by `/api/items/ingest`

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **API**
3. Filter by `items` table operations

## Security Best Practices

1. **Never commit** `.env.local` or expose `ZAPIER_API_KEY`
2. **Rotate API keys** periodically (update in both .env and Zapier)
3. **Monitor usage** to detect unauthorized access
4. **Use HTTPS** in production (Vercel provides this automatically)
5. **Limit Zapier email** to trusted senders only
6. **Review items** regularly to catch any incorrectly parsed data

## Cost Considerations

- **Zapier**: Free plan allows 100 tasks/month; paid plans start at $20/month
- **OpenAI**: AI analysis costs ~$0.05-0.15 per item (depending on image detail)
- **Supabase**: Storage costs ~$0.021/GB/month; database is free up to 500MB

## Support

If you encounter issues:
1. Check Zapier Zap History for errors
2. Review Vercel/Supabase logs
3. Test the endpoint with curl/Postman
4. Verify all environment variables are set correctly
