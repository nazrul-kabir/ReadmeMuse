# Deployment Guide

This guide covers deploying ReadmeMuse to various platforms.

## Prerequisites

Before deploying, you need to:

1. **Create a GitHub App**
   - Go to GitHub Settings → Developer settings → GitHub Apps
   - Click "New GitHub App"
   - Fill in basic information:
     - Name: ReadmeMuse (or your custom name)
     - Homepage URL: Your deployment URL
     - Webhook URL: Your deployment URL + `/api/github/webhooks`
   - Set permissions:
     - Repository contents: Read
     - Pull requests: Read & Write
     - Issues: Read & Write
   - Subscribe to events:
     - Pull request
   - Generate a private key and save it securely
   - Note down your App ID

2. **Install the App**
   - Install the GitHub App on the repositories you want to monitor

## Environment Variables

All deployment methods require these environment variables:

```bash
APP_ID=your_github_app_id
PRIVATE_KEY_PATH=/path/to/private-key.pem
# OR provide the key directly
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
WEBHOOK_SECRET=your_webhook_secret
```

## Deployment Options

### Option 1: Heroku

1. Create a new Heroku app:
   ```bash
   heroku create your-readmemuse-app
   ```

2. Set environment variables:
   ```bash
   heroku config:set APP_ID=your_app_id
   heroku config:set WEBHOOK_SECRET=your_webhook_secret
   heroku config:set PRIVATE_KEY="$(cat private-key.pem)"
   ```

3. Deploy:
   ```bash
   git push heroku main
   ```

### Option 2: Docker

1. Build the Docker image:
   ```bash
   docker build -t readmemuse .
   ```

2. Run the container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e APP_ID=your_app_id \
     -e WEBHOOK_SECRET=your_webhook_secret \
     -e PRIVATE_KEY="$(cat private-key.pem)" \
     readmemuse
   ```

### Option 3: Node.js Server

1. Clone and build:
   ```bash
   git clone https://github.com/nazrul-kabir/ReadmeMuse.git
   cd ReadmeMuse
   npm install
   npm run build
   ```

2. Set environment variables (create `.env` file):
   ```bash
   APP_ID=your_app_id
   WEBHOOK_SECRET=your_webhook_secret
   PRIVATE_KEY_PATH=/path/to/private-key.pem
   ```

3. Start the app:
   ```bash
   npm start
   ```

4. Use a process manager like PM2 for production:
   ```bash
   npm install -g pm2
   pm2 start npm --name "readmemuse" -- start
   pm2 save
   pm2 startup
   ```

### Option 4: Serverless (AWS Lambda, Google Cloud Functions)

ReadmeMuse can be deployed to serverless platforms with some modifications:

1. Use Probot's serverless adapter
2. Configure cold start optimization
3. Ensure private key is securely stored (e.g., AWS Secrets Manager)

Refer to [Probot's deployment documentation](https://probot.github.io/docs/deployment/) for detailed serverless setup.

## Webhook Configuration

After deployment, update your GitHub App settings:

1. Set Webhook URL to: `https://your-deployment-url/api/github/webhooks`
2. Ensure webhook secret matches your `WEBHOOK_SECRET` environment variable
3. Test the webhook by opening a test PR

## Monitoring and Logs

- Check application logs for webhook events and errors
- Monitor GitHub App installation events
- Set up alerts for failed webhook deliveries

## Security Best Practices

1. **Never commit private keys** to version control
2. **Use environment variables** for all secrets
3. **Enable webhook secret** verification
4. **Use HTTPS** for all webhook URLs
5. **Rotate private keys** periodically
6. **Monitor app permissions** and access logs

## Troubleshooting

### Webhooks not received

- Verify webhook URL is correct and accessible
- Check webhook secret matches
- Review GitHub webhook delivery logs
- Ensure app is installed on the repository

### Permission errors

- Verify app has correct permissions
- Re-install the app if permissions were changed
- Check installation access to specific repositories

### Build failures

- Ensure all dependencies are installed
- Check Node.js version compatibility (requires Node 18+)
- Verify TypeScript compiles successfully

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review Probot documentation
