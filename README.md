# OmniPulse TV

OmniPulse TV is a cinematic, smart-living-room experience designed for Amazon Fire OS and Vega OS devices. Built with React, TypeScript, Vite, and Tailwind CSS, it delivers a next-generation 10-foot user interface for sports viewing, family engagement, fitness coaching, and multimodal control.

The experience brings together live AI sports analysis, personalization by household profiles, voice and gesture-based interaction, and family-friendly entertainment into one polished TV-first application.

## Overview

OmniPulse TV is designed for modern home entertainment hubs where users expect:

- Fast navigation with a D-pad-first interface
- Personalized, profile-aware experiences for different family members
- AI-assisted sports commentary and tactical insights
- Hands-free interaction through voice and gesture controls
- A high-visual, immersive design for large displays and living-room use

It is built for the experience of watching sports, learning, playing, training, and controlling the interface without needing a touch screen or keyboard.

## Why OmniPulse?

Traditional TV experiences are passive. OmniPulse reimagines the living room as an intelligent, interactive environment.

Instead of simply broadcasting content, the platform:

- explains key match moments in plain language,
- adapts commentary tone to the active user profile,
- turns home viewing into a collaborative family experience,
- supports TV-native interaction using smart remote navigation, voice, and gesture input.

## Core Features

### 1. Coach Mode: AI Sports Experience

The sports module provides a high-end live match viewing simulation with intelligent contextual guidance.

Features include:

- Live tactical match simulation with dynamic player tracking
- Real-time telemetry overlays such as speed, distance, and play analysis
- Smart annotations for events like offside, fouls, and VAR decisions
- AI-driven explanations tailored to different viewer profiles
- Learn-then-quiz loops that turn sport events into educational moments
- Goal celebrations, crowd energy effects, and live match excitement cues

This transforms passive sports viewing into an interactive educational and entertaining experience.

### 2. Family Profiles and Personalization

OmniPulse supports multiple household profiles with distinct personalities, preferences, and scoring states.

Included profile behavior:

- Dad, Mom, Teen, and Kid personas with separate scores and badges
- Personalized commentary styles and explanations
- Profile-aware learning experiences
- Family leaderboard and progression tracking
- Local persistence for ongoing household engagement

This makes the app feel tailored to each user rather than generic.

### 3. Family Trivia Arena

The entertainment layer is designed for group participation and shared play.

Capabilities include:

- Interactive trivia and sports knowledge challenges
- Multi-player family participation model
- Score-based progression and rewards
- Seamless transitions from game moments into quiz content
- Integration with live match events and family engagement loops

### 4. AI Fitness Coach

The fitness experience is tuned for living room workouts and home exercise flows.

Features include:

- Workout guidance for home-based fitness routines
- Computer-vision-inspired movement and pose tracking
- Repetition counting and motion feedback
- Goal-oriented coaching experiences for active family users
- Integration with the same TV-first interface and low-friction interaction model

### 5. Air Gestures and Voice Control

The multimodal interface allows users to control the app using natural inputs beyond the remote.

Included features:

- Speech recognition for hands-free commands
- Gesture-based control simulation
- Context-aware command interpretation
- Couch-seat and family-person mapping heuristics
- Adaptive user hints based on current home activity

This makes OmniPulse feel modern, accessible, and better suited for smart homes and large-screen interactions.

### 6. Family Pulse Dashboard

The pulse module delivers a living-room activity summary and household-level insights.

Examples include:

- Weekly family performance recap
- Badge and streak tracking
- Learning and activity trends
- Scoreboard-style summaries for motivation and gamification

### 7. Smart TV UX and 10-Foot Design

The application is specifically designed for TV interfaces and large-screen usability.

Design priorities include:

- Large type and high contrast for readability from a distance
- D-pad-friendly navigation and non-touch interaction
- TV-optimized card layouts and smooth transitions
- Fast loading and responsive dashboard components
- Ambient UI styling that fits modern smart-home environments

## Application Architecture

The project is structured as a TypeScript-based React application with modular, feature-driven components.

Key folders:

- `src/App.tsx` — main app shell and tab navigation
- `src/components/` — UI modules for sports, fitness, trivia, profiles, and multimodal controls
- `src/core/` — core app logic, state, profile handling, and event systems
- `src/content/` — content, explanations, and match narrative data
- `src/hooks/` — reusable app behavior and spatial navigation logic
- `src/utils/` — shared helper functions and audio utilities

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React icons
- Browser speech APIs for voice interactions
- TV-first UX architecture for Fire OS / Amazon ecosystem and Vega OS-style experiences

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- A modern browser or a Fire TV / Vega OS device on the same local network

### Installation

```bash
git clone https://github.com/sejalpandey30/Omnipulse.git
cd Omnipulse
npm install
```

### Run in Development Mode

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

For Fire TV or other devices on the same network, open the browser on the device and navigate to:

```text
http://<your-computer-ip>:3000
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Demo Flow

The app includes a hidden demo director workflow intended for presentation and walkthroughs.

A common demo trigger is:

- Press `Shift + D` to open the demo panel
- Navigate across sports, fitness, trivia, and multimodal controls
- Demonstrate profile switching, commentary adaptation, and voice command response

This is ideal for product demonstrations, storytelling, and interactive smart-TV showcases.

## Project Goals

OmniPulse TV is positioned as a demonstration of how everyday television can become:

- more intelligent,
- more personalized,
- more interactive,
- more family-oriented,
- and richer in experience than passive content delivery.

It is not just an app; it is a full smart-living-room experience concept built around AI, ambient control, and immersive home entertainment.

## License

This project is currently configured as a private repository.

## Contributing

Contributions, feature proposals, and UX improvements are welcome. If you want to extend the experience with:

- additional sport data modules,
- expanded family games,
- deeper fitness tracking,
- or advanced multimodal controls,

the codebase is structured to support modular expansion.

## Final Note

OmniPulse TV showcases the future of home entertainment: a smart TV platform where AI, personalization, and interaction blend seamlessly into one living-room experience.

---

Built for interactive smart homes, connected families, and modern TV experiences.
