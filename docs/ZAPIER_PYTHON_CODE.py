import base64
import json

# Get inputs from input_data dictionary
subject = input_data.get('email_subject', input_data.get('subject', 'Unnamed Item'))

# Zapier Email Parser provides attachments in different ways
# Try multiple keys to find attachments
attachments_raw = (
    input_data.get('email_attachments') or
    input_data.get('attachments') or
    input_data.get('attachment_1') or
    []
)

# Initialize images array
images = []

# Handle single attachment object (Zapier often provides single attachment as dict)
if isinstance(attachments_raw, dict):
    attachments_raw = [attachments_raw]

# Handle string (JSON)
if isinstance(attachments_raw, str):
    try:
        attachments_raw = json.loads(attachments_raw)
    except:
        attachments_raw = []

# Ensure it's a list
if not isinstance(attachments_raw, list):
    attachments_raw = []

# Process attachments
for i, attachment in enumerate(attachments_raw[:5]):  # Max 5 images
    if isinstance(attachment, dict):
        # Get file content - Zapier uses different keys
        file_content = (
            attachment.get('file') or
            attachment.get('content') or
            attachment.get('data') or
            attachment.get('hydrate') or
            ''
        )

        filename = attachment.get('filename', attachment.get('name', f'image{i+1}.jpg'))
        mimetype = attachment.get('mimetype', attachment.get('mime_type', attachment.get('content_type', 'image/jpeg')))

        # If file_content is a URL (hydration link), skip for now
        if isinstance(file_content, str) and file_content.startswith('http'):
            continue

        # Remove data URI prefix if present
        if isinstance(file_content, str) and ',' in file_content:
            file_content = file_content.split(',', 1)[1]

        # Ensure it's a string and clean it
        if isinstance(file_content, str):
            file_content = file_content.replace('\n', '').replace('\r', '').strip()

            if file_content:  # Only add if we have actual data
                images.append({
                    'filename': filename,
                    'data': file_content,
                    'mimeType': mimetype
                })
    elif isinstance(attachment, str):
        # Direct base64 string
        attachment_clean = attachment.replace('\n', '').replace('\r', '').strip()
        if attachment_clean:
            images.append({
                'filename': f'image{i+1}.jpg',
                'data': attachment_clean,
                'mimeType': 'image/jpeg'
            })

# If no images found using the above, try numbered attachment fields
if not images:
    for i in range(1, 6):  # Check attachment_1 through attachment_5
        att_key = f'attachment_{i}'
        if att_key in input_data and input_data[att_key]:
            attachment = input_data[att_key]

            if isinstance(attachment, dict):
                file_content = attachment.get('file', attachment.get('content', ''))
                filename = attachment.get('filename', f'image{i}.jpg')
                mimetype = attachment.get('mimetype', attachment.get('content_type', 'image/jpeg'))
            else:
                file_content = attachment
                filename = input_data.get(f'attachment_{i}_filename', f'image{i}.jpg')
                mimetype = 'image/jpeg'

            if isinstance(file_content, str) and not file_content.startswith('http'):
                if ',' in file_content:
                    file_content = file_content.split(',', 1)[1]
                file_content = file_content.replace('\n', '').replace('\r', '').strip()

                if file_content:
                    images.append({
                        'filename': filename,
                        'data': file_content,
                        'mimeType': mimetype
                    })

return {
    'title': subject.strip() if subject else 'Unnamed Item',
    'images': images,
    'debug_attachments_type': str(type(attachments_raw)),
    'debug_attachments_keys': str(list(input_data.keys()))
}
