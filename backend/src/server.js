import app from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

const start = async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
