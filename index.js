const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const uri =process.env.MONGODB_URI;
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("studynook");
    const roomCollection = db.collection("rooms");

    app.post("/rooms", async (req, res) => {
      const roomData = req.body;
      const result = await roomCollection.insertOne(roomData);
      res.send(result);
      console.log(result)
    });
 
    app.get("/rooms", async (req, res) => {
      const rooms = await roomCollection.find().toArray();
      res.send(rooms);
    });



    await client.db("admin").command({ ping: 1 });
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
