

import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// MongoDB connection
let client;
let clientPromise;

async function connectToMongoDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from environment variables");
  }

  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
  }

  if (!clientPromise) {
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  await clientPromise;
  return client;
}

// Ensure MongoDB is connected before processing API requests
app.use(async (req, res, next) => {
  try {
    await connectToMongoDB();
    next();
  } catch (error) {
    console.error("MongoDB connection error:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server ok!",
  });
});

// ADD BOOKING
app.post("/add-bookings", async (req, res) => {
  try {
    const { studioId, customerEmail, bookingDate, hours } = req.body;

    if (!studioId || !ObjectId.isValid(studioId)) {
      return res.status(400).json({ message: "Invalid studio ID" });
    }

    if (!customerEmail || !bookingDate || hours === undefined) {
      return res.status(400).json({
        message: "Please provide all booking information",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) ||
      Number.isNaN(Date.parse(`${bookingDate}T00:00:00Z`)) ||
      new Date(`${bookingDate}T00:00:00Z`).toISOString().slice(0, 10) !==
        bookingDate
    ) {
      return res.status(400).json({ message: "Invalid booking date" });
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

    const studio = await db.collection("studios").findOne({
      _id: new ObjectId(studioId),
    });

    if (!studio) {
      return res.status(404).json({ message: "Studio not found" });
    }

    const hourlyRate = Number(studio.hourlyRate);
    const securityDeposit = Number(studio.securityDeposit || 0);

    if (
      !Number.isFinite(hourlyRate) ||
      hourlyRate < 0 ||
      !Number.isFinite(securityDeposit) ||
      securityDeposit < 0
    ) {
      return res.status(400).json({
        message: "Invalid studio pricing information",
      });
    }

    const rentalCost = hourlyRate * bookingHours;
    const totalAmount = rentalCost + securityDeposit;

    const booking = {
      studioId: studio._id,
      studioTitle: studio.title,
      studioImage: studio.image,
      category: studio.category,
      location: studio.location,
      ownerEmail: studio.ownerEmail,
      customerEmail,
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

// GET MY BOOKINGS
app.get("/my-bookings", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "User email is required",
      });
    }

    const db = client.db("StudioSpace");

    const bookings = await db
      .collection("bookings")
      .find({ customerEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);

    return res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

// CANCEL BOOKING
app.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const { customerEmail } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    if (!customerEmail) {
      return res.status(400).json({
        message: "Customer email is required",
      });
    }

    const db = client.db("StudioSpace");

    const result = await db.collection("bookings").updateOne(
      {
        _id: new ObjectId(id),
        customerEmail,
        status: "Pending",
      },
      {
        $set: {
          status: "Cancelled",
          cancelledAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        message: "Booking not found or it can no longer be cancelled.",
      });
    }

    return res.status(200).json({
      message: "Booking cancelled successfully!",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      message: "Failed to cancel booking",
    });
  }
});

// ADD STUDIO
app.post("/add-studios", async (req, res) => {
  try {
    const db = client.db("StudioSpace");

    const result = await db.collection("studios").insertOne({
      ...req.body,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Studio added successfully!",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Add studio error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add studio",
    });
  }
});

// GET ALL STUDIOS
app.get("/all-studios", async (req, res) => {
  try {
    const db = client.db("StudioSpace");

    const result = await db
      .collection("studios")
      .find()
      .toArray();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Fetch all studios error:", error);

    return res.status(500).json({
      message: "Failed to fetch all studios",
    });
  }
});

// GET FEATURED STUDIOS
app.get("/featured-studios", async (req, res) => {
  try {
    const db = client.db("StudioSpace");

    const result = await db
      .collection("studios")
      .find()
      .sort({ rating: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    return res.status(200).json(result);
  } catch (error) {
    console.error("Fetch featured studios error:", error);

    return res.status(500).json({
      message: "Failed to fetch featured studios",
    });
  }
});

// GET SINGLE STUDIO
app.get("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid studio ID" });
    }

    const studio = await client
      .db("StudioSpace")
      .collection("studios")
      .findOne({ _id: new ObjectId(id) });

    if (!studio) {
      return res.status(404).json({ message: "Studio not found" });
    }

    return res.status(200).json(studio);
  } catch (error) {
    console.error("Fetch studio error:", error);

    return res.status(500).json({
      message: "Failed to fetch studio",
    });
  }
});

// DELETE STUDIO
app.delete("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid studio ID",
      });
    }

    const db = client.db("StudioSpace");

    const result = await db.collection("studios").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Studio not found",
      });
    }

    return res.status(200).json({
      message: "Studio deleted successfully!",
    });
  } catch (error) {
    console.error("Delete studio error:", error);

    return res.status(500).json({
      message: "Failed to delete studio",
    });
  }
});

// UPDATE STUDIO
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
    console.error("Update studio error:", error);

    return res.status(500).json({
      message: "Failed to update studio",
    });
  }
});

// Local development only.
// Vercel sets VERCEL=1, so it will use the exported app instead.
if (!process.env.VERCEL) {
  connectToMongoDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Could not start server:", error);
    });
}

// Vercel uses this exported Express app.
export default app;
