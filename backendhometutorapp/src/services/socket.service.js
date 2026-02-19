let io = null;

const initSocket = (server) => {
  const { Server } = require("socket.io");
  const jwt = require("jsonwebtoken");
  const User = require("../models/User");
  const LiveSession = require("../models/LiveSession");
  const { canAccessLiveSession } = require("../controllers/liveSessionController");
  const allowedOrigins = [
    process.env.CLIENT_URL || "http://localhost:3000",
    process.env.ADMIN_URL || "http://localhost:3001",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4000",
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by Socket.IO CORS"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id name role");
      if (!user) return next();
      socket.data.user = {
        _id: String(user._id),
        name: user.name || "User",
        role: user.role === "teacher" ? "tutor" : user.role,
      };
      socket.join(`user:${String(user._id)}`);
      return next();
    } catch (_error) {
      return next();
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join", ({ userId }) => {
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on("joinThread", ({ threadId }) => {
      if (threadId) {
        socket.join(`thread:${threadId}`);
      }
    });

    socket.on("leaveThread", ({ threadId }) => {
      if (threadId) {
        socket.leave(`thread:${threadId}`);
      }
    });

    socket.on("joinTutorRoom", ({ tutorId }) => {
      if (tutorId) {
        socket.join(`tutor:${tutorId}`);
      }
    });

    socket.on("leaveTutorRoom", ({ tutorId }) => {
      if (tutorId) {
        socket.leave(`tutor:${tutorId}`);
      }
    });

    socket.on("live:join", async ({ sessionId }, ack = () => {}) => {
      try {
        const user = socket.data.user;
        if (!user?._id) {
          ack({ success: false, message: "Unauthorized socket user" });
          return;
        }
        const ok = await canAccessLiveSession({ sessionId, user });
        if (!ok) {
          ack({ success: false, message: "Not allowed to join this live session" });
          return;
        }
        socket.join(`live:${sessionId}`);

        const session = await LiveSession.findById(sessionId)
          .populate("activeParticipantIds", "name role")
          .select("_id course activeParticipantIds status");
        const participants = Array.isArray(session?.activeParticipantIds)
          ? session.activeParticipantIds.map((item) => ({
              _id: String(item._id),
              name: item.name || "Participant",
              role: item.role === "teacher" ? "tutor" : item.role,
            }))
          : [];

        socket.emit("live:participants", {
          sessionId: String(sessionId),
          participants,
        });

        socket.to(`live:${sessionId}`).emit("live:user-joined", {
          sessionId: String(sessionId),
          user: {
            _id: String(user._id),
            name: user.name || "Participant",
            role: user.role || "user",
          },
        });

        ack({ success: true });
      } catch (error) {
        ack({ success: false, message: error?.message || "Unable to join live room" });
      }
    });

    socket.on("live:leave", ({ sessionId }) => {
      if (!sessionId) return;
      const user = socket.data.user || {};
      socket.leave(`live:${sessionId}`);
      socket.to(`live:${sessionId}`).emit("live:user-left", {
        sessionId: String(sessionId),
        userId: String(user._id || ""),
      });
    });

    socket.on("live:signal", async ({ sessionId, targetUserId, payload }) => {
      try {
        const user = socket.data.user;
        if (!user?._id || !sessionId || !targetUserId || !payload) return;
        const ok = await canAccessLiveSession({ sessionId, user });
        if (!ok) return;

        io.to(`user:${String(targetUserId)}`).emit("live:signal", {
          sessionId: String(sessionId),
          fromUserId: String(user._id),
          fromUserName: user.name || "Participant",
          fromRole: user.role || "user",
          payload,
        });
      } catch (_error) {
        // ignore signal failure
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };

