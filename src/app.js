import express from 'express';

import cors from "cors";
const app = express();
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({limit: "10mb", extended: true}));
app.use(express.static("public"));
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
    allowHeaders: ["Content-Type", "Authorization"]

}));
import healthcheckRoutes from "./routes/healthcheck.routes.js";
app.use("/api/v1/healthcheck", healthcheckRoutes);

export default app;