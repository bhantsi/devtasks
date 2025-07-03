# 🚀 Deployment Guide

This guide covers how to deploy your Task Manager Pro application to various platforms.

## 📋 Prerequisites

Before deployment, ensure you have:
- ✅ Completed the database setup in Supabase
- ✅ Your Supabase project URL and anon key
- ✅ All features tested locally
- ✅ Environment variables configured

## 🌐 Deployment Options

### 1. Vercel (Recommended)

**Vercel** offers the best experience for React apps with automatic deployments.

#### Steps:
1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via GitHub** (Recommended):
   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

3. **Deploy via CLI**:
   ```bash
   vercel
   # Follow the prompts
   ```

#### Vercel Configuration:
Create `vercel.json`:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false
}
```

### 2. Netlify

**Netlify** is another excellent option with great features.

#### Steps:
1. **Deploy via Git**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import from Git"
   - Connect your GitHub repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`

2. **Environment Variables**:
   - Go to Site settings → Environment variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

#### Netlify Configuration:
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. GitHub Pages

**GitHub Pages** is free but requires some additional setup.

#### Steps:
1. **Install gh-pages**:
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json**:
   ```json
   {
     "homepage": "https://your-username.github.io/devtasks",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

### 4. Firebase Hosting

**Firebase Hosting** offers global CDN and great performance.

#### Steps:
1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**:
   ```bash
   firebase init hosting
   # Choose 'dist' as public directory
   # Configure as single-page app: Yes
   ```

3. **Deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

## ⚙️ Environment Variables Setup

For each platform, you'll need to set these environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | `eyJhbGciOiJIUzI1NiIs...` |

## 🔍 Post-Deployment Checklist

After deployment, verify:

### ✅ Basic Functionality
- [ ] App loads without errors
- [ ] User registration works
- [ ] User login works
- [ ] Tasks can be created
- [ ] Tasks can be updated/deleted
- [ ] Real-time updates work

### ✅ Performance
- [ ] Page load time < 3 seconds
- [ ] PWA features work
- [ ] Mobile responsiveness
- [ ] Analytics dashboard loads

### ✅ Security
- [ ] Environment variables are set
- [ ] No hardcoded credentials in code
- [ ] HTTPS is enabled
- [ ] Supabase RLS policies are active

## 🔧 Common Deployment Issues

### Issue: "Module not found" errors
**Solution**: Ensure all dependencies are in `package.json`
```bash
npm install
```

### Issue: Environment variables not working
**Solution**: 
- Check variable names start with `VITE_`
- Verify they're set in your hosting platform
- Restart the build process

### Issue: Supabase connection errors
**Solution**:
- Verify Supabase URL and key are correct
- Check Supabase project is active
- Ensure RLS policies allow access

### Issue: 404 errors on page refresh
**Solution**: Configure SPA redirects
- Vercel: Automatic
- Netlify: Add `netlify.toml` redirects
- Others: Configure server to serve `index.html` for all routes

## 🌟 Production Optimizations

### Performance
1. **Enable compression** in your hosting platform
2. **Configure caching headers** for static assets
3. **Use CDN** for global distribution
4. **Enable PWA caching** with service worker

### Security
1. **Set up CORS** in Supabase for your domain only
2. **Configure CSP headers** for additional security
3. **Enable HTTPS** (usually automatic)
4. **Regular dependency updates**

### Monitoring
1. **Set up error tracking** (Sentry, LogRocket)
2. **Monitor performance** (Web Vitals)
3. **Track user analytics** (Google Analytics)
4. **Database monitoring** via Supabase dashboard

## 🚀 Continuous Deployment

Set up automatic deployments:

1. **Push to main branch** → Automatic deployment
2. **Pull request previews** for testing
3. **Rollback capabilities** if issues arise
4. **Environment-specific deployments** (staging/production)

## 📞 Support

If you encounter issues:
1. Check the deployment platform's documentation
2. Verify environment variables are correct
3. Test locally with production build: `npm run build && npm run preview`
4. Check browser console for errors
5. Review Supabase logs for database issues

---

**Happy Deploying!** 🎉
