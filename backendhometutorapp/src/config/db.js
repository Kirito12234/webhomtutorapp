const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is missing. Copy env.example to .env and set your MongoDB connection string."
    );
  }

  if (mongoUri.includes("<") || mongoUri.includes(">")) {
    throw new Error(
      "MONGO_URI contains placeholder text. Replace with your real MongoDB connection string."
    );
  }

  const explicitDbName = process.env.DB_NAME?.trim();
  const conn = explicitDbName
    ? await mongoose.connect(mongoUri, { dbName: explicitDbName })
    : await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;




