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

app.use(cors());
app.use(express.json());

// Verificación en consola al arrancar
console.log("--- VARIABLES DE ENTORNO CARGADAS ---");
console.log("MP_CLIENT_ID:", process.env.MP_CLIENT_ID);
console.log("NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
console.log("MP_ACCESS_TOKEN:", process.env.MP_ACCESS_TOKEN ? "CARGADO CORRECTAMENTE" : "NO ENCONTRADO ❌");
console.log("-------------------------------------");

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