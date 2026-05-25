## Project Brief: Live Room - Discovery Swiping Experience

**Project Title:** Live Room: Discovery Swiping
**Date:** October 26, 2023
**Version:** 1.0
**Product Area:** Icebreaker Live / Social Discovery

---

### 1. Problem Statement / Opportunity

Currently, users need a more engaging and interactive way to discover and connect with other participants within time-boxed "Icebreaker Live" rooms. The existing experience lacks a dynamic, one-by-one interaction model that highlights personality through prompt answers and facilitates immediate connection.

### 2. Project Goal(s)

*   To create an immersive and engaging discovery experience within "Icebreaker Live" rooms.
*   To enable users to discover other participants one-by-one, focused on their prompt answers.
*   To facilitate clear and intuitive interaction (Like, Pass, Gift) with other profiles.
*   To enhance user engagement and connection rates within live events.

### 3. Target Audience

Users participating in "Icebreaker Live" events who are looking to connect with others based on shared interests, prompt answers, and real-time interaction.

### 4. Feature Name

**Live Room: Discovery Swiping**

### 5. Feature Description

This feature introduces a dedicated swiping interface within "Icebreaker Live" rooms. Users will be presented with one profile at a time, showcasing a large profile photo, their answer to the room's "Prompt of the Day," and key profile information. A set of intuitive controls will allow users to express interest (Like), pass, or send a virtual gift, all within the context of a time-limited live event. The design emphasizes a modern, engaging aesthetic with glassmorphic elements and subtle neon micro-interactions.

### 6. Key User Flows

1.  **Enter Live Room:** User navigates to an "Icebreaker Live" event (e.g., "Rooftop Mixer") from the 'Icebreaker Live' section in the mobile navigation.
2.  **Initiate Discovery:** Upon entering the room, the user is automatically presented with the "Discovery Swiping" screen.
3.  **View Profile:** The screen displays a single participant's profile, including their photo, prompt answer, name, age, and verification status.
4.  **Time Awareness:** The user is clearly informed of the remaining time for the current Live Room session.
5.  **Interact:** The user chooses one of the following actions:
    *   **Like:** Taps the glowing 'Heart' button to express interest.
    *   **Pass:** Taps the glassmorphic 'X' button to move to the next profile.
    *   **Gift:** Taps the 'Gift' icon to initiate a gifting flow (details for gifting flow are out of scope for this brief but the button should be present).
6.  **Next Profile:** After any interaction (Like/Pass/Gift), the next available participant's profile is loaded.
7.  **Room Ends:** When the room time expires, the user is notified, and the swiping experience concludes.

### 7. Detailed UI/UX Requirements

*   **Screen Title:** "Live Room: Discovery Swiping"
*   **Context:** Designed for the discovery experience within an 'Icebreaker Live' room.
*   **Mobile Navigation:** This screen is accessed via the 'Icebreaker Live' section in the app's main navigation (`['Home', 'Icebreaker Live', 'Venues', 'Chats', 'Profile']`).
*   **Visuals & Layout:**
    *   **Background:** Deep #0A0A0C gradient, providing a premium, dark aesthetic.
    *   **Top Overlay (Room Info):**
        *   Glassmorphic pill component at the top.
        *   Displays event name and time remaining (e.g., "Rooftop Mixer · 14m left").
        *   Includes a pulsing pink dot next to the time, indicating live activity.
    *   **Center (Profile Card):**
        *   Large, full-bleed, high-quality photo of the person being viewed (e.g., 'Maya, 24').
        *   **Prompt Answer Overlay:** A prominent translucent glass card overlaid directly on the photo. This card displays the user's answer to the current room's prompt (e.g., "The worst first date idea is... Going to a silent retreat").
        *   **Profile Info Panel:** A semi-transparent panel positioned below the prompt answer card, displaying the person's name, age, and a 'Selfie-Verified' badge.
    *   **Bottom Controls (Action Buttons):** Three circular, glowing buttons arranged horizontally.
        *   **Pass:** Glassmorphic 'X' icon (leftmost).
        *   **Gift:** Small 'Gift' icon in Cyan (center).
        *   **Like:** Large, glowing 'Heart' icon in Electric Pink (rightmost).
*   **Micro-interactions:**
    *   Subtle pink neon glow around the profile card when it's active.
    *   Active buttons (Like/Gift) should have a distinct glowing effect on tap/hover.
*   **Typography:** Use Plus Jakarta Sans for all text elements.

### 8. Technical Considerations

*   **Real-time Data:** Integration required for dynamic room name, time remaining, and participant loading.
*   **API Endpoints:**
    *   Fetch Live Room details (name, time limit, current prompt).
    *   Fetch next available participant profile (photo, name, age, verification status, prompt answer).
    *   Send 'Like' action.
    *   Send 'Pass' action.
    *   Initiate 'Gift' flow.
*   **Performance:** Optimized loading of high-resolution images to ensure a smooth swiping experience.
*   **State Management:** Handle loading states, empty room states, and end-of-room states gracefully.
*   **Animation:** Implement smooth transitions for profile loading and button interactions.

### 9. Success Metrics

*   **Live Room Engagement Rate:** Percentage of users who enter a Live Room and engage with at least one profile.
*   **Like-to-View Ratio:** Number of 'Likes' per profile viewed.
*   **Gift-to-View Ratio:** Number of 'Gifts' per profile viewed.
*   **Match Rate (post-implementation):** Percentage increase in mutual matches generated within Live Rooms.
*   **Session Duration:** Average time spent by users in the Live Room Discovery Swiping interface.

### 10. Out of Scope (for this phase)

*   The full "Mutual Match" celebration screen.
*   Detailed UI/UX and backend logic for the "Gift a Drink" flow (only the button will be present).
*   Implementation of a "Boost" button to increase profile visibility.
*   Chat functionality within the Live Room or post-match.
*   Admin tools for managing Live Room participants or prompts.

---