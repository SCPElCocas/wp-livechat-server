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
const SECRET = "MI_SECRET_REALEST"; // mismo valor que en WP

// Almacenar mensajes por sala (opcional, para historial rápido)
const roomsMessages = {};

// Manejo de conexiones WebSocket
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Unirse a una sala
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`Cliente ${socket.id} se unió a la sala ${roomId}`);

    // Enviar historial si existe
    if (roomsMessages[roomId]) {
      roomsMessages[roomId].forEach(msg => socket.emit("new_message", msg));
    }
  });

  // Recibir mensajes desde el widget y reemitir
  socket.on("new_message", (msg) => {
    const roomId = msg.room_id || "general";
    
    // Guardar en historial
    if (!roomsMessages[roomId]) roomsMessages[roomId] = [];
    roomsMessages[roomId].push(msg);

    // Emitir solo a otros clientes en la sala
    socket.to(roomId).emit("new_message", msg);
    console.log(`💬 Mensaje de ${msg.sender} a sala ${roomId}: ${msg.message}`);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
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

    // Guardar en historial
    if (!roomsMessages[roomId]) roomsMessages[roomId] = [];
    roomsMessages[roomId].push(message);

    // Emitir a todos en la sala
    io.to(roomId).emit("new_message", message);
    console.log(`✅ Mensaje recibido desde WordPress y enviado a sala ${roomId}: ${message.message}`);
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

