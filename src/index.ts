import app from "./app";
import { env } from "./lib/env";

app.listen(env.PORT, (): void => {
  console.log(`Server is running at http://localhost:${env.PORT}`);
});
