import { httpServer } from "./app.js";
import { env } from "./config/env.js";

httpServer.listen(env.PORT, () => {
  console.log(
    `🚀 OpsHub API running on port ${env.PORT} [${env.NODE_ENV}]`,
  );
});
