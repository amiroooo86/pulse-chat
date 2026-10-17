# Pulse Chat

Pulse Chat is a responsive real-time messaging web application built with React, Node.js, Express, Socket.IO, and SQLite via `sql.js`.

## Features

- Username and password registration and authentication
- Private conversations and group chats
- Real-time text messages and image sharing
- Group creation and member management
- User search and profile picture uploads
- Message replies and reactions
- Unread message indicators and read markers
- Light and dark themes with multiple color palettes
- Pulsy balance, emotes, and profile borders
- Responsive desktop and mobile layouts

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, Axios, Lucide React |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO |
| Database | SQLite through `sql.js` |
| Authentication | JSON Web Tokens and bcryptjs |
| Image uploads | Multer |

## Requirements

- Node.js 24.x
- npm

## Run on Windows

1. Download or clone this repository.
2. Open the project folder.
3. Run `start.bat`.
4. The script creates `server/.env` from `server/.env.example` if needed, installs missing dependencies, and starts the frontend and backend.
5. Open `http://localhost:5173` in your browser.

The first launch needs an internet connection to install npm dependencies.

## Manual setup

Install the backend and frontend dependencies from the project root:

```bash
npm install --prefix server
npm install --prefix client
```

Create `server/.env` from `server/.env.example`, set a unique `JWT_SECRET`, then start the services in separate terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

The backend defaults to `http://localhost:3000` and the Vite frontend defaults to `http://localhost:5173`.

## Environment configuration

Backend configuration is read from `server/.env`:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend port | `3000` |
| `CLIENT_URL` | Allowed frontend origin | `http://localhost:5173` |
| `JWT_SECRET` | Secret used to sign session tokens | Must be set locally |
| `DB_FILE` | SQLite database path | `./data/chat.sqlite` relative to the server directory |
| `UPLOAD_DIR` | Uploaded image directory | `./uploads` relative to the server directory |

The frontend optionally supports `VITE_API_URL` in `client/.env`; when omitted, it uses `http://localhost:3000`.

## Data and privacy

Runtime data is intentionally excluded from this repository. The SQLite database, uploaded images, and local environment files are not included, because they may contain personal information or secrets. On first launch, Pulse Chat creates a fresh local database. Keep your own database and uploads backed up separately before replacing or updating an existing installation.

Never commit real credentials, session secrets, private user data, or production uploads to GitHub. Use a unique random `JWT_SECRET` for every deployment.

## Project structure

```text
pulse-chat/
├── client/
│   ├── public/emotes/       # Emote image assets
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── context/        # React context providers
│       ├── pages/          # Main application pages
│       ├── services/       # API client
│       └── styles/         # Application styles
├── server/
│   └── src/
│       ├── database/       # Database setup and admin utility
│       ├── middleware/     # Authentication middleware
│       ├── routes/         # HTTP API routes
│       └── sockets/        # Socket.IO handlers
├── .editorconfig
├── .gitignore
├── package.json
└── start.bat
```

## Notes

- The repository does not include `node_modules`; install dependencies using the commands above.
- `server/data/` and `server/uploads/` are runtime directories. Their contents should remain local and must not be committed.
- This repository does not currently declare an open-source license. Add a license only after deciding how you want others to use and redistribute the project.
