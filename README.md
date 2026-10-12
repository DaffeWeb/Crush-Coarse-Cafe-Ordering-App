# ☕ Crush Coarse Cafe — Campus Ordering & Delivery App

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20FCM-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Receipt%20Storage-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment%20Ready-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A modern, mobile-first campus cafe ordering platform built for **Crush Coarse Cafe**. It streamlines beverage and snack ordering for students and staff with real-time order tracking, push notifications, and a dedicated barista/admin order management board.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Customer Experience](#-customer-experience)
  - [Admin & Staff Dashboard](#-admin--staff-dashboard)
  - [Real-Time Notification Microservice](#-real-time-notification-microservice)
- [Order Lifecycle Flow](#-order-lifecycle-flow)
- [Campus Delivery Coverage](#-campus-delivery-coverage)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Environment Variables](#3-environment-variables)
  - [4. Run Local Development Server](#4-run-local-development-server)
- [Push Notification Server Setup](#-push-notification-server-setup)
- [Deployment](#-deployment)
- [Scripts & Quality Assurance](#-scripts--quality-assurance)

---

## 🌟 Overview

**Crush Coarse Cafe Ordering App** bridges campus coffee lovers and barista stations. Designed specifically for university and co-working environments, it eliminates long queues by allowing customers to order drinks directly to their classroom, laboratory, or study lounge, complete with instant GCash payment receipt uploads and live browser push notifications at each step of preparation and delivery.

---

## 🚀 Key Features

### 🛒 Customer Experience
- **Interactive Menu Catalog**: Browse categories including *Coffee*, *Non-Coffee*, and *Snacks* with live availability indicators.
- **Persistent Slide-Out Cart**: Real-time pricing calculations, item quantities, and instant checkout transitions.
- **Smart Campus Delivery Selector**:
  - **Academic Buildings**: Room-level delivery tracking (e.g., MAB, ASB, GSB, MT Lab, VEA, EMVM, Library).
  - **Establishments**: Delivery to affiliated hubs and cafes (e.g., Workplace Cafe, Mesh Cafe, Huddle CoWork).
  - **Landmarks**: Quick outdoor campus meeting points (e.g., Parkway, Raintree, Kichap, Garden).
- **Flexible Payment Options**:
  - **Cash on Delivery (COD)**: Pay when orders arrive.
  - **GCash**: Displayed payment number/name with fast receipt image upload powered by **Cloudinary**.
- **Real-Time Order Tracker**: Live visual status stepper that remembers customer orders across sessions (`localStorage`).
- **Web Push Notifications (FCM)**: Push updates directly to the customer's phone or browser when their drink is being brewed, picked up, and delivered.
- **Fair-Use Protection**: Automated rate-limiting mechanism preventing duplicate orders and capping daily orders per customer phone number.

### 🛡️ Admin & Staff Dashboard (`/admin`)
- **Secure Staff Authentication**: Email & password gated access via Firebase Authentication.
- **Live Kanban Order Board**:
  - Real-time Firestore synchronization for incoming orders.
  - Tabbed organization separating **Active Orders** from **Completed History**.
  - One-click status advancement adhering to the predefined operational workflow.
- **Payment Verification**: In-dashboard GCash receipt image viewer to inspect transaction slips before fulfilling orders.
- **Order Details Breakdown**: Full customer contact details, itemized breakdown, building/room notes, and timestamps.

### 🔔 Real-Time Notification Microservice (`server/`)
- Headless Node.js daemon using `firebase-admin`.
- Listens to Firestore order document updates via `onSnapshot`.
- Automatically constructs and sends personalized Firebase Cloud Messaging (FCM) web push notifications on status transitions (`confirmed`, `preparing`, `ready`, `out_for_delivery`, `delivered`).
- Included `systemd` installation scripts for unattended 24/7 background operation on Linux servers or Raspberry Pi nodes.

---

## 🔄 Order Lifecycle Flow

```
[ Customer Places Order ] (Pending)
           │
           ▼
[ Admin Reviews & Accepts ] ──▶ (Confirmed) ──▶ 📲 Push: "Order Confirmed! 🎉"
           │
           ▼
[ Barista Brews Drinks ] ──▶ (Preparing) ──▶ 📲 Push: "Coffee's Brewing! ☕"
           │
           ▼
[ Ready for Dispatch ] ──▶ (Ready) ──▶ 📲 Push: "Order Ready! 🎊"
           │
           ▼
[ Rider Dispatched ] ──▶ (On the Way) ──▶ 📲 Push: "On the way! 🚀"
           │
           ▼
[ Delivered to Room/Spot ] ──▶ (Delivered) ──▶ 📲 Push: "Delivered! ❤️"
```

---

## 📍 Campus Delivery Coverage

| Category | Locations | Room Required? |
| :--- | :--- | :--- |
| **Campus Buildings** | MAB, ASB, GSB, MT Lab, VEA A, VEA B, EMVM, Library | **Yes** (Room / Floor) |
| **Cafes & CoWork Hubs** | Workplace Cafe, Mesh Cafe, Huddle CoWork | No |
| **Campus Landmarks** | Parkway, Raintree, Kichap, Garden | No |

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/) |
| **Routing** | [React Router v7](https://reactrouter.com/) |
| **Styling** | Vanilla CSS with Design Tokens (`src/styles/design-tokens.css`) & Glassmorphism |
| **Database & Auth** | [Firebase Firestore](https://firebase.google.com/docs/firestore), [Firebase Auth](https://firebase.google.com/docs/auth) |
| **Push Notifications** | [Firebase Cloud Messaging (FCM)](https://firebase.google.com/docs/cloud-messaging), Service Workers |
| **Media & Receipt Uploads** | [Cloudinary REST API](https://cloudinary.com/) (unsigned direct upload) |
| **Notification Daemon** | Node.js, `firebase-admin`, Systemd service |
| **Linting & Code Quality** | [Oxlint](https://oxc.rs/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📁 Project Architecture

```
Crush-Coarse-Cafe-Ordering-App/
├── public/
│   ├── favicon.svg                   # Brand favicon
│   ├── firebase-messaging-sw.js      # FCM background push listener service worker
│   ├── icons.svg                     # UI iconography sprites
│   └── manifest.json                 # Web App Manifest
├── server/                           # Notification microservice
│   ├── firebase-service-account.json # Firebase Admin SDK private key (git-ignored)
│   ├── install-service.sh            # Linux systemd installer script
│   ├── package.json                  # Server dependencies (firebase-admin)
│   ├── remove-service.sh             # Linux systemd removal script
│   └── server.js                     # Firestore snapshot listener & FCM dispatcher
├── src/
│   ├── assets/                       # Static images & branding assets
│   ├── components/
│   │   ├── admin/
│   │   │   ├── OrderBoard.jsx        # Real-time staff Kanban order board
│   │   │   └── OrderBoard.css
│   │   └── customer/
│   │       ├── Cart.jsx              # Slide-out cart drawer
│   │       ├── Checkout.jsx          # Checkout form & Cloudinary receipt uploader
│   │       ├── MenuGrid.jsx          # Beverage & snack catalog with categories
│   │       └── OrderTracker.jsx      # Active order progress stepper
│   ├── config/
│   │   ├── constants.js              # Delivery locations, statuses, & seed menu
│   │   └── firebase.js               # Firebase client initialization
│   ├── context/
│   │   ├── CartContext.jsx           # Global shopping cart state
│   │   └── ToastContext.jsx          # Toast feedback notifications
│   ├── hooks/
│   │   ├── useAuth.js                # Firebase Authentication state listener
│   │   ├── useMenu.js                # Live menu catalog hook
│   │   ├── useNotifications.js       # FCM registration & browser permission hook
│   │   ├── useOrder.js               # Single order Firestore listener
│   │   └── useOrders.js              # Multi-order stream for admin dashboard
│   ├── pages/
│   │   ├── AdminDashboard.jsx        # Protected staff dashboard & receipt modal
│   │   ├── AdminLogin.jsx            # Staff authentication form
│   │   └── CustomerPage.jsx          # Main customer ordering hub
│   ├── services/
│   │   ├── menuService.js            # Firestore menu operations
│   │   ├── orderService.js           # Order creation & status update methods
│   │   └── storageService.js         # Cloudinary receipt upload handler
│   ├── styles/
│   │   ├── design-tokens.css         # Theme palette, spacing, and typography tokens
│   │   └── global.css                # Base HTML reset and shared utilities
│   ├── App.jsx                       # Route definitions & protected admin routes
│   └── main.jsx                      # App root mount
├── .env.example                      # Template for client environment variables
├── vercel.json                       # Single-page application route rewrites
└── vite.config.js                    # Vite configuration
```

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- `npm` or `pnpm`
- A [Firebase Project](https://console.firebase.google.com/) with **Firestore**, **Authentication**, and **Cloud Messaging** enabled.
- A free [Cloudinary Account](https://cloudinary.com/) for receipt uploads.

### 1. Clone Repository
```bash
git clone https://github.com/DaffeWeb/Crush-Coarse-Cafe-Ordering-App.git
cd Crush-Coarse-Cafe-Ordering-App
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Populate `.env` with your actual Firebase web client credentials and Cloudinary details:

```env
# Firebase Client SDK Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# Cloudinary Uploads (GCash Receipts)
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

> **Note**: For background notifications on the client, ensure your Firebase project credentials in `public/firebase-messaging-sw.js` match your `.env` project configuration.

### 4. Run Local Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to access the customer ordering portal, or `http://localhost:5173/admin` for the staff dashboard.

---

## 🔔 Push Notification Server Setup

The push notification server (`server/`) listens to Firestore for status updates and triggers FCM web push notifications to customer devices.

1. Navigate to the `server/` folder:
   ```bash
   cd server
   npm install
   ```
2. Download your **Firebase Service Account Private Key** (`firebase-service-account.json`) from the Firebase Console (*Project Settings -> Service Accounts -> Generate new private key*) and place it inside `server/`.
3. Start the daemon manually:
   ```bash
   npm start
   ```

### Running as a Linux Systemd Daemon (Production / VPS)
On a Linux server, run the automated installation script:
```bash
chmod +x install-service.sh
./install-service.sh
```
Check live service status and logs anytime:
```bash
sudo journalctl -u crush-coarse-notifier -f
```
To uninstall the service:
```bash
chmod +x remove-service.sh
./remove-service.sh
```

---

## 🚀 Deployment

### Deploying the Web Frontend (Vercel)
The project includes a ready-to-use [`vercel.json`](vercel.json) for single-page application routing.
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/).
3. Add the environment variables from your `.env` file into the Vercel Project Settings.
4. Deploy!

---

## 🧪 Scripts & Quality Assurance

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server with Hot Module Replacement |
| `npm run build` | Builds optimized production bundle into `dist/` |
| `npm run preview` | Locally serves and previews the production build |
| `npm run lint` | Runs [Oxlint](https://oxc.rs/) for blazing-fast JavaScript linting |

---

## 👥 Authors & Acknowledgements

Developed for **Crush Coarse Cafe** campus entrepreneurship operations.  
Maintained by [@DaffeWeb](https://github.com/DaffeWeb).
