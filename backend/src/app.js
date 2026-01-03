import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/index.js";
import { errorMiddleware } from "./shared/errors/errorMiddleware.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "hometutorweb-api",
    status: "OK"
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "hometutorweb-api",
    status: "OK"
  });
});

app.use("/api", routes);

app.use(errorMiddleware);

export default app;
