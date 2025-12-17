require("dotenv").config();
const app = require("./src/app");
const { connectDB } = require("./src/config/db");

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("🚀 Backend is running!");
});


