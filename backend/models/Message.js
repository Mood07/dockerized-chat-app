const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    text: { type: String, required: true },
    roomId: { type: String, default: "general" },
    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
