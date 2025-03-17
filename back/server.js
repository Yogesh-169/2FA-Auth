import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import User from "./models/User.js"; // Import user model
import passport from "passport";
import { Server } from "socket.io";

// const http = require("http");
import http from "http";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "http://localhost:3000" } // React Frontend URL
});

app.use(cors());

app.use(bodyParser.json());
app.use(express.json());

app.use(
    session({
        secret: "your_secret_key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true in production with HTTPS
    })
);

// **Initialize Passport**
app.use(passport.initialize());
app.use(passport.session());

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log(err));


// Camera Schema
const CameraSchema = new mongoose.Schema({
    name: String,
    status: String,
});

const Camera = mongoose.model("Camera", CameraSchema);




app.get("/api/cameras", async (req, res) => {
    try {
        const cameras = await Camera.find();
        res.json(cameras);
    } catch (error) {
        res.status(500).json({ error: "Error fetching cameras" });
    }
});

app.put("/api/cameras/:id", async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const camera = await Camera.findByIdAndUpdate(id, { status }, { new: true });

        if (!camera) {
            return res.status(404).json({ error: "Camera not found" });
        }

        io.emit("cameraStatusUpdated", camera); // 🔥 Notify all clients

        res.json(camera);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});


// 3️⃣ Add a new camera (For Testing)
app.post("/api/cameras", async (req, res) => {
    try {
        const { name, id, status } = req.body;
        const newCamera = new Camera({ name, id, status });
        await newCamera.save();
        res.status(201).json(newCamera);
    } catch (error) {
        res.status(500).json({ error: "Error adding camera" });
    }
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:5000/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user) {
                    user = new User({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        isVerified: true,
                    });

                    await user.save(); // Save only if user does not exist
                }

                const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
                    expiresIn: "1h",
                });

                return done(null, { user, token });
            } catch (err) {
                return done(err, null);
            }
        }
    )
);



// **Serialize & Deserialize User**
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Email Transporter (Nodemailer)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// **Routes**



app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// **Google Callback Route**
app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        const token = req.user.token;
        res.redirect(`http://localhost:3000/dashboard?token=${token}`);
    }
);


// User Registration Route
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP

    const newUser = new User({ name, email, password: hashedPassword, otp });

    try {
        await newUser.save();

        // Send OTP via Email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Email Verification OTP",
            text: `Your OTP is: ${otp}`,
        });

        req.session.email = email; // Store email in session
        res.json({ message: "User registered. Check email for OTP." });
    } catch (error) {
        res.status(500).json({ error: "Error registering user" });
    }
});

// OTP Verification Route
app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (user && user.otp == otp) {
        user.isVerified = true;
        await user.save();
        req.session.user = user._id;
        res.json({ message: "User verified successfully" });
    } else {
        res.status(400).json({ error: "Invalid OTP" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({ error: "User not found" });
    }

    if (!user.isVerified) {
        return res.status(403).json({ error: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT Token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });

    req.session.user = user._id; // Store user session
    res.json({ message: "Login successful", token, user });
});

// **Logout Route**
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Logout failed" });
        res.json({ message: "Logged out successfully" });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));