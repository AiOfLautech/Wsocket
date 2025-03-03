// ws-server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Create HTTP server and wrap with Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",  // adjust in production for security
    methods: ["GET", "POST"]
  }
});

// In-memory storage for discussion messages (for demo purposes)
let discussions = [];

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send existing discussions to the new client
  socket.emit("initialDiscussions", discussions);

  socket.on("message", (data) => {
    // data: { type, data, tempId } or other types
    if (data.type === "message") {
      // Assign a unique ID to the message
      const message = { ...data.data, id: Date.now().toString() };
      discussions.push(message);
      // Broadcast the message to all clients
      io.emit("message", { type: "message", data: message, tempId: data.tempId });
    }
    else if (data.type === "delete") {
      // Remove message from array
      discussions = discussions.filter((msg) => msg.id !== data.messageId);
      io.emit("delete", { type: "delete", messageId: data.messageId });
    }
    else if (data.type === "pin") {
      // Mark message as pinned
      const msg = discussions.find((m) => m.id === data.messageId);
      if (msg) {
        msg.pinned = true;
        io.emit("pin", { type: "pin", message: msg });
      }
    }
    else if (data.type === "update") {
      // Edit a message
      const msg = discussions.find((m) => m.id === data.data.id);
      if (msg) {
        msg.content = data.data.content;
        io.emit("update", { type: "update", data: msg });
      }
    }
    else if (data.type === "typing") {
      // Broadcast typing indicator
      socket.broadcast.emit("typing", { type: "typing", user: data.user });
    }
    else if (data.type === "askAI") {
      // Here you would call your ChatGPT backend
      const aiResponse = `AI Response to "${data.prompt}" from ${data.user}`;
      io.emit("aiResponse", { type: "aiResponse", response: aiResponse });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT_WS = process.env.WS_PORT || 3000;
server.listen(PORT_WS, () => console.log(`WebSocket server running on port ${PORT_WS}`));
