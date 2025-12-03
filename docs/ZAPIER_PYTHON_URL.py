import json

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

    # If it's a URL (Zapier hydration URL), pass it to the API
    if isinstance(attachment, str) and attachment.startswith('http'):
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
