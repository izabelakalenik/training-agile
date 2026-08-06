# ShiftBoard

Day/night handoff board with shift stats and colour rails. Zero dependencies.

```bash
npm start
# http://127.0.0.1:3903/
```

Open the board — day/night/pinned counts and notes with shift tags. Tracks fill pin controls, the create side panel, and All/Day/Night tabs.

## API (starter)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | liveness |
| GET | `/api/notes` | `{ notes: [...] }` |
| POST | `/api/notes` | **501** until Track Bravo |
| PATCH | `/api/notes/:id` | **501** until Track Alpha |
