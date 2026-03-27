require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 3000, family: 4 });
    console.log('MongoDB Connected to Atlas!');
  } catch (err) {
    console.log('Atlas connection blocked by network. Booting up Local Memory MongoDB...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('MongoDB Connected to Local Memory (Note: Data resets when server restarts)');
  }
};
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/resumes', require('./routes/resumeRoutes'));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle SPA routing (Send index.html for all other routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
