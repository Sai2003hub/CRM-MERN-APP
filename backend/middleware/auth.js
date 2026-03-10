import jwt from "jsonwebtoken";
import Organization from "../models/Organization.js";

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");

    req.userId = decoded.userId;
    req.organizationId = decoded.organizationId;
    req.role = decoded.role;

    if (decoded.role !== "superadmin" && decoded.organizationId) {
      const org = await Organization
        .findById(decoded.organizationId)
        .select("isActive");

      if (org && !org.isActive) {
        return res
          .status(403)
          .json({ message: "Your account has been suspended. Please contact support." });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const superadminOnly = (req, res, next) => {
  if (req.role !== "superadmin") {
    return res.status(403).json({ message: "Superadmin access required" });
  }
  next();
};

export default auth;