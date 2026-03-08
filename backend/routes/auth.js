import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Deal from "../models/Deal.js";

const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const orgName = organizationName || `${name}'s Organization`;
    const organization = await Organization.create({ name: orgName });

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "org_admin",
      organizationId: organization._id,
    });

    organization.ownerId = user._id;
    await organization.save();

    res.status(201).json({
      message: "Registration successful",
      userId: user._id,
      organizationId: organization._id,
      organizationName: organization.name,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// REGISTER VIA INVITE
router.post("/register-invite", async (req, res) => {
  try {
    const { password, organizationName, inviteToken } = req.body;

    if (!password || !inviteToken) {
      return res.status(400).json({ message: "Password and invite token are required" });
    }

    const deal = await Deal.findOne({ inviteToken, inviteStatus: "pending" });
    if (!deal) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    const existingUser = await User.findOne({ email: deal.invitedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const orgName = organizationName || `${deal.invitedName}'s Organization`;
    const organization = await Organization.create({ name: orgName });

    const user = await User.create({
      name: deal.invitedName,
      email: deal.invitedEmail,
      password: hashedPassword,
      role: "org_admin",
      organizationId: organization._id,
    });

    organization.ownerId = user._id;
    await organization.save();

    deal.inviteStatus = "accepted";
    await deal.save();

    // organizationId in token is how tenant isolation works
    const token = jwt.sign(
      {
        userId: user._id,
        organizationId: organization._id,
        role: user.role,
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id,
        organizationName: organization.name,
      },
    });
  } catch (error) {
    console.error("Register invite error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET INVITE INFO
router.get("/invite-info/:token", async (req, res) => {
  try {
    const deal = await Deal.findOne({
      inviteToken: req.params.token,
      inviteStatus: "pending",
    });

    if (!deal) {
      return res.status(404).json({ message: "Invalid or expired invite link" });
    }

    res.json({
      name: deal.invitedName,
      email: deal.invitedEmail,
      inviteToken: deal.inviteToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get invite info" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("organizationId");
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // organizationId in token is how tenant isolation works
    const token = jwt.sign(
      {
        userId: user._id,
        organizationId: user.organizationId?._id || null,
        role: user.role,
      },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId?._id,
        organizationName: user.organizationId?.name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET CURRENT USER
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const user = await User.findById(decoded.userId).populate("organizationId");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId?._id,
      organizationName: user.organizationId?.name,
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
