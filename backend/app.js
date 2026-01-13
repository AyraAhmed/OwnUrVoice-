const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());  // Enable CORS for frontend communication
app.use(express.json());  // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'OwnUrVoice API is running' });
});

module.exports = app;
