import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import DB from "./src/db.js";
import User from "./models/User.js";

dotenv.config();

const app = express();

// ================== DB ==================
DB();

// ================== Middleware ==================
app.use(express.json());

app.set("trust proxy", 1);

// ================== CORS ==================
app.use(
  cors({
    origin: "https://try-session.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// ================== Helmet ==================
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
  })
);

// ================== Session ==================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASELINK,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      // ❌ تم حذف domain لأنه كان بيكسر الكوكيز على Vercel
    },
  })
);

// ================== Passport ==================
app.use(passport.initialize());
app.use(passport.session());

// ================== Google Strategy ==================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENTID,
      clientSecret: process.env.CLIENTSECRET,
      callbackURL:
        "https://try-session-server.vercel.app/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            photos: profile?.photos?.[0]?.value || "",
            role:
              profile.emails[0].value === "sphinxallience@gmail.com"
                ? "admin"
                : "visitor",
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ================== Serialize / Deserialize ==================
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ================== Auth Routes ==================
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://try-session.vercel.app/",
  }),
  (req, res) => {
    res.redirect("https://try-session.vercel.app/");
  }
);

// ================== Auth Middleware ==================
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

// ================== ME Route ==================
app.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      message: "Not authenticated",
      user: null,
    });
  }

  return res.json({
    user: req.user,
  });
});

export default app;
