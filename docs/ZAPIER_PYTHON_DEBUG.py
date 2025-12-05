import base64
import json

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

# Debug: Convert first attachment to string to see its structure
debug_first_attachment = None
if len(attachments_raw) > 0:
    first = attachments_raw[0]
    if isinstance(first, dict):
        debug_first_attachment = {
            'keys': list(first.keys()),
            'filename': first.get('filename'),
            'has_hydrate': 'hydrate' in first,
            'has_url': 'url' in first,
            'has_file': 'file' in first,
            'has_content': 'content' in first,
            'type': str(type(first))
        }
    else:
        debug_first_attachment = f"Type: {type(first)}, Value preview: {str(first)[:100]}"

return {
    'title': subject.strip() if subject else 'Unnamed Item',
    'images': [],
    'debug_attachments_count': len(attachments_raw),
    'debug_first_attachment': debug_first_attachment,
    'debug_all_input_keys': list(input_data.keys())
}
