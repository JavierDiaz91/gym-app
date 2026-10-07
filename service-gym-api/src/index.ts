import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express from "express";
import cors from "cors";
import membersRoutes from "./routes/members.routes";
import routinesRoutes from "./routes/routines.routes";
import memberRoutinesRoutes from "./routes/memberRoutines.routes";
import routineExercisesRoutes from "./routes/routineExercises.routes";
import trainersRoutes from "./routes/trainers.routes";
import gymsRoutes from "./routes/gyms.routes";
import attendanceRoutes from "./routes/attendance.routes";
import membershipRoutes from "./routes/membership.routes";
import paymentsRoutes from "./routes/payments.routes";
import mercadoPagoRoutes from "./routes/mercadopago.routes";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin no permitido por CORS"));
    },
  })
);
app.use(express.json());

app.use("/api/memberships", membershipRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/routines", routinesRoutes);
app.use("/api/member-routines", memberRoutinesRoutes);
app.use("/api/routine-exercises", routineExercisesRoutes);
app.use("/api/trainers", trainersRoutes);
app.use("/api/gyms", gymsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/mercadopago", mercadoPagoRoutes);

// REDIRECCIÓN TRAS PAGO EN MERCADO PAGO (Ngrok Backend -> Next.js Frontend)
app.get("/miembro", (req, res) => {
  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  
  res.redirect(`${frontendUrl}/miembro?${queryParams}`);
});

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});