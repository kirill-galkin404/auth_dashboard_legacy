import { createApp } from './app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

createApp()
  .then((app) => {
    app.listen(PORT, () => {
      console.log(`listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('failed to start server:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
