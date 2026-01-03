import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/AppError.js";
import { userRepository } from "../infrastructure/user.repository.js";
import { toUserEntity } from "../domain/user.entity.js";
import { signToken } from "../infrastructure/jwt.js";

const normalizeEmail = (email) => email.toLowerCase();

const register = async ({ email, password, role }) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await userRepository.findByEmail(normalizedEmail);
  if (existing) {
    throw new AppError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.createUser({
    email: normalizedEmail,
    passwordHash,
    role: role || "user"
  });

  return toUserEntity(user);
};

const login = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = signToken({ sub: user._id.toString(), role: user.role });

  return {
    token,
    user: toUserEntity(user)
  };
};

export const authService = {
  register,
  login
};
