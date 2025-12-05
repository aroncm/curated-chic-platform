import base64
import json
import requests

# Get inputs from input_data dictionary
subject = input_data.get('email_subject', input_data.get('subject', 'Unnamed Item'))

# Get attachments list
attachments_raw = input_data.get('email_attachments', input_data.get('attachments', []))

# Ensure it's a list
if isinstance(attachments_raw, str):
    try:
        attachments_raw = json.loads(attachments_raw)
    except:
        attachments_raw = []

if not isinstance(attachments_raw, list):
    attachments_raw = [attachments_raw] if attachments_raw else []

# Initialize images array
images = []

# Process each attachment
for i, attachment in enumerate(attachments_raw[:5]):  # Max 5 images
    try:
        if not isinstance(attachment, dict):
            continue

        # Get filename and mimetype
        filename = attachment.get('filename', attachment.get('name', f'image{i+1}.jpg'))
        mimetype = attachment.get('mimetype', attachment.get('content_type', 'image/jpeg'))

        # Zapier Email Parser uses 'hydrate' URLs for file content
        file_url = attachment.get('hydrate') or attachment.get('url') or attachment.get('file')

        if not file_url:
            continue

        # If it's a hydration URL, fetch the file
        if isinstance(file_url, str) and file_url.startswith('http'):
            # Fetch the file content
            response = requests.get(file_url, timeout=30)

            if response.status_code == 200:
                # Convert to base64
                file_bytes = response.content
                base64_data = base64.b64encode(file_bytes).decode('utf-8')

                images.append({
                    'filename': filename,
                    'data': base64_data,
                    'mimeType': mimetype
                })
        else:
            # If it's already base64 data
            file_content = str(file_url)
            if ',' in file_content:
                file_content = file_content.split(',', 1)[1]
            file_content = file_content.replace('\n', '').replace('\r', '').strip()

            if file_content:
                images.append({
                    'filename': filename,
                    'data': file_content,
                    'mimeType': mimetype
                })

    except Exception as e:
        # Skip this attachment if there's an error
        continue

return {
    'title': subject.strip() if subject else 'Unnamed Item',
    'images': images,
    'image_count': len(images)
}
