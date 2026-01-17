import app from './app';
import { env } from './config/env';

const PORT = env.PORT;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`API server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});
