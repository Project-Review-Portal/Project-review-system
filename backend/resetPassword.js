require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the admin user
    const user = await User.findOne({ role: 'admin' });
    if (!user) {
      console.log('Admin user not found');
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('cseceg2024@admin', salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log('Admin password has been reset to the default password: cseceg2024@admin');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

resetPassword(); 