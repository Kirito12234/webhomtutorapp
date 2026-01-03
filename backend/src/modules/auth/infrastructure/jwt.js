import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";

export const signToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
};
