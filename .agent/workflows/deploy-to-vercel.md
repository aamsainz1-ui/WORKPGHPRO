---
description: Deploy GlobalWork Pro to Vercel
---

# Deploy to Vercel Workflow

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Git repository (optional but recommended)

## Method 1: Deploy via Vercel CLI (Fastest)

// turbo-all

### 1. Install Vercel CLI globally
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy the project
```bash
vercel
```
- Follow the prompts:
  - Set up and deploy? **Y**
  - Which scope? Select your account
  - Link to existing project? **N** (for first deployment)
  - What's your project's name? **globalwork-pro** (or your preferred name)
  - In which directory is your code located? **./**
  - Want to override the settings? **N**

### 4. Deploy to production
```bash
vercel --prod
```

## Method 2: Deploy via Vercel Dashboard (GUI)

### Option A: With Git (Recommended)

1. **Push code to GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your repository
   - Configure build settings:
     - Framework Preset: **Vite**
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
   - Add environment variables if needed
   - Click "Deploy"

### Option B: Without Git (Drag & Drop)

1. **Build the project locally**
   ```bash
   npm run build
   ```

2. **Upload to Vercel**
   - Go to https://vercel.com/new
   - Drag and drop the `dist` folder
   - Click "Deploy"

## Environment Variables

If your app uses environment variables (like API keys), add them in Vercel:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add your variables:
   - `VITE_GEMINI_API_KEY` (if using Gemini AI)
   - Any other `VITE_*` variables from `.env.local`

## Post-Deployment

- Your app will be available at: `https://your-project-name.vercel.app`
- Vercel provides automatic HTTPS
- Every git push will trigger a new deployment (if using Git method)
- Preview deployments for pull requests

## Troubleshooting

### Build fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Test build locally: `npm run build`

### Environment variables not working
- Ensure they start with `VITE_` prefix
- Redeploy after adding variables

### 404 on routes
- Vite handles routing automatically for SPAs
- No additional configuration needed for Vercel

## Custom Domain (Optional)

1. Go to project settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

