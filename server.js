// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 50000,
});

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || "MI_SECRET_REALEST"; // 👈 pon el mismo valor en Render env vars

// Historial simple por sala en memoria
const roomsMessages = {};

// Salud / diagnóstico rápido
app.get("/", (_, res) => res.send("OK"));
app.get("/health", (_, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  console.log("✅ Cliente conectado:", socket.id);

  socket.on("join_room", (roomId = "general") => {
    socket.join(roomId);
    console.log(`📌 Cliente ${socket.id} entró en sala ${roomId}`);

    // Enviar historial previo
    if (roomsMessages[roomId]) {
      roomsMessages[roomId].forEach((msg) => socket.emit("new_message", msg));
    }
  });

  socket.on("new_message", (msg) => {
    const roomId = msg.room_id || "general";
    if (!roomsMessages[roomId]) roomsMessages[roomId] = [];
    roomsMessages[roomId].push(msg);

    io.to(roomId).emit("new_message", msg); // envía a todos (incluido emisor si quieres)
    console.log(`💬 ${msg.sender} → ${roomId}: ${msg.message}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
});

// Endpoint para recibir mensajes desde WordPress
app.post("/new-message", (req, res) => {
  const { action, message, secret } = req.body;

  if (secret !== SECRET) {
    console.log("❌ Secret inválido");
    return res.status(401).json({ error: "Secret inválido" });
  }

  if (action === "new_message" && message) {
    const roomId = message.room_id || "general";
    if (!roomsMessages[roomId]) roomsMessages[roomId] = [];
    roomsMessages[roomId].push(message);

    io.to(roomId).emit("new_message", message);
    console.log(`📨 WP → ${roomId}: ${message.message}`);
  } else {
    console.log("⚠️ Acción no reconocida o mensaje vacío");
  }

  res.json({ status: "ok" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});

