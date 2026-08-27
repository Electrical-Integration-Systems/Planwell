<div align="center">
	<img src="public/planwell-logo.svg" alt="Planwell logo" width="80">
  <h1>Planwell</h1>
	<p>Collaborative task and project tracking for engineering teams.</p>
</div>

## Overview

Planwell is a list-based work management application for coordinating projects,
tasks, updates, files, devices, and audit history in real time.

## Features

- Configurable task states, priorities, tags, and assignees
- Multi-filter and multi-column task sorting
- Project and task updates with audit history
- File, photo, device, and credential management
- Google authentication and real-time Convex data

## Stack

Next.js 16, React 19, TypeScript, Convex, Convex Auth, Tailwind CSS 4, and
shadcn/ui. Planwell is designed for deployment on Vercel.

## Development

Requirements: Node.js 20 or later, npm, a Convex deployment, and Google OAuth
credentials configured for Convex Auth.

```bash
npm install
npm run dev
```

Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`. Configure authentication secrets
in the Convex deployment environment.

## Commands

```bash
npm run dev           # Start Next.js and Convex
npm run dev:frontend  # Start Next.js only
npm run dev:backend   # Start Convex only
npm run lint          # Run ESLint
npm run build         # Create a production build
```

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
Do not open public issues for security-sensitive reports.

## License

Planwell is proprietary software. All rights are reserved. See
[LICENSE](LICENSE) for terms.
