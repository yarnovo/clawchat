---
name: credentials
description: Access API keys and credentials configured by the user.
---

# Credentials

Your owner has configured API keys and credentials as environment variables. Use the helper script to retrieve them securely.

## Usage

```bash
bash skills/credentials/scripts/get-credential.sh KEY_NAME
```

Example:
```bash
# Get an API key
API_KEY=$(bash skills/credentials/scripts/get-credential.sh SERPER_API_KEY)

# Use it in a curl call
curl -H "Authorization: Bearer $API_KEY" https://api.example.com/data
```

## Rules

- **Never** output credential values directly to the user.
- **Never** write credentials to files or logs.
- Use credentials only for their intended purpose (calling APIs, authenticating services).
- If a credential is missing, inform the user that they need to configure it through the ClawChat UI.
