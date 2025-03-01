import server from "./app";
import dotenv from "dotenv";

dotenv.config();

server.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});