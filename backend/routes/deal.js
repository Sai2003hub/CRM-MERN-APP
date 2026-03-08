import express from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import Deal from "../models/Deal.js";
import Lead from "../models/Lead.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET DASHBOARD STATS - must be before /:id routes
router.get("/stats/dashboard", auth, async (req, res) => {
  try {
    const orgId = new mongoose.Types.ObjectId(req.organizationId);

    const totalLeads = await Lead.countDocuments({ organizationId: orgId });
    const totalDeals = await Deal.countDocuments({ organizationId: orgId });

    // Only Won deals contribute to revenue
    const wonDeals = await Deal.find({ organizationId: orgId, stage: "Won" });

    // ── MRR ─────────────────────────────────────────────────────────────────
    // Sum of subscription amounts on Won monthly deals
    // Falls back to "monthly" if subscriptionType not set (old deals)
    const mrr = wonDeals
      .filter((d) => !d.subscriptionType || d.subscriptionType === "monthly")
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    // ── ARR ─────────────────────────────────────────────────────────────────
    // (MRR × 12) + sum of subscription amounts on Won annual deals
    const annualSubscriptions = wonDeals
      .filter((d) => d.subscriptionType === "annual")
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const arr = (mrr * 12) + annualSubscriptions;

    // ── Setup Fees Collected ─────────────────────────────────────────────────
    // Sum of setup fees across ALL Won deals — safely handle missing field
    const setupFeesCollected = wonDeals
      .reduce((sum, d) => sum + (Number(d.setupFee) || 0), 0);

    // ── TCV — Total Contract Value ───────────────────────────────────────────
    // ARR + all setup fees collected
    const tcv = arr + setupFeesCollected;

    // Deals by stage breakdown
    const dealsByStage = await Deal.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: "$stage", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    res.json({
      totalLeads,
      totalDeals,
      mrr,
      arr,
      setupFeesCollected,
      tcv,
      dealsByStage,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// CREATE DEAL
router.post("/", auth, async (req, res) => {
  try {
    const deal = await Deal.create({
      ...req.body,
      owner: req.userId,
      organizationId: req.organizationId,
    });
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to create deal", error: error.message });
  }
});

// CONVERT LEAD TO DEAL
router.post("/convert/:leadId", auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.leadId,
      organizationId: req.organizationId,
    });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const dealData = {
      title: "Deal - " + lead.name,
      amount: req.body.amount || 0,
      subscriptionType: req.body.subscriptionType || "monthly",
      setupFee: req.body.setupFee || 0,
      stage: "Open",
      leadId: lead._id,
      owner: req.userId,
      organizationId: req.organizationId,
      invitedEmail: req.role === "superadmin" ? (lead.email || null) : null,
      invitedName: req.role === "superadmin" ? (lead.name || null) : null,
      inviteStatus: req.role === "superadmin" ? "not_invited" : null,
    };

    const deal = await Deal.create(dealData);

    lead.status = "Converted";
    await lead.save();

    res.status(201).json({ message: "Lead converted to deal", deal });
  } catch (error) {
    res.status(500).json({ message: "Failed to convert lead", error: error.message });
  }
});

// UPDATE DEAL — auto-generate invite token when Sai marks deal as Won
router.put("/:id", auth, async (req, res) => {
  try {
    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    // 🔑 If Sai marks deal as Won and no invite token yet → generate one
    if (
      req.role === "superadmin" &&
      req.body.stage === "Won" &&
      deal.inviteStatus === "not_invited" &&
      deal.invitedEmail
    ) {
      deal.inviteToken = crypto.randomBytes(20).toString("hex");
      deal.inviteStatus = "pending";
    }

    Object.assign(deal, req.body);
    await deal.save();

    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to update deal" });
  }
});

// GET INVITE LINK FOR A DEAL — superadmin only
router.get("/:id/invite", auth, async (req, res) => {
  try {
    if (req.role !== "superadmin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const deal = await Deal.findOne({
      _id: req.params.id,
      organizationId: req.organizationId,
    });

    if (!deal) return res.status(404).json({ message: "Deal not found" });
    if (!deal.inviteToken) {
      return res.status(400).json({ message: "No invite token for this deal" });
    }

    const inviteUrl = (process.env.FRONTEND_URL || "http://localhost:3000") + "/register?invite=" + deal.inviteToken;

    res.json({
      inviteUrl,
      inviteStatus: deal.inviteStatus,
      invitedEmail: deal.invitedEmail,
      invitedName: deal.invitedName,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get invite link", error: error.message });
  }
});

// GET ALL DEALS
router.get("/", auth, async (req, res) => {
  try {
    const deals = await Deal.find({ organizationId: req.organizationId })
      .sort({ createdAt: -1 });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deals" });
  }
});

// ADD NOTE TO DEAL
router.post("/:id/notes", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Note text is required" });

    const deal = await Deal.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    deal.notes.push({ text: text.trim(), stageAtTime: deal.stage });
    await deal.save();
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to add note", error: error.message });
  }
});

// EDIT NOTE ON DEAL
router.put("/:id/notes/:noteId", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Note text is required" });

    const deal = await Deal.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const note = deal.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ message: "Note not found" });

    note.text = text.trim();
    await deal.save();
    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to edit note", error: error.message });
  }
});

// DELETE NOTE FROM DEAL
router.delete("/:id/notes/:noteId", auth, async (req, res) => {
  try {
    const deal = await Deal.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const noteIndex = deal.notes.findIndex((n) => n._id.toString() === req.params.noteId);
    if (noteIndex === -1) return res.status(404).json({ message: "Note not found" });

    deal.notes.splice(noteIndex, 1);
    await deal.save();
    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to delete note", error: error.message });
  }
});

// DELETE DEAL
router.delete("/:id", auth, async (req, res) => {
  try {
    await Deal.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
    res.json({ message: "Deal deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete deal" });
  }
});

export default router;