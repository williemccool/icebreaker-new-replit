import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { corsOptions } from "./lib/cors";

const app: Express = express();

// Security headers. crossOriginResourcePolicy is relaxed so /uploads images can
// be embedded by the Expo web build on a different origin; native apps are
// unaffected either way. Everything else keeps helmet's hardened defaults.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));
// Body-size limits. Selfie verification posts a base64 image inside JSON, so it
// gets a dedicated larger parser; everything else is capped at 1 MB so a single
// request can't balloon memory. (Photo uploads use multer with its own 8 MB cap.)
app.use("/api/user/verify-selfie", express.json({ limit: "8mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Serve locally-stored uploads (used by the LocalStorageProvider in dev). The
// upload route writes files to <cwd>/uploads and returns "/uploads/<file>" URLs,
// so this mount is what makes those URLs actually resolve. In production with an
// object-storage provider configured, returned URLs are absolute and this mount
// is simply unused.
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api", router);

export default app;
