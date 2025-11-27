# MindCore Backend Setup Guide

This guide walks you through setting up the complete backend infrastructure for the MindCore website: Netlify Forms, Supabase database, and SendGrid email automation.

---

## 1. Netlify Forms Setup

### Step 1: Deploy to Netlify

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Netlify Forms integration"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com) and sign up/log in
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub account
   - Select the `mindcore.web.github.io` repository
   - Build settings:
     - Build command: (leave empty)
     - Publish directory: `.` (root)
   - Click "Deploy site"

3. **Verify Forms are Active**:
   - After deployment, go to Site settings → Forms
   - You should see 3 forms detected:
     - `early-access`
     - `contact`
     - (any others you added)

### Step 2: Configure Form Notifications

1. Go to **Site settings** → **Forms** → **Form notifications**
2. Click "Add notification" → "Email notification"
3. Configure:
   - **Event to listen for**: New form submission
   - **Email to notify**: your-email@example.com
   - **Form**: Select "All forms" or specific form
4. Save

### Step 3: Test Form Submission

1. Visit your live Netlify site
2. Fill out the "Join Early Access" form
3. Check:
   - Netlify dashboard → Forms → Active forms → Submissions
   - Your email inbox for notification

**✅ Netlify Forms is now active!**

---

## 2. Supabase Database Setup

Supabase provides a PostgreSQL database for storing and managing form submissions beyond Netlify's basic storage.

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click "New project"
3. Fill in:
   - **Organization**: Create new or select existing
   - **Project name**: mindcore-prod
   - **Database password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., US East)
4. Click "Create new project" (takes ~2 minutes)

### Step 2: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Paste the following SQL schema:

```sql
-- Waitlist/Early Access Submissions
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  message TEXT,
  source TEXT, -- 'homepage', 'echomind', 'products'
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- 'pending', 'invited', 'active'
  invited_at TIMESTAMP,
  notes TEXT
);

-- Create index for faster email lookups
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_created ON waitlist(created_at DESC);

-- Investor Leads
CREATE TABLE investor_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  company TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  contacted BOOLEAN DEFAULT FALSE,
  contacted_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_investor_email ON investor_leads(email);
CREATE INDEX idx_investor_contacted ON investor_leads(contacted);

-- Career Applications
CREATE TABLE career_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT,
  role_interest TEXT,
  message TEXT,
  resume_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'new', -- 'new', 'reviewed', 'contacted', 'rejected', 'hired'
  reviewed_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_career_status ON career_applications(status);
CREATE INDEX idx_career_created ON career_applications(created_at DESC);

-- Contact Inquiries
CREATE TABLE contact_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  replied BOOLEAN DEFAULT FALSE,
  replied_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_contact_replied ON contact_inquiries(replied);
CREATE INDEX idx_contact_created ON contact_inquiries(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to access all data
CREATE POLICY "Service role can do everything" ON waitlist
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON investor_leads
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON career_applications
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON contact_inquiries
  FOR ALL USING (auth.role() = 'service_role');
```

4. Click "Run" to execute the SQL
5. Verify tables were created: Go to **Table Editor** and see all 4 tables

### Step 3: Get API Credentials

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Project API keys** → `anon` `public` key
   - **Project API keys** → `service_role` `secret` key (keep this secure!)

### Step 4: Create Netlify Function (Optional - for advanced integration)

If you want Netlify Forms to automatically sync to Supabase:

1. Create `/netlify/functions/form-handler.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const data = JSON.parse(event.body);
  const formName = data['form-name'];

  try {
    let result;

    switch (formName) {
      case 'early-access':
        result = await supabase.from('waitlist').insert({
          email: data.email,
          message: data.message,
          source: data.source || 'unknown'
        });
        break;

      case 'contact':
        result = await supabase.from('contact_inquiries').insert({
          email: data.email,
          subject: data.subject,
          message: data.message
        });
        break;

      default:
        return { statusCode: 400, body: 'Unknown form' };
    }

    if (result.error) throw result.error;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

2. Add environment variables in Netlify:
   - Go to **Site settings** → **Environment variables**
   - Add:
     - `SUPABASE_URL` = your Project URL
     - `SUPABASE_SERVICE_KEY` = your service_role key

3. Install Supabase package:
   ```bash
   npm init -y
   npm install @supabase/supabase-js
   ```

4. Deploy and test

**✅ Supabase database is now configured!**

---

## 3. SendGrid Email Automation Setup

SendGrid will send automated confirmation emails to users who submit forms.

### Step 1: Create SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com) and sign up
2. Choose the **Free plan** (100 emails/day)
3. Complete email verification

### Step 2: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Option A: **Single Sender Verification** (easier, for testing):
   - Click "Create New Sender"
   - Fill in:
     - From Name: MindCore
     - From Email Address: hello@mindcore.ai (or your domain)
     - Reply To: hello@mindcore.ai
   - Complete verification via email

3. Option B: **Domain Authentication** (production, better deliverability):
   - Click "Authenticate Your Domain"
   - Enter your domain: mindcore.ai
   - Follow DNS configuration steps
   - Wait for DNS propagation (~48 hours)

### Step 3: Create API Key

1. Go to **Settings** → **API Keys**
2. Click "Create API Key"
3. Name: "Netlify Form Handler"
4. Permissions: "Full Access" (or "Mail Send" only)
5. Click "Create & View"
6. **Copy the API key** (you won't see it again!)

### Step 4: Create Email Templates

1. Go to **Email API** → **Dynamic Templates**
2. Click "Create a Dynamic Template"

#### Template 1: Waitlist Confirmation

- **Template Name**: "MindCore Waitlist Confirmation"
- **Template ID**: Copy this (e.g., `d-xxxxxxxxxxxxx`)

Click "Add Version" → "Blank Template" → "Code Editor"

Paste this HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000000;
      color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      color: #2997ff;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
      backdrop-filter: blur(10px);
    }
    h1 {
      font-size: 24px;
      margin: 0 0 16px 0;
      color: #ffffff;
    }
    p {
      line-height: 1.6;
      color: #a1a1a6;
      margin: 0 0 16px 0;
    }
    .btn {
      display: inline-block;
      background: #2997ff;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 999px;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #5e5e62;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MindCore</div>
    </div>

    <div class="content">
      <h1>Welcome to MindCore Early Access</h1>

      <p>Hi there,</p>

      <p>Thank you for joining the MindCore early access waitlist!</p>

      <p>You're now part of an exclusive group getting first access to <strong>EchoMind</strong> – the AI companion that understands you.</p>

      <p><strong>What happens next?</strong></p>
      <ul style="color: #a1a1a6; line-height: 1.8;">
        <li>We'll email you when your early access invite is ready</li>
        <li>Expected timeline: Q2 2025</li>
        <li>You'll get exclusive updates on our progress</li>
      </ul>

      <p>Questions? Just reply to this email.</p>

      <a href="https://mindcore.ai" class="btn">Visit MindCore</a>

      <p style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
        Best,<br>
        The MindCore Team
      </p>
    </div>

    <div class="footer">
      <p>Remembered. Understood. You.</p>
      <p>MindCore AI Systems</p>
    </div>
  </div>
</body>
</html>
```

Click "Save Template"

#### Template 2: Contact Form Auto-Reply

Create another template: "MindCore Contact Confirmation"

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #000000;
      color: #ffffff;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      color: #2997ff;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    p {
      line-height: 1.6;
      color: #a1a1a6;
      margin: 0 0 16px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #5e5e62;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">MindCore</div>
    </div>

    <div class="content">
      <h1>Thanks for reaching out!</h1>

      <p>Hi there,</p>

      <p>We've received your message and will get back to you within 24-48 hours.</p>

      <p>In the meantime, feel free to:</p>
      <ul style="color: #a1a1a6; line-height: 1.8;">
        <li><a href="https://mindcore.ai/pages/faq.html" style="color: #2997ff;">Check our FAQ</a></li>
        <li><a href="https://mindcore.ai/echomind.html" style="color: #2997ff;">Learn more about EchoMind</a></li>
        <li><a href="https://mindcore.ai" style="color: #2997ff;">Explore our other products</a></li>
      </ul>

      <p style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
        Best,<br>
        The MindCore Team
      </p>
    </div>

    <div class="footer">
      <p>MindCore AI Systems</p>
    </div>
  </div>
</body>
</html>
```

### Step 5: Integrate with Netlify Functions

Update your Netlify function to send emails:

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event) => {
  const data = JSON.parse(event.body);
  const formName = data['form-name'];

  try {
    // Send to Supabase (from previous step)
    // ...

    // Send confirmation email
    let templateId;
    if (formName === 'early-access') {
      templateId = 'd-xxxxxxxxxxxxx'; // Your waitlist template ID
    } else if (formName === 'contact') {
      templateId = 'd-yyyyyyyyyyyyy'; // Your contact template ID
    }

    if (templateId) {
      await sgMail.send({
        to: data.email,
        from: 'hello@mindcore.ai',
        templateId: templateId,
        dynamicTemplateData: {
          email: data.email,
          message: data.message || ''
        }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

Install SendGrid package:
```bash
npm install @sendgrid/mail
```

Add SendGrid API key to Netlify environment variables:
- `SENDGRID_API_KEY` = your API key

**✅ SendGrid email automation is configured!**

---

## 4. Testing the Complete Flow

### Test Checklist:

1. **Submit Early Access Form**:
   - ✅ Form submits successfully
   - ✅ Appears in Netlify Forms dashboard
   - ✅ Saved to Supabase `waitlist` table
   - ✅ Confirmation email received

2. **Submit Contact Form**:
   - ✅ Form submits successfully
   - ✅ Appears in Netlify Forms dashboard
   - ✅ Saved to Supabase `contact_inquiries` table
   - ✅ Auto-reply email received

3. **Check Analytics** (if GA4 is set up):
   - ✅ `form_submitted` event tracked
   - ✅ Source parameter captured

---

## 5. Monitoring & Maintenance

### Daily Tasks:
- Check Netlify Forms dashboard for new submissions
- Respond to contact inquiries within 24-48 hours

### Weekly Tasks:
- Review Supabase database for trends
- Update waitlist statuses (pending → invited)
- Send updates to waitlist subscribers

### Monthly Tasks:
- Review SendGrid email stats (open rate, click rate)
- Optimize email templates based on performance
- Clean up duplicate/spam submissions

---

## 6. Cost Summary

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **Netlify** | 100 form submissions/month | $19/mo for 1,000 submissions |
| **Supabase** | 500MB database, 50,000 monthly active users | $25/mo for 8GB database |
| **SendGrid** | 100 emails/day | $15/mo for 40,000 emails/month |

**Total for free tier:** $0/month (sufficient for early-stage startup)

---

## 7. Security Best Practices

1. **Never commit API keys to Git**:
   - Add `.env` to `.gitignore`
   - Use Netlify environment variables

2. **Enable Supabase RLS** (Row Level Security):
   - Already configured in SQL schema above
   - Prevents unauthorized data access

3. **Implement Rate Limiting**:
   - Netlify Forms has built-in spam protection
   - Consider adding CAPTCHA for production

4. **Regular Backups**:
   - Supabase auto-backups daily (free tier: 7 days retention)
   - Export critical data weekly

---

## Support & Resources

- **Netlify Forms Docs**: https://docs.netlify.com/forms/setup/
- **Supabase Docs**: https://supabase.com/docs
- **SendGrid Docs**: https://docs.sendgrid.com/
- **MindCore GitHub Issues**: Report problems at your repo

---

**Last Updated**: January 2025
**Maintained By**: MindCore Team
