import express from 'express';
import cors from 'cors';
import { setupRoutes } from './routes';

export function createApiApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 挂载路由
  setupRoutes(app);

  return app;
}
