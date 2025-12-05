import json
import base64
import requests

# Get subject/title and sender email
subject = input_data.get('email_subject', 'Unnamed Item')
from_email = input_data.get('from_email', None)

# Initialize images array
images = []

# Process up to 5 attachments (attachment_1 through attachment_5)
for i in range(1, 6):
    att_key = f'attachment_{i}'

    if att_key not in input_data:
        continue

    attachment = input_data[att_key]

    if not attachment:
        continue

    # If it's a URL (Zapier hydration URL)
    if isinstance(attachment, str) and attachment.startswith('http'):
        # For the FIRST image, fetch immediately and convert to base64
        # This guarantees at least one image will work
        if i == 1:
            try:
                response = requests.get(attachment, timeout=10)
                if response.status_code == 200 and len(response.content) > 0:
                    # Convert to base64
                    base64_data = base64.b64encode(response.content).decode('utf-8')
                    images.append({
                        'filename': f'image{i}.jpg',
                        'data': base64_data,  # Send as base64
                        'mimeType': 'image/jpeg'
                    })
                else:
                    # Fallback to URL if fetch fails
                    images.append({
                        'filename': f'image{i}.jpg',
                        'url': attachment,
                        'mimeType': 'image/jpeg'
                    })
            except:
                # Fallback to URL if fetch fails
                images.append({
                    'filename': f'image{i}.jpg',
                    'url': attachment,
                    'mimeType': 'image/jpeg'
                })
        else:
            # For images 2-5, send as URLs (same as before)
            images.append({
                'filename': f'image{i}.jpg',
                'url': attachment,
                'mimeType': 'image/jpeg'
            })

# Create the payload object
payload = {
    'title': subject.strip() if subject else 'Unnamed Item',
    'images': images,
    'owner_email': from_email
}

# Return JSON string
return {
    'json_payload': json.dumps(payload)
}
