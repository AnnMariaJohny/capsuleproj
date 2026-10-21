# Reloop — E-waste Collection and Recycling Portal

Reloop is a MERN application for responsible e-waste collection. The dashboard includes the citizen pickup journey plus interactive previews of driver, recycling-partner, corporate, and community workflows.

## Project structure

```text
project-root/
  client/
    src/
      assets/           Static images and artwork
      components/       Reusable UI and feature workflows
      pages/            Dashboard screens
      services/         API client and reward calculations
      styles/           Page-specific styles
    .env.example        Public frontend API URL only
    package.json
  server/
    src/
      middleware/       Authentication and request guards
      controllers/      Request handling and business logic
      models/           Mongoose schemas
      routes/           Resource paths mapped to controllers
      app.js            Express middleware and route wiring
      server.js         Environment, database and server startup
    .env.example        Variable names and local placeholders only
    package.json
    package-lock.json
  .gitignore
  README.md             Setup, architecture, API and validation guide
```

Routes only map methods and paths to controllers. Controllers validate input and coordinate persistence; models define schema constraints. The React page uses a shared API client for HTTP calls, and the API base URL comes from environment configuration.

## Included workflows

- Separate individual and company signup / login, with the same complete sidebar, feature screens, and account-private pickup requests for both account types.
- Passwords are scrypt-hashed on the server. API sessions use signed bearer tokens; configure a private `AUTH_TOKEN_SECRET` of at least 32 characters.
- Pickup scheduling estimates eco points and an illustrative INR eco-credit value from category, device age, and total weight. The estimate is not a cash payout or guaranteed price. Postal code and collection slot are saved with the request; company route grouping uses those saved details.

- Pickup scheduling with category, quantity, device age, estimated weight, address, and pickup date.
- Estimated reward points based on category, age, and weight; points are credited when a request reaches `Collected` or `Processed`. Reward options include a voucher, brand coupon, and eco product.
- Personal impact dashboard for recycled weight and estimated CO₂ avoided, with illustrative gold and copper recovery figures.
- Interactive device data-wiping checklist.
- Photo AI classification through an optional OpenAI-compatible vision endpoint. The user must consent before the image is sent; the server holds the API key, validates the response, and returns a cautious category / visual hazard estimate.
- Driver route batching by postal code and collection slot, plus a pickup-proof form for bag ID, item photo, and drawn signature.
- Drop-off directory with hours, accepted categories, schematic Bengaluru map, and map directions.
- Partner inventory moving through sorting, dismantling, component extraction, and raw-material recovery.
- Refurbish-versus-recycle triage, sample recycling certificate download, corporate bulk-pickup / destruction request, and ESG report preview.
- Community drive sign-up with a shared goal progress bar.

Both account types share the same screens, including route planning, pickup proof, asset recovery, certificates, corporate/bulk tools, and community drives. Account-scoped workspace data (data-wiping checklist, reward redemptions, pickup proof images/signatures, inventory stages, refurbish decisions, corporate drive requests, and community signups) is saved through the authenticated API. Pickup proof accepts up to four records per account and limits each photo to 1 MB. Centers and sample inventory are illustrative; inventory entries are not recycler-verified assets. Route planning groups the signed-in account's open pickups by postal code and selected time slot; it does not calculate road distance or traffic. The sample certificate is not legal proof of destruction or EPR compliance. Traffic-aware routing, QR camera scanning, partner certifications, payment processing, and production operations require additional integrations and authorization. The vision provider's image analysis is only a visual estimate, not a materials test or safety certification. When the vision service is unavailable, a local fallback uses the user's selected category and clearly does not analyze the image.

## Run the frontend

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). Copy `.env.example` to `.env` only if you need to override the API URL.

## Run the API

```powershell
cd server
npm install
Copy-Item .env.example .env
npm run dev
```

Set `MONGODB_URI` in `server/.env` to a local MongoDB instance or MongoDB Atlas connection string for persistent accounts, pickup requests, and workspace records. Without it, the API uses temporary in-memory storage that is cleared when the server stops. `CLIENT_URL` is the comma-separated allowlist for frontend origins.

Accounts and pickup data also use MongoDB when configured. In memory mode, test accounts and pickup records are lost when the API stops. Copy `AUTH_TOKEN_SECRET` from `.env.example` to a private random value of at least 32 characters; the server refuses the example placeholder. If no secret is configured in local development, sessions are invalidated when the server restarts.

Keep real values in the ignored `server/.env` file. Never commit it. The committed `.env.example` files contain configuration names and local placeholders only; Vite `VITE_*` variables are public and must never contain secrets.

To enable photo classification, configure `VISION_API_URL` (the full OpenAI-compatible chat-completions URL), `VISION_API_KEY`, and `VISION_MODEL` in `server/.env`. The API does not save uploaded images. Without these values, classification returns a clear `503` configuration message.

## API

- `GET /api/health` — API and storage status.
- `POST /api/auth/register` — create an individual or company account.
- `POST /api/auth/login` — sign in with the selected account type.
- `GET /api/auth/me` — read the authenticated account.
- `GET /api/centers` — recycling center directory.
- `GET /api/requests?category=Computers&area=Indiranagar` — list the authenticated account's requests with optional filters.
- `POST /api/requests` — create an account-scoped pickup and calculate estimated eco points and value.
- `PATCH /api/requests/:id/status` — reserved for authorized recycling partners; individual and company donor accounts receive `403`.
- `GET /api/workspace` — read the authenticated account's workspace feature records and community signup count; proof image/signature files are not included in this response.
- `PUT /api/workspace/:kind` — save validated account-scoped checklist, rewards, inventory, refurbish, corporate, or community data.
- `POST /api/workspace/proofs` — save one authenticated pickup proof with its condition photo and captured signature.
- `POST /api/classifications` — classify an explicitly consented image using the configured vision provider.

## Validation

Run these from separate PowerShell terminals at the project root:

```powershell
cd client
npm run lint
npm run build
```

```powershell
cd server
npm run dev
```

Then verify `http://localhost:5000/api/health` and test registration, login, authenticated/unauthenticated routes, invalid payloads, and account ownership. With MongoDB omitted, API smoke tests use temporary in-memory storage. Check `git status` before committing and confirm no `.env`, `node_modules/`, or generated `dist/` files are staged.
