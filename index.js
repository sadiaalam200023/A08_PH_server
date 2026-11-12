
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
//
app.post("/add-bookings", async (req, res) => {
  try {
    const { studioId, customerEmail, bookingDate, hours } = req.body;

    if (!studioId || !ObjectId.isValid(studioId)) {
      return res.status(400).json({
        message: "Invalid studio ID",
      });
    }

    if (!customerEmail || !bookingDate || !hours) {
      return res.status(400).json({
        message: "Please provide all booking information",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      Number.isNaN(Date.parse(`${bookingDate}T00:00:00Z`)) ||
      new Date(`${bookingDate}T00:00:00Z`).toISOString().slice(0, 10) !== bookingDate
    ) {
      return res.status(400).json({
        message: "Invalid booking date",
      });
    }

    const bookingHours = Number(hours);

    if (
      !Number.isInteger(bookingHours) ||
      bookingHours < 1 ||
      bookingHours > 24
    ) {
      return res.status(400).json({
        message: "Booking hours must be between 1 and 24",
      });
    }

    const db = client.db("StudioSpace");

    // Get the studio from MongoDB
    const studio = await db.collection("studios").findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).json({
        message: "Studio not found",
      });
    }

    // Calculate prices on the server
    const hourlyRate = Number(studio.hourlyRate);
    const securityDeposit = Number(studio.securityDeposit || 0);
    const rentalCost = hourlyRate * bookingHours;
    const totalAmount = rentalCost + securityDeposit;

    const booking = {
      studioId: studio._id,
      studioTitle: studio.title,
      studioImage: studio.image,
      category: studio.category,
      location: studio.location,

      ownerEmail: studio.ownerEmail,
      customerEmail: customerEmail,

      bookingDate,
      hours: bookingHours,

      hourlyRate,
      securityDeposit,
      rentalCost,
      totalAmount,

      status: "Pending",
      createdAt: new Date(),
    };

    const result = await db.collection("bookings").insertOne(booking);

    return res.status(201).json({
      message: "Booking submitted successfully!",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    return res.status(500).json({
      message: "Failed to create booking",
    });
  }
});
//
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
  try {
    const db = client.db("StudioSpace");

    const result = await db.collection("studios")
      .find()
      .toArray();

    res.send(result);

  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to fetch all studios",
    });
  }
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
//
app.delete("/studios/:id", async (req, res) => {
  app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid studio ID",
      });
    }

    const db = client.db("StudioSpace");

    const result = await db.collection("studios").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Studio not found",
      });
    }

    res.status(200).send({
      message: "Studio deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting studio:", error);

    res.status(500).send({
      message: "Failed to delete studio",
    });
  }
});
//
app.put("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid studio ID",
      });
    }

    const {
      title,
      category,
      hourlyRate,
      securityDeposit,
      capacity,
      location,
      image,
      overview,
      amenities,
    } = req.body;

    const updatedData = {
      title,
      category,
      hourlyRate: Number(hourlyRate),
      securityDeposit: Number(securityDeposit),
      capacity: Number(capacity),
      location,
      image,
      overview,
      amenities: Array.isArray(amenities) ? amenities : [],
      updatedAt: new Date(),
    };

    const db = client.db("StudioSpace");

    const result = await db.collection("studios").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Studio not found",
      });
    }

    return res.status(200).json({
      message: "Studio updated successfully!",
    });

  } catch (error) {
    console.error("Error updating studio:", error);

    return res.status(500).json({
      message: "Failed to update studio",
    });
  }
});
