# Guild of The Void

## Project Overview

"Guild of The Void" is a web application designed to help users manage their characters and organize gaming sessions. It provides a platform for Game Masters to schedule and manage sessions, and for players to track their characters, join upcoming sessions, and view character details.

## Key Features

*   **Character Management:** Create, edit, and delete your game characters.
*   **Session Scheduling:** Game Masters can create and manage upcoming and past sessions.
*   **Session Participation:** Players can join and leave sessions with their characters.
*   **XP Tracking:** Sessions award experience points to participating characters.
*   **Visual Cues:** Sessions are highlighted with a yellow border if owned by the current user and a green background if one of the user's characters has joined.
*   **7-Day Overview:** A calendar-like view of upcoming sessions for the next seven days, with visual cues for owned and joined sessions.
*   **Character Website Links:** Characters can have an associated website link, editable by the owner and visible to all in session details.
*   **Session Locking:** Game Masters can lock sessions to finalize attendance and XP awards.

## Technologies Used

*   **Next.js:** React framework for building server-rendered and static web applications.
*   **React:** Frontend library for building user interfaces.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
*   **Convex:** Full-stack development platform providing a real-time database and serverless functions.
*   **Clerk:** User authentication and management solution.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm, yarn, pnpm, or bun (your preferred package manager)
*   A Convex account and project set up.
*   A Clerk account and application set up.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/void-guild.git
    cd void-guild
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```

3.  **Convex Setup:**
    *   Obtain your `CONVEX_URL` from your Convex project dashboard.
    *   Add it to your `.env.local` file:
        ```
        CONVEX_URL=https://<your-project-name>.convex.cloud
        ```
    *   Ensure your Convex authentication is configured with Clerk as per Convex documentation.

4.  **Clerk Setup:**
    *   Follow the Clerk documentation to create an application and get your API keys.
    *   Add the following environment variables to your `.env.local` file:
        ```
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_your_publishable_key
        CLERK_SECRET_KEY=sk_your_secret_key
        ```
    *   Ensure your Convex authentication is configured with Clerk as per Convex documentation.

### Running the Development Server

Once everything is set up, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
