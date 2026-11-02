import express from "express"
import { MongoClient } from 'mongodb'; import "dotenv/config"
import cors from "cors"
const app = express();
const PORT = 8000;
app.use(cors())
app.use(express.json())

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


app.post("/add-studios", async (req, res) => {
  try {
    const db = client.db("StudioSpace");

    const studioData = req.body;

    const result = await db.collection("studios").insertOne({
      ...studioData,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    res.status(201).send({
      success: true,
      message: "Studio added successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to add studio",
    });
  }
});


app.get("/", (req, res) => {
  res.send({ message: "Server ok!" });
});