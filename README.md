# 🗺️ FrndZone

**Share your moment. Discover nearby vibes.**

FrndZone is a modern, location-based social networking app that lets you share moments and discover what's happening around you. Built with React, TypeScript, and Supabase, it offers a real-time feed of posts from users within your selected radius, complete with friend connections, interactive maps, and beautiful animations.

![FrndZone](https://img.shields.io/badge/FrndZone-v1.0.0-blue)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)

## ✨ Features

### 🔐 Authentication & User Management
- **Secure Auth System** - Sign up/login with email, phone number, username, and password
- **Profile Management** - Customize your profile with avatar, bio, and full name
- **User Profiles** - View other users' profiles and their posts
- **Session Management** - Persistent sessions with automatic authentication state handling

### 📍 Location-Based Features
- **Real-Time Feed by Radius** - Choose a distance (1-100 km) to view posts nearby in real-time
- **Interactive Map View** - Visualize all active users within your selected radius using Leaflet maps
- **Location Tracking** - Automatic location updates when the app is active
- **Location Reminders** - Toast notifications to enable location services

### 👥 Social Features
- **Friend System** - Send and accept friend requests
- **Friends Feed** - View posts exclusively from your friends
- **Friend Search** - Search for users by username within a specified radius
- **Friends List** - View all your friends in one place
- **User Discovery** - Find nearby users and connect with them

### 📱 Posts & Interactions
- **Create Posts** - Share text posts with your location
- **Nearby Posts Feed** - Discover what's happening around you
- **Comments & Replies** - Threaded discussions on posts
- **Post Likes** - Like posts to show appreciation
- **Auto-Expiry** - Posts automatically expire after 24 hours

### 🎨 User Experience
- **Beautiful Splash Screen** - Animated splash screen with FrndZone branding
- **Smooth Animations** - Powered by Framer Motion for professional transitions
- **Dark/Light Theme** - System-aware theme switching with manual override
- **Responsive Design** - Works seamlessly on web and mobile devices
- **Mobile-Ready** - Built with Capacitor for native mobile app experience

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI |
| **Animations** | Framer Motion |
| **Backend** | Supabase (Auth, Database, Storage, Edge Functions) |
| **Maps** | Leaflet, React-Leaflet, OpenStreetMap |
| **State Management** | TanStack React Query |
| **Routing** | React Router DOM |
| **Mobile** | Capacitor (Android/iOS) |
| **Deployment** | Vercel |
| **Notifications** | Sonner (Toast notifications) |

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **bun**
- **Supabase Account** (for backend services)
- **Git**

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/NE1LN47H/FrndZone.git
cd FrndZone
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase project settings under API.

### 4. Database Setup

Run the Supabase migrations to set up the database schema:

```bash
# If you have Supabase CLI installed
supabase db push

# Or manually run the migrations from the supabase/migrations folder
```

The migrations will create the following tables:
- `profiles` - User profiles with location data
- `posts` - User posts with geolocation
- `comments` - Threaded comments on posts
- `friends` - Friend relationships
- `friend_requests` - Friend request management
- `post_likes` - Post likes tracking

### 5. Run the Development Server

```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
# or
bun run build
```

The production build will be in the `dist` directory.

## 📱 Mobile App Setup

### Android

```bash
# Add Android platform
npx cap add android

# Copy web assets
npx cap copy

# Open in Android Studio
npx cap open android
```

### iOS

```bash
# Add iOS platform
npx cap add ios

# Copy web assets
npx cap copy

# Open in Xcode
npx cap open ios
```

## 🗄️ Database Schema

### Tables

- **profiles** - User details (id, username, email, phone, avatar, location, bio, full_name)
- **posts** - User posts with geolocation, text content, and expires_at timestamp
- **comments** - Threaded comments linked to posts and users
- **friends** - Bidirectional friend relationships
- **friend_requests** - Friend request management with status tracking
- **post_likes** - Post likes for user engagement

### Edge Functions

- **expire-posts** - Automatically deletes posts older than 24 hours

### Database Functions (RPC)

- `get_nearby_users` - Returns users within a specified radius
- `get_nearby_posts` - Returns posts within a specified radius
- `get_friend_posts` - Returns posts from friends
- `get_nearby_profiles` - Returns profiles within a specified radius for friend search

## 🎯 Key Features Explained

### Location-Based Feed
Users can select a radius (1-100 km) to see posts from nearby users. The feed updates in real-time as new posts are created within the selected radius.

### Friend System
- Send friend requests to other users
- Accept or decline incoming friend requests
- View posts exclusively from friends in the "Friends" feed
- Search for friends by username within a specified distance

### Map View
Interactive map showing all active users within your selected radius. User locations are displayed with their usernames, and the map updates in real-time.

### Auto-Expiring Posts
All posts automatically expire after 24 hours, keeping the feed fresh and relevant. This is managed by a Supabase Edge Function that runs periodically.

## 🛠️ Development

### Project Structure

```
FrndZone/
├── src/
│   ├── components/       # Reusable React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── ...           # Custom components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Third-party integrations
│   └── lib/              # Utility functions
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/       # Edge functions
├── android/              # Android native project
└── public/               # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🚢 Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

The `vercel.json` configuration is already set up for optimal deployment.

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Developer

**Neilnath**

- Email: neilnath1337@gmail.com
- GitHub: [@NE1LN47H](https://github.com/NE1LN47H)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [shadcn/ui](https://ui.shadcn.com) for the beautiful UI components
- [Leaflet](https://leafletjs.com) for the mapping functionality
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Capacitor](https://capacitorjs.com) for mobile app capabilities

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact the developer at neilnath1337@gmail.com

---

Made with ❤️ by Neilnath
