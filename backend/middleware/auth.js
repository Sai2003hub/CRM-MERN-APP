import jwt from "jsonwebtoken";

// Standard auth - requires valid JWT
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.userId = decoded.userId;
    req.organizationId = decoded.organizationId; 
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Superadmin only middleware
export const superadminOnly = (req, res, next) => {
  if (req.role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin access required" });
  }
  next();
};

export default auth;
