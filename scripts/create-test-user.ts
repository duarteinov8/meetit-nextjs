import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import User from '../src/lib/models/User';

async function createTestUser() {
  if (!process.env.MONGODB_URI) {
    console.error('Please set MONGODB_URI in your .env.local file');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test user
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    // Check if user already exists
    const existingUser = await User.findOne({ email: testUser.email });
    if (existingUser) {
      console.log('Test user already exists');
      await client.close();
      return;
    }

    // Create new user
    const user = await User.create(testUser);
    console.log('Test user created successfully:', {
      id: user._id,
      name: user.name,
      email: user.email,
    });

    await client.close();
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser(); 