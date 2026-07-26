import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connOptions = {
      autoIndex: true, // Build indexes; set to false in high-scale production to avoid performance hits
      maxPoolSize: 10, // Maintain up to 10 socket connections simultaneously
      serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds before failing
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, connOptions);
    
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    // Exit the process with failure if the initial connection fails
    process.exit(1);
  }
};

// Monitor connection events for runtime stability
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB connection lost. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB runtime error: ${err.message}`);
});

export default connectDB;