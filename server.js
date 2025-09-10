const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
const SECRET = "MI_SECRET_REALEST"; // ⚡ mismo valor que en WP

// Manejo de conexiones WebSocket
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`Cliente ${socket.id} se unió a la sala ${roomId}`);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Endpoint para recibir mensajes de WordPress
app.post("/new-message", (req, res) => {
  console.log("📩 Request recibido en /new-message:", req.body);

  const { action, message, secret } = req.body;

  if (secret !== SECRET) {
    console.log("❌ Secret inválido");
    return res.status(401).json({ error: "Secret inválido" });
  }

  if (action === "new_message" && message) {
    const roomId = message.room_id || "general";

    io.to(roomId).emit("new_message", message);
    console.log(`✅ Mensaje enviado a sala ${roomId}:`, message.message);
  } else {
    console.log("⚠️ Acción no reconocida o mensaje vacío");
  }

  res.json({ status: "ok" });
});

// Escuchar en todas las interfaces de red
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor WebSocket corriendo en http://0.0.0.0:${PORT}`);
  console.log(`Accesible en la red local usando tu IP: http://TU_IP_LOCAL:${PORT}`);
});
