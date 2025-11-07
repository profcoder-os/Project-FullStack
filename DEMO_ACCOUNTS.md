# Demo Accounts

Quick login credentials for testing the collaborative editor.

## Demo Users

| Email | Password | Role |
|-------|----------|------|
| alice@demo.com | demo123 | User |
| bob@demo.com | demo123 | User |
| charlie@demo.com | demo123 | User |
| admin@demo.com | admin123 | Admin |

## How to Use

1. Go to the login page: `http://localhost:3000/login`
2. Enter any of the email addresses above
3. Use the corresponding password
4. Start collaborating!

## Re-seed Demo Accounts

If you need to recreate the demo accounts (e.g., after clearing the database):

```bash
cd server
npm run seed
```

## Testing Collaboration

1. Open the app in multiple browser windows/tabs
2. Login with different accounts (e.g., alice in one, bob in another)
3. Create or open the same document
4. Start typing - you'll see real-time collaboration!



