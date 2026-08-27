import "dotenv/config";
import express from "express";
import cors from "cors";
import membersRoutes from "./routes/members.routes";
import routinesRoutes from "./routes/routines.routes";
import memberRoutinesRoutes from "./routes/memberRoutines.routes";
import routineExercisesRoutes from "./routes/routineExercises.routes";
import trainersRoutes from "./routes/trainers.routes";
import gymsRoutes from "./routes/gyms.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/members", membersRoutes);
app.use("/api/routines", routinesRoutes);
app.use("/api/member-routines", memberRoutinesRoutes);
app.use("/api/routine-exercises", routineExercisesRoutes);
app.use("/api/trainers", trainersRoutes);
app.use("/api/gyms", gymsRoutes);
app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
