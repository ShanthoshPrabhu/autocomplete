## Setup Steps

1. **Clone the Repository**
   ```sh
   git clone https://github.com/ShanthoshPrabhu/autocomplete.git
   cd autocomplete
   ```

2. **Install Dependencies**
   ```sh
   npm install
   ```

3. **Configure Environment Variables**
   - Copy the example environment file and update it with your own values:
     ```sh
     cp .env.example .env
     ```
   - Edit `.env` to set your API base URL and Firebase config (see below).

4. **Start the Development Server**
   ```sh
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173) by default.

---

## 🔌 API Usage

- The frontend expects an autocomplete API endpoint, which should be set in your `.env` file as `VITE_API_BASE_URL`.
- The autocomplete endpoint should accept a `query` parameter and return suggestions in the following format:
  ```json
  {
    "suggestions": ["suggestion1", "suggestion2", ...]
  }
  ```
- Example request:
  ```
  GET {VITE_API_BASE_URL}/autocomplete?query=yourText&limit=10
  ```
- The request must be authenticated with a Firebase ID token in the `Authorization` header.

---

## Firebase Setup Notes

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.

2. **Register a Web App**
   - In your Firebase project, add a new web app and copy the Firebase config object.

3. **Update `.env` with Firebase Config**
   - Add your Firebase config values to the `.env` file:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_API_BASE_URL=http://localhost:8000  # or your backend URL
     ```
   - Make sure all required Firebase fields are present.

4. **Enable Authentication**
   - In the Firebase Console, enable the authentication method(s) you want to use (e.g., Email/Password, Google).
