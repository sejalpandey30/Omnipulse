# OmniPulse TV: Fire OS & Vega OS Interactive Demo App

OmniPulse TV is a production-grade, 10-foot living room and smart display application engineered specifically for **Amazon Fire OS** (Fire TV Stick / Cube, Fire Tablets) and **Amazon Vega OS** (Echo Show, next-gen Linux/web-first Amazon devices).

---

## 🌟 Demo Features

### 1. ⚽ Feature A: "Coach Mode" (Match-Day AI Co-Commentator)
- **Live 4K Tactical Vision HUD**: Real-time simulated Champions League match with automated player tracking boxes, speed telemetry (e.g. 34.8 km/h sprint speeds), and distance covered.
- **Explain-It Sports AI Overlay**: On `OFFSIDE`, `FOUL`, or `VAR_CHECK`, stream auto-pauses, annotates freeze-frame tactical graphics, and explains the rule at the active profile's depth (`kid`, `casual`, `expert`) in their commentary tone (`serious`, `hype`, `comedian`).
- **Interactive Family Call Vote**: Living room vote ("Right Call 👍" vs "Bad Call 👎") awarding family profile points.
- **Learn-Then-Quiz Loop**: After an explained event, generates a live one-question rule quiz injected directly into Family Trivia.
- **Halftime / Lull Challenge**: On `HALFTIME` or `LULL`, launches a 30-second speed fitness challenge where reps credit the active viewer's profile score.
- **Goal Celebration & Living Room Cheer Meter**: Synthesized Web Audio stadium roar, confetti cannons, and cheer meter driven by microphone audio or simulation.

### 2. 👨‍👩‍👧‍👦 Feature B: "Family Voices" & Multi-Modal Fusion
- **Family Profiles**: 4 seeded profiles (Dad, Mom, Teen, Kid) persisted in `localStorage` with personalized commentary tones, avatars, scores, streaks, and badges.
- **"Who's Watching?" Selector**: D-pad navigable modal reachable from the top header chip or voice.
- **Multi-Modal Voice & Gesture Fusion**: Resolves voice commands ("Explain that") combined with pointing gestures in &lt;300ms without cloud round-trip.
- **Speaker Seat Heuristics**: Maps optical gesture frame position (Left, Center, Right couch seats) to family profile actors.
- **Adaptive TV Hints**: Recommends voice when D-pad navigation stalls, and suggests hand gestures when ambient living room noise is high.
- **Family Pulse Recap**: Weekly scoreboard summarizing family reps, rules mastered, trivia wins, and badges ("Halftime Hero", "Cheer Leader", "Tactical Master").

---

## 🚀 Running the App

### 1. Start the Dev Server
From the project folder:
```powershell
cd "C:\Users\Sejal Pandey\.gemini\antigravity\scratch\omnipulse-tv"
npm run dev
```

### 2. Access on Fire TV or Vega OS Devices
- On your PC: Open `http://localhost:3000`
- On Fire TV / Fire Tablet: Open **Amazon Silk Browser** and navigate to your PC's IP address (e.g., `http://192.168.1.X:3000`).
- On Vega OS (Echo Show): Open Silk or load via the Web App Launcher.

---

## 🎬 3-Minute Demo Director Walkthrough Script (Press `Shift + D`)

Press **`Shift + D`** anywhere in the app to toggle the hidden **Demo Director Panel**:

1. **Minute 0:00 - 0:45 | Explain-It & Profile Personalization**:
   - Navigate to **Coach Mode** tab.
   - Press **Shift + D** and click **OFFSIDE**. Stream pauses, drawing the offside trap annotation. Notice the explanation for *Dad (expert)*: *"Rule 11 violation: attacker's playable body part was in the opponent's half..."*.
   - In Demo Director, switch profile to **Kid (Maya)** and click **OFFSIDE** again. Notice the tone instantly transforms to Maya's comedian tone: *"He was so eager for cookies he ran into the kitchen before they came out of the oven!"*.
   - Click **Right Call 👍** on the family vote (+25 pts).

2. **Minute 0:45 - 1:30 | Learn-Then-Quiz Loop**:
   - In the explanation card, select **"Take Family Rule Quiz 🏆"**.
   - Notice the freshly injected Offside rule question at the top of the Family Trivia deck.
   - Select option **B** with the D-pad; celebrate with confetti and points credited to Maya!

3. **Minute 1:30 - 2:15 | Halftime Fitness Blitz & Goal Celebration**:
   - Press **Shift + D** and click **HALFTIME**.
   - The **Halftime 30s Fitness Challenge** launches in Simulation Mode, counting squats with pose trigonometry and awarding the **"Halftime Hero"** badge.
   - Return to match, press **Shift + D**, and click **GOAL**.
   - Stadium roar audio plays with confetti, and the **Cheer Meter** fills up to unlock the **"Cheer Leader"** badge (+50 pts).

4. **Minute 2:15 - 3:00 | Multi-Modal Fusion & Family Pulse**:
   - Go to **Voice & Gestures** tab. Test point + "Explain that" to verify &lt;300ms fused command execution and couch seat detection.
   - Switch to **Family Pulse** tab to see the weekly family recap with updated scores, reps, and unlocked badges!
