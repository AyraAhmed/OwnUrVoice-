// Import the app configuration from app.js
const app = require("./app");

// Import the authentication routes
const authRoutes = require('./routes/auth');

// Set the PORT from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Add the authentication routes
app.use('/api/auth', authRoutes);

// Start the server and listen on the specified PORT
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});