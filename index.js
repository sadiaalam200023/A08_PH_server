
import express from "express"
import { MongoClient,ObjectId } from 'mongodb'; import "dotenv/config"
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


app.get("/all-studios", async (req, res) => {
  const result = await studios.find().toArray();
  res.send(result);
});

app.get("/featured-studios", async (req, res) => {
  try {
    const db = client.db("StudioSpace");

    const result = await db.collection("studios")
      .find()
      .sort({ rating: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    res.send(result);

  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch featured studios",
    });
  }
});

//
app.get("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid studio ID" });
    }

    const studio = await client
      .db("StudioSpace")
      .collection("studios")
      .findOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res.status(404).send({ message: "Studio not found" });
    }

    res.send(studio);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to fetch studio" });
  }
});
app.get("/", (req, res) => {
  res.send({ message: "Server ok!" });
});