import base64
import json
import requests

# Get subject/title
subject = input_data.get('email_subject', input_data.get('subject', 'Unnamed Item'))

# Initialize images array
images = []

# Process up to 5 individual attachments (attachment_1, attachment_2, etc.)
for i in range(1, 6):
    att_key = f'attachment_{i}'
    filename_key = f'attachment_{i}_filename'

    if att_key not in input_data:
        continue

    attachment = input_data[att_key]
    if not attachment:
        continue

    # Get filename (fallback to generic name)
    filename = input_data.get(filename_key, f'image{i}.jpg')

    try:
        # Handle different attachment formats
        if isinstance(attachment, dict):
            # Dictionary format - check for hydration URL or file content
            file_url = attachment.get('hydrate') or attachment.get('url') or attachment.get('file')

            if file_url and isinstance(file_url, str) and file_url.startswith('http'):
                # Fetch from URL
                response = requests.get(file_url, timeout=30)
                if response.status_code == 200:
                    base64_data = base64.b64encode(response.content).decode('utf-8')

                    # Determine mimetype
                    content_type = response.headers.get('Content-Type', 'image/jpeg')

                    images.append({
                        'filename': filename,
                        'data': base64_data,
                        'mimeType': content_type
                    })
            elif 'content' in attachment or 'data' in attachment:
                # Direct base64 data
                file_content = attachment.get('content') or attachment.get('data')
                if file_content:
                    if ',' in file_content:
                        file_content = file_content.split(',', 1)[1]
                    file_content = file_content.replace('\n', '').replace('\r', '').strip()

                    images.append({
                        'filename': filename,
                        'data': file_content,
                        'mimeType': attachment.get('mimetype', 'image/jpeg')
                    })

        elif isinstance(attachment, str):
            # String format - could be URL or base64
            if attachment.startswith('http'):
                # Fetch from URL
                response = requests.get(attachment, timeout=30)
                if response.status_code == 200:
                    base64_data = base64.b64encode(response.content).decode('utf-8')
                    content_type = response.headers.get('Content-Type', 'image/jpeg')

                    images.append({
                        'filename': filename,
                        'data': base64_data,
                        'mimeType': content_type
                    })
            else:
                # Assume it's base64 data
                file_content = attachment
                if ',' in file_content:
                    file_content = file_content.split(',', 1)[1]
                file_content = file_content.replace('\n', '').replace('\r', '').strip()

                if file_content:
                    images.append({
                        'filename': filename,
                        'data': file_content,
                        'mimeType': 'image/jpeg'
                    })

    except Exception as e:
        # Skip this attachment if there's an error
        continue

return {
    'title': subject.strip() if subject else 'Unnamed Item',
    'images': images,
    'image_count': len(images)
}
