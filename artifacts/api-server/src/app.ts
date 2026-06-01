import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { corsOptions } from "./lib/cors";

const app: Express = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve locally-stored uploads (used by the LocalStorageProvider in dev). The
// upload route writes files to <cwd>/uploads and returns "/uploads/<file>" URLs,
// so this mount is what makes those URLs actually resolve. In production with an
// object-storage provider configured, returned URLs are absolute and this mount
// is simply unused.
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api", router);

export default app;
