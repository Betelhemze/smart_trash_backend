# Smart Trash Backend

A Node.js/Express backend for a smart trash collection and rewards platform. The API supports user registration/login, trash drop tracking, reward creation/redemption, smart bin management, and QR code scanning.

## Features

- User registration and login with hashed phone data
- JWT-based authentication for protected endpoints
- Trash drop submission with point calculation
- Reward listing, creation, and update
- Reward redemption and user redemption history
- Smart bin listing, creation, status updates, and lookup
- QR code scan processing for trash drops
- PostgreSQL database backend via `pg`

## Tech Stack

- Node.js
- Express
- PostgreSQL
- `pg`
- `bcrypt`
- `jsonwebtoken`
- `dotenv`
- `cors`

## Getting Started

### Install dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
PORT=3000
PGHOST=localhost
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=your_db_name
PGPORT=5432
```

> Note: The project currently uses a hard-coded JWT secret value of `your_secret_key` inside `src/middleware/auth.js`, `src/middleware/adminAuth.js`, and `src/routes/users.js`. For production, replace this with a secure secret or update the code to read from an environment variable.

### Start the server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server listens on `PORT` or defaults to `3000`.

## Project Structure

- `server.js` - application entrypoint and database connection startup
- `src/app.js` - Express app configuration and route registration
- `src/config/db.js` - PostgreSQL connection pool setup
- `src/routes/` - API route definitions
- `src/middleware/` - authentication and admin authorization middleware

## API Endpoints

### User Routes

- `POST /users/register`
  - Request body: `full_name`, `username`, `phone_hash`
  - Registers a new user with hashed phone data.

- `POST /users/login`
  - Request body: `username`, `phone_hash`
  - Returns a JWT token on success.

- `GET /users/:id`
  - Returns user details: `user_id`, `full_name`, `username`, `total_points`, `created_at`.

### Trash Drop Routes

- `POST /trashdrops`
  - Auth required
  - Request body: `bin_id`, `trash_type`, `item_count`
  - Records a trash drop and awards points.

- `GET /trashdrops/:user_id`
  - Returns all trash drops for a user.

### Reward Routes

- `GET /rewards`
  - Returns active rewards.

- `POST /rewards`
  - Admin auth required
  - Request body: `reward_name`, `description`, `required_points`
  - Creates a new reward.

- `PATCH /rewards/:reward_id`
  - Admin auth required
  - Request body: `reward_name?`, `description?`, `required_points?`, `active?`
  - Updates a reward.

### Redemption Routes

- `POST /redemptions`
  - Auth required
  - Request body: `reward_id`
  - Redeems a reward and deducts points from the user.

- `GET /redemptions/:user_id`
  - Auth required
  - Returns redemption history for the authenticated user.

### Smart Bin Routes

- `GET /smartbins`
  - Returns all smart bins.

- `POST /smartbins`
  - Admin auth required
  - Request body: `location`, `status?`
  - Creates a new bin.

- `PATCH /smartbins/:bin_id/status`
  - Admin auth required
  - Request body: `status` (`active` or `inactive`)
  - Updates bin status.

- `GET /smartbins/:bin_id`
  - Returns details for a specific bin.

### QR Code Routes

- `POST /qrcodes/scan`
  - Auth required
  - Request body: `qr_id`, `trash_type`, `item_count`
  - Processes a QR code scan, awards points, and marks the QR code as used.

- `GET /qrcodes/:bin_id`
  - Returns QR codes for a specific bin.

## Authentication

- Protected endpoints require an `Authorization: Bearer <token>` header.
- Tokens are issued by `POST /users/login`.
- Admin routes require `is_admin` to be true in the JWT payload.

## Database Notes

- The DB connection is configured in `src/config/db.js`.
- The code expects a PostgreSQL database with tables such as `users`, `trashdrops`, `rewards`, `redemptions`, `smartbins`, and `qrcodes`.
- SSL is enabled with `rejectUnauthorized: false` for platforms like Render.

## Improvements / TODO

- Move JWT secret into `.env`
- Add proper error handling for database schema issues
- Add tests and validation middleware
- Implement role-based admin setup and secure admin user creation
