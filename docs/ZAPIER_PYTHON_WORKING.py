import base64
import requests

# Get subject/title
subject = input_data.get('email_subject', 'Unnamed Item')

# Initialize images array
images = []

# Process attachment_1
if 'attachment_1' in input_data and input_data['attachment_1']:
    attachment = input_data['attachment_1']

    try:
        # Zapier Email Parser provides a hydration URL
        if isinstance(attachment, str) and attachment.startswith('http'):
            # Fetch the file from Zapier's temporary storage
            response = requests.get(attachment, timeout=30)

            if response.status_code == 200:
                # Convert to base64
                base64_data = base64.b64encode(response.content).decode('utf-8')

                # Get content type from response headers
                content_type = response.headers.get('Content-Type', 'image/jpeg')

                # Try to get filename from Content-Disposition header
                filename = 'image1.jpg'
                if 'Content-Disposition' in response.headers:
                    import re
                    match = re.findall(r'filename="?([^"]+)"?', response.headers['Content-Disposition'])
                    if match:
                        filename = match[0]

                images.append({
                    'filename': filename,
                    'data': base64_data,
                    'mimeType': content_type
                })
    except Exception as e:
        pass  # Skip if error

return {
    'title': subject.strip() if subject else 'Unnamed Item',
    'images': images,
    'image_count': len(images)
}
