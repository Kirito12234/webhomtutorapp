import { asyncHandler } from "../../../shared/utils/asyncHandler.js";
import { authService } from "../application/auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ success: true, data: user });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});
