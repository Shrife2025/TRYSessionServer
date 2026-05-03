import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors"
import DB from "./src/db.js"
import User from "./models/User.js"
const app = express();
const port = 9000;
app.use(express.json())
app.use(
  cors({
    origin: "https://try-session.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
import helmet from "helmet";
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
  }),
);
app.set("trust proxy", 1);
DB();
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASELINK,
      collectionName: "sessions",
    }),
    proxy: true, // 🔥 مهم جدًا مع Vercel
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".vercel.app", // 🔥 مهم جدًا
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENTID,
      clientSecret: process.env.CLIENTSECRET,
      callbackURL: "https://try-session-server.vercel.app/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
          let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          photos: profile?.photos[0].value||"",
          role:(profile.emails[0].value=="sphinxallience@gmail.com")?"admin":"visitor"
        });
      }

      return done(null, user);
      } catch (err) {
        return done(err, null);
     }
    },
  ),
);
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser(
  async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
  },
);
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://try-session.vercel.app/",
  }),
  (req, res) => {
    res.redirect("https://try-session.vercel.app/");
  },
);
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Unauthorized" });
}
app.get("/me", (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Not authenticated",
        user: null,
      });
    }

    return res.json({
      user: req.user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      user: null,
    });
  }
});

export default app;
