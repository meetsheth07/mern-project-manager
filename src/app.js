import express from 'express';
import cookieParser from 'cookie-parser';
import cors from "cors";
import { apiError } from './utils/api-errors.js';
import { apiResponse } from './utils/api-response.js';
const app = express();
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({limit: "10mb", extended: true}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"],
    allowHeaders: ["Content-Type", "Authorization"]

}));
import healthcheckRoutes from "./routes/healthcheck.routes.js";
import authRoutes from "./routes/auth.routes.js";
app.use("/api/v1/healthcheck", healthcheckRoutes);
app.use("/api/v1/auth", authRoutes);

app.use((err, req, res, next) => {
    if (err instanceof apiError) {
        return res.status(err.statuscode || 500).json(
            new apiResponse(err.statuscode || 500, err.message, err.errors || [])
        );
    }

    console.error(err);
    return res.status(500).json(new apiResponse(500, "Internal server error", []));
});

export default app;