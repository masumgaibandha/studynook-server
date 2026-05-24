// Masum Billah
// Gaibandha
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const uri = process.env.MONGODB_URI;
app.use(
  cors({
    origin: ["https://studynook-omega.vercel.app", "http://localhost:3000"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);

const tokenVerify = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);

    next();
  } catch (error) {
    return res.status(403).send({ message: "Forbidden" });
  }
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("studynook");
    const roomCollection = db.collection("rooms");
    const bookingCollection = db.collection("bookings");

    app.post("/rooms", tokenVerify, async (req, res) => {
      const roomData = req.body;
      const result = await roomCollection.insertOne(roomData);
      res.send(result);
    });

    app.get("/rooms", async (req, res) => {
      const { limit, search, amenity } = req.query;

      const query = {};

      if (search) {
        query.roomName = {
          $regex: search,
          $options: "i",
        };
      }

      if (amenity) {
        query.amenities = {
          $in: [amenity],
        };
      }

      let cursor = roomCollection.find(query).sort({ _id: -1 });

      if (limit) {
        cursor = cursor.limit(parseInt(limit));
      }

      const result = await cursor.toArray();

      res.send(result);
    });

    app.get("/rooms/:id", async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch("/rooms/:id", tokenVerify, async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      const result = await roomCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
      );
      res.send(result);
    });

    app.delete("/rooms/:id", tokenVerify, async (req, res) => {
      const { id } = req.params;
      const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/bookings/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId }).toArray();
      res.send(result);
    });

    app.post("/bookings", tokenVerify, async (req, res) => {
      const bookingData = req.body;

      const { roomId, date, startTime, endTime } = bookingData;

      const newStart = Number(startTime.split(":")[0]);
      const newEnd = Number(endTime.split(":")[0]);

      const existingBookings = await bookingCollection
        .find({
          roomId,
          date,
          status: "confirmed",
        })
        .toArray();

      const conflict = existingBookings.find((booking) => {
        const existingStart = Number(booking.startTime.split(":")[0]);
        const existingEnd = Number(booking.endTime.split(":")[0]);

        return newStart < existingEnd && newEnd > existingStart;
      });

      if (conflict) {
        return res.status(409).send({
          success: false,
          message: "This room is already booked for this time slot",
        });
      }

      const result = await bookingCollection.insertOne({
        ...bookingData,
        totalCost: Number(bookingData.totalCost),
        status: "confirmed",
        createdAt: new Date(),
      });
      await roomCollection.updateOne(
        { _id: new ObjectId(roomId) },
        {
          $inc: {
            bookingCount: 1,
          },
        },
      );

      res.send({
        success: true,
        message: "Room booked successfully",
        result,
      });
    });

    app.patch("/bookings/:bookingId/cancel", tokenVerify, async (req, res) => {
      const { bookingId } = req.params;

      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(bookingId) },
        {
          $set: {
            status: "cancelled",
          },
        },
      );

      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
