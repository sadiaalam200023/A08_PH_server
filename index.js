import express from "express"
import { MongoClient } from 'mongodb'; import "dotenv/config"
const app = express();
const PORT = 8000;


const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
  });
});

app.get("/", (req, res) => {
  res.send({ message: "Server ok!" });
});