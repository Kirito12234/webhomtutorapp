import express from "express";
import { validateDto } from "../../../shared/utils/validateDto.js";
import { RegisterDto, LoginDto } from "../application/auth.dto.js";
import { register, login } from "./auth.controller.js";

const router = express.Router();

router.post("/register", validateDto(RegisterDto), register);
router.post("/login", validateDto(LoginDto), login);

export default router;
