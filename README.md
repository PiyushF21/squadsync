# 🎮 SquadSync

**A Real-Time Matchmaking & Reputation Platform for eSports and Physical Sports.**

SquadSync bridges the gap between casual gaming and competitive team building. Whether you're hosting a sweaty 5v5 ranked Valorant lobby or a casual pickup basketball game at the local court, SquadSync handles the application process, the roster approval, the private communication, and the post-match reputation scoring.

Built with a bold **Neobrutalist** UI, powered by **React**, and backed by **Supabase**.

## ✨ Killer Features

* **🛡️ Dynamic Gating & Approvals:** Joining a squad isn't instant. Players must submit applications. For eSports, they must upload a screenshot of their rank/stats. For physical sports, they submit a short bio. The Host controls an interactive Inbox to Accept or Reject applicants.
* **💬 Real-Time Squad Messenger:** Once approved, players gain access to a private, real-time WebSocket chat room built specifically for their lobby.
* **⭐ The Reputation Engine:** Post-match, Hosts rate their teammates (1-5 stars). The algorithm calculates a global average and assigns dynamic badges to player profiles (e.g., `🌟 S-TIER LEGEND`, `👍 SOLID TEAMMATE`, or `🚩 TOXIC WARNING`).
* **🗺️ Live Map Integration:** Physical sports lobbies dynamically generate embedded, interactive maps based on the host's location input.
* **🔍 Public Scouting Directory:** A filterable database where hosts can scout for free agents based on category and main game.
* **🎨 Neobrutalist Architecture:** High-contrast, heavy-border, shadow-driven UI built entirely with Tailwind CSS.

## 🛠️ Tech Stack

* **Frontend:** React.js, React Router DOM
* **Styling:** Tailwind CSS (Custom Neobrutalism Design System)
* **Backend as a Service (BaaS):** Supabase
  * **Database:** PostgreSQL with Row Level Security (RLS) policies
  * **Authentication:** Secure Email/Password Auth
  * **Storage:** Cloud buckets for application screenshot proofs
  * **Real-time:** WebSockets (`supabase_realtime`) for live messaging and instant UI updates

## 📂 Database Architecture

SquadSync utilizes a relational PostgreSQL database with strict Row Level Security:
* `profiles`: Public-facing user data for the Scouting Directory.
* `lobbies`: The active sessions (Date, Time, Location, Spots Left, Category).
* `rsvps`: The bridge table managing applications, image proofs, approval statuses, and post-game ratings.
* `messages`: The real-time chat logs tied to specific lobbies and authenticated users.

## 🚀 Run it Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/PiyushF21/squadsync.git](https://github.com/PiyushF21/squadsync.git)
   cd squadsync
Install dependencies:


npm install
Set up your environment variables:
Create a .env file in the root directory and add your Supabase keys:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
Start the development server:
npm run dev


👨‍💻 Author
Piyush Fatnani
GitHub:PiyushF21
