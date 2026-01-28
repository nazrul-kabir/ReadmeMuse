# ReadmeMuse Quick Start Guide

Get ReadmeMuse running in your repository in 5 minutes!

## Step 1: Create GitHub App

1. Go to https://github.com/settings/apps/new
2. Fill in:
   - **Name**: `ReadmeMuse` (or custom name)
   - **Homepage URL**: `https://github.com/nazrul-kabir/ReadmeMuse`
   - **Webhook URL**: Your server URL + `/api/github/webhooks`
   - **Webhook Secret**: Generate a random string
3. Set permissions:
   - Contents: Read
   - Pull requests: Read & Write
   - Issues: Read & Write
4. Subscribe to events: Pull request
5. Click "Create GitHub App"
6. Generate and download private key
7. Note your App ID

## Step 2: Deploy ReadmeMuse

### Quick Deploy (Heroku)

```bash
# Clone and navigate
git clone https://github.com/nazrul-kabir/ReadmeMuse.git
cd ReadmeMuse

# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set APP_ID=your_app_id
heroku config:set WEBHOOK_SECRET=your_webhook_secret
heroku config:set PRIVATE_KEY="$(cat path/to/private-key.pem)"

# Deploy
git push heroku main
```

### Local Development

```bash
# Clone and install
git clone https://github.com/nazrul-kabir/ReadmeMuse.git
cd ReadmeMuse
npm install
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start
npm start
```

### Docker

```bash
docker build -t readmemuse .
docker run -d -p 3000:3000 \
  -e APP_ID=your_app_id \
  -e WEBHOOK_SECRET=your_secret \
  -e PRIVATE_KEY="$(cat private-key.pem)" \
  readmemuse
```

## Step 3: Install on Repository

1. Go to your GitHub App settings
2. Click "Install App"
3. Select repositories to monitor
4. Click "Install"

## Step 4: Configure Repository

Create `.readmemuse.yml` in your repository root:

```yaml
# Files to watch - when these change, docs are analyzed
watchPaths:
  - "src/**/*"
  - "lib/**/*"
  - "api/**/*"

# Documentation files to update
documentationFiles:
  - "README.md"
  - "docs/**/*.md"
```

## Step 5: Test It!

1. Create a test branch
2. Make changes to watched files (e.g., `src/index.js`)
3. Open a pull request
4. Wait for ReadmeMuse to comment with suggestions! 🎉

## Example Comment

ReadmeMuse will post comments like:

```markdown
## 📝 ReadmeMuse: Documentation Update Suggestions

I've analyzed your PR and found potential documentation updates:

### README.md

**Summary:** Update README.md based on PR changes

**Reasoning:** This PR modifies 3 file(s) with 45 addition(s). 
Documentation should be updated to reflect these changes.

📋 View suggested diff
```

## Troubleshooting

### Not receiving comments?

- Check webhook delivery logs in GitHub App settings
- Verify webhook URL is accessible
- Ensure app is installed on the repository
- Check `.readmemuse.yml` syntax

### Permission errors?

- Verify app has correct permissions
- Re-install the app if permissions changed

### Need help?

- Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup
- Check [Issues](https://github.com/nazrul-kabir/ReadmeMuse/issues)
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development

## What's Next?

- Customize watch paths for your project
- Add more documentation files to monitor
- Star the repo if you find it useful! ⭐
- Share feedback and contribute improvements

Happy documenting! 📝✨
