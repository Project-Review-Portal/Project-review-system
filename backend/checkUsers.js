require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const users = await User.find({}).select('username name roles memberType');
    console.log('\nAvailable users:');
    users.forEach(user => {
      console.log(`Username: ${user.username}, Name: ${user.name}, Roles: ${JSON.stringify(user.roles)}, MemberType: ${user.memberType}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkUsers(); 