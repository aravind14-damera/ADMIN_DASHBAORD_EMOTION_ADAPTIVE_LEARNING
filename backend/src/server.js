import env from "./config/env.js";
import connectDB from "./config/db.js";
import app from "./app.js";

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(env.port, () => {
      console.log(`🚀 Admin backend running on http://localhost:${env.port}`);
      console.log(`🌍 Environment: ${env.nodeEnv}`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log("✅ HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Server startup failed:", error.message || error);
    process.exit(1);
  }
};

startServer();
