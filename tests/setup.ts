// Jest setup file to configure test environment
import dotenv from "dotenv";

// Load environment variables before tests run
dotenv.config();

// Set default test environment variables if not present
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

if (!process.env.PORT) {
  process.env.PORT = "3001"; // Use different port for tests
}
