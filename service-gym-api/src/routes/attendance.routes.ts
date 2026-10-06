import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller";

const router = Router();

router.post("/check-in", AttendanceController.checkIn);

export default router;