# INCOIS Hazard Dashboard - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the INCOIS Hazard Dashboard to production environments. The application is a React-based web application built with Vite, featuring real-time hazard monitoring, social media integration, and interactive mapping capabilities.

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- Access to required API keys and services
- Deployment platform account (Vercel, Netlify, etc.)

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# ===== REQUIRED FOR PRODUCTION =====

# Mapbox GL JS - Required for map functionality
VITE_MAPBOX_TOKEN=your_production_mapbox_token_here

# Firebase Configuration - Required for database and authentication
VITE_FIREBASE_API_KEY=your_production_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# ===== OPTIONAL FOR PRODUCTION =====

# Google Translate API - For multi-language support
# If not provided, app will fall back to English only
VITE_GOOGLE_TRANSLATE_KEY=your_google_translate_api_key

# Real-time WebSocket and Proxy (if you have a backend server)
# Remove or comment out if not using real-time features
VITE_WS_URL=wss://your-production-server.com/ws
VITE_PROXY_URL=https://your-production-server.com/api

# Hugging Face API (for advanced NLP features)
# If not provided, app will use basic hazard classification
VITE_HF_API_KEY=your_huggingface_api_key
VITE_HF_MULTILINGUAL_ENABLED=false

# ===== PRODUCTION SETTINGS =====

# Disable mock data in production
VITE_USE_MOCK_SOCIAL=false
VITE_USE_MOCK_REPORTS=false

# Enable production optimizations
NODE_ENV=production
```

### Getting API Keys

1. **Mapbox Token**: Sign up at [Mapbox](https://mapbox.com) and create an access token
2. **Firebase**: Create a project at [Firebase Console](https://console.firebase.google.com) and get your config
3. **Google Translate**: Enable the Translation API at [Google Cloud Console](https://console.cloud.google.com)
4. **Hugging Face**: Get API key from [Hugging Face](https://huggingface.co) for advanced NLP features

## Build Process

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Build with Bundle Analysis
```bash
npm run build:analyze
```

This will generate a `bundle-analysis.html` file showing the size breakdown of your application bundles.

## Performance Optimizations

The application includes several production optimizations:

### 1. Code Splitting
- Automatic chunking of vendor libraries
- Separate bundles for Mapbox, Firebase, and charting libraries
- Optimized loading with hash-based file names

### 2. Asset Optimization
- Image compression with vite-plugin-imagemin
- Gzip compression for static assets
- Optimized chunk loading strategy

### 3. Development Code Removal
- Console.log statements removed in production
- Debugger statements removed
- Development-only code excluded

### 4. Caching Strategy
- Long-term caching for vendor chunks
- Efficient cache invalidation for content changes
- Service worker ready configuration

## Deployment Platforms

### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Link your GitHub repository to Vercel
   - Vercel will automatically detect the React + Vite setup

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `NODE_ENV=production` is set

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch
   - Preview deployments available for pull requests

### Netlify Deployment

1. **Connect Repository**
   - Link your GitHub repository to Netlify

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18

3. **Environment Variables**
   - Add all required environment variables
   - Set `NODE_ENV=production`

4. **Deploy**
   - Automatic deployment on push

### Manual Deployment

1. **Build the Application**
   ```bash
   npm install
   npm run build
   ```

2. **Upload Files**
   - Upload the entire `dist` folder to your web server
   - Ensure proper MIME types are configured

3. **Configure Server**
   - Enable gzip compression
   - Set up proper caching headers
   - Configure HTTPS

## Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use platform-specific environment variable management
- Regularly rotate API keys

### Content Security Policy
- The application includes security headers
- Ensure proper CORS configuration for external APIs
- Validate all user inputs

### API Security
- Use HTTPS for all API calls
- Implement rate limiting where possible
- Monitor API usage and costs

## Monitoring and Analytics

### Performance Monitoring
- Use Vercel Analytics or similar tools
- Monitor bundle sizes and load times
- Track Core Web Vitals

### Error Tracking
- Consider integrating error tracking services
- Monitor console errors in production
- Set up alerts for critical issues

### Usage Analytics
- Track user engagement and feature usage
- Monitor API call patterns
- Analyze performance metrics

## Troubleshooting

### Common Issues

1. **Map Not Loading**
   - Verify Mapbox token is correct and has proper permissions
   - Check console for Mapbox-related errors
   - Ensure proper CORS configuration

2. **Firebase Connection Issues**
   - Verify Firebase configuration
   - Check Firebase project settings
   - Ensure proper authentication setup

3. **Build Failures**
   - Check for missing dependencies
   - Verify Node.js version compatibility
   - Review build logs for specific errors

4. **Performance Issues**
   - Run bundle analysis to identify large chunks
   - Check for unnecessary dependencies
   - Optimize image and asset sizes

### Debug Mode

For debugging production issues, you can temporarily enable sourcemaps:

```bash
NODE_ENV=development npm run build
```

## Maintenance

### Regular Updates
- Keep dependencies up to date
- Monitor security vulnerabilities
- Test new versions before deployment

### Backup Strategy
- Regular database backups
- Configuration backup
- Deployment rollback plan

### Scaling Considerations
- Monitor resource usage
- Plan for traffic spikes
- Consider CDN implementation

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review build logs and console errors
3. Verify environment configuration
4. Consult platform-specific documentation

---

**Note**: This application is designed for production use with proper configuration. Always test in a staging environment before deploying to production.
