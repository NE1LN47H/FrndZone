🗺️ FrndZone
Share your moment. Discover nearby vibes.

FrndZone is a classy, smooth, and fun real-time social feed like BeReal + NGL, where users share what they’re doing within a chosen radius (1–60 km). Built with React.js, Tailwind CSS, Supabase, Leaflet, and Capacitor, it offers a modern, dynamic, and privacy-respectful experience with posts that auto-expire after 24 hours.

✨ Features

🔐 Secure Auth System — Signup/login with email, phone number, username, and password, validated to ensure no duplicate email or phone.

📍 Real-Time Feed by Radius — Choose a distance (1–60 km) to view posts nearby in real time.

👥 Friends & Profiles — Search for any username, view their profile, and see their posts. No friend requests or accept flow — fast and open, like Instagram’s follow model.

🗺️ Map View (Leaflet + OpenStreetMap) — View all active users within your selected radius. If a user closes the app, their location automatically disappears.

🕒 Auto-Expiry — All posts vanish automatically after 24 hours, managed via Supabase Edge Functions.

💬 Comments & Replies — Threaded discussion on posts, keeping things clean and interactive.

🎬 Beautiful Transitions — Powered by Framer Motion for minimal, professional animations (no bubbly gradients).

📱 Mobile-Ready via Capacitor — Responsive, installable, and works like a native mobile app.

💨 Deployed on Vercel — Optimized for speed, scalability, and seamless Supabase integration.

🧭 Location-First Experience —

Splash screen with FrndZone logo + catchphrase

Always asks to enable location when opening

Turns off location automatically when closed

🧩 Tech Stack
Layer	Technology
Frontend	React.js, Tailwind CSS, Framer Motion
Backend	Supabase (Auth, Database, Storage, Edge Functions)
Maps	Leaflet + OpenStreetMap
Mobile Integration	Capacitor
Deployment	Vercel
🗄️ Supabase Schema Overview

Tables:

profiles — User details (id, username, email, phone, avatar, location).

posts — User posts with geolocation, text, image, and expires_at timestamp.

comments — Threaded comments linked to posts and users.

friends — Optional friend references for “Friends Feed”.

Edge Function:

cleanup_expired_posts() — Runs periodically to delete posts older than 24 hours.

🚀 Getting Started
1. Clone the repo
git clone https://github.com/your-username/FrndZone.git
cd FrndZone

2. Install dependencies
npm install

3. Set up environment variables

Create a .env file with your Supabase credentials:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

4. Run the app locally
npm run dev

5. Build for production
npm run build

6. Deploy on Vercel

Connect the repo to Vercel
 and deploy directly — everything is configured for production.

7. Add mobile support
npx cap add android
npx cap add ios
npx cap copy
