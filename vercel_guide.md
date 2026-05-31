# Google Workspace Backend & Vercel Deployment Guide

This guide provides step-by-step instructions to deploy the **WhatsBro TNService Form Builder & Data Collection Platform** using **Vite React** on the frontend, **Google Sheets** as the database, **Google Drive** for document uploads, and **Google Apps Script** as the REST API engine.

---

## 🛠️ Step 1: Deploy Google Workspace Backend

We use a container-bound Google Apps Script which links automatically to a Google Sheet.

### 1. Create a Google Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com) and create a brand-new blank spreadsheet.
2. Name your spreadsheet (e.g. `WhatsBro TNService Database`).

### 2. Add the Backend Script
1. Inside your new Google Spreadsheet, open the menu **Extensions > Apps Script**.
2. Delete any boilerplate code inside the editor.
3. Open the file `Code.gs` in your local project folder, copy all of its content, and paste it into the Apps Script editor.
4. Save the script by clicking the 💾 (Save) icon at the top of the editor.

### 3. Deploy as a Web App
1. Click the **Deploy** button in the top-right corner of the editor and select **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and select **Web app**.
3. Configure the following parameters:
   - **Description:** `WhatsBro API v1.0`
   - **Execute as:** `Me (your_email@gmail.com)`
   - **Who has access:** `Anyone` (This is critical to let the React client make submissions without Google account logins!)
4. Click **Deploy**.
5. Google will ask you to authorize permissions for Drive (to create folders/save user uploads) and Sheets (to read/write form entries). Click **Authorize Access**, select your Google Account, click **Advanced**, and then click **Go to Untitled project (unsafe)** to grant permissions.
6. Once authorized, copy the generated **Web App URL** (it should look like `https://script.google.com/macros/s/AKfycb.../exec`).

> [!IMPORTANT]
> Keep this Web App URL safe. You will configure it as your frontend environment variable in the next steps!

---

## 💻 Step 2: Configure React Frontend

### 1. Set Up Local Environment
1. Copy the `.env.example` file in the root of your project directory and rename it to `.env`.
2. Paste your copied Web App URL into the environment variable:
   ```env
   VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxxxxxxxxx_your_script_deployment_id_xxxxxxxxx/exec
   ```

### 2. Install Dependencies & Run Locally
1. Open a terminal inside the project folder (`d:\project\g form`).
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server exposed on network host:
   ```bash
   npm run dev
   ```
4. Access the React Frontend locally at: `http://localhost:5173`.
5. On the first load, the backend spreadsheet sheets (`Forms`, `Users`, `Submissions`, `Posts`, `SystemLog`) and initial mockup services will be created inside your Google Sheet automatically!

---

## 📁 Step 3: Google Drive Folder Structure

You do not need to set up anything manually in Google Drive! The first time a user registers or submits files, the backend Apps Script will automatically:
1. Create a root folder called `WhatsBroTNService_Uploads` in your Google Drive.
2. Share this folder automatically as **"Anyone with the link can view"** so dynamic certificate previews render correctly inside the app.
3. Automatically organize all citizen uploads into child directories:
   - `Citizen_Profiles/User_[userId]/`: Photo, Aadhaar, Signatures, etc.
   - `Form_Submissions/Submission_[subId]/`: Dynamic user form attachments.
   - `Payments/Submission_[subId]/`: Uploaded payment screenshot receipts.
   - `Output_Certificates/Submission_[subId]/`: Finished delivery PDF certificates.

---

## 🚀 Step 4: Host on Vercel

Host the React frontend on Vercel in a few clicks:

### Method A: Deploy via Vercel CLI
1. Open a terminal in the root project folder and install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Trigger the deploy prompt:
   ```bash
   vercel
   ```
3. Log in to your Vercel account, set project name, and confirm Vite preset builds.
4. When asked for environment variables, add `VITE_GOOGLE_SCRIPT_URL` with your Google Apps Script URL.
5. Deploy to production:
   ```bash
   vercel --prod
   ```

### Method B: Deploy via Vercel Dashboard
1. Push your local project repository to GitHub, GitLab, or Bitbucket.
2. Go to the [Vercel Dashboard](https://vercel.com) and click **Add New > Project**.
3. Import your git repository.
4. Under **Environment Variables**, configure the key:
   - **Key:** `VITE_GOOGLE_SCRIPT_URL`
   - **Value:** `[Your_Google_Apps_Script_URL]`
5. Click **Deploy**. Vercel will build and host your production-ready Form Builder and Data Collection Platform!
