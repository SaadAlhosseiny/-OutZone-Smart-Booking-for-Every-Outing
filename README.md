# OutZone

OutZone is a full-stack entertainment booking platform for Cairo with restaurants, cafes, cinemas, karting, escape rooms, museums, kids areas, VR gaming, bowling, and art workshops.

## Backend

1. Install Python dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```

2. Create a MySQL database named `outzone` and set environment variables:
   ```bash
   export MYSQL_USER=root
   export MYSQL_PASSWORD=password
   export MYSQL_HOST=localhost
   export MYSQL_DB=outzone
   ```

3. Run the backend:
   ```bash
   python app.py
   ```

## Frontend

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

## Notes

- Backend listens on `http://localhost:5000`.
- Frontend uses the backend API base URL from `VITE_API_BASE_URL`.
- Default admin user is created automatically: `admin@outzone.local` / `adminpass`.
