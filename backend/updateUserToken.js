require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const updateUserToken = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the faculty1 user
    const user = await User.findOne({ username: 'faculty1' });
    if (!user) {
      console.log('User faculty1 not found');
      return;
    }

    // Reorder roles to put panel first
    const panelRole = user.roles.find(r => r.role === 'panel');
    const otherRoles = user.roles.filter(r => r.role !== 'panel');
    
    if (panelRole) {
      user.roles = [panelRole, ...otherRoles];
      await user.save();
      console.log('Updated user roles - panel role is now first');
      console.log('New roles order:', user.roles.map(r => r.role));
    } else {
      console.log('No panel role found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

updateUserToken(); 