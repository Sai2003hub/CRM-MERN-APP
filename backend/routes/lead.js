import express from "express";
import Lead from "../models/Lead.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// CREATE LEAD - scoped to tenant's org
router.post("/", auth, async (req, res) => {
  try {
    const lead = await Lead.create({
      ...req.body,
      owner: req.userId,
      organizationId: req.organizationId, // 🔑 tenant isolation
    });
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: "Failed to create lead", error: error.message });
  }
});

// GET ALL LEADS - only this tenant's leads
router.get("/", auth, async (req, res) => {
  try {
    const leads = await Lead.find({ organizationId: req.organizationId }) // 🔑
      .sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leads", error: error.message });
  }
});

// UPDATE LEAD - must belong to this org
router.put("/:id", auth, async (req, res) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organizationId }, // 🔑
      req.body,
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: "Failed to update lead", error: error.message });
  }
});

// ADD NOTE TO LEAD
router.post("/:id/notes", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Note text is required" });

    const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    lead.notes.push({ text: text.trim(), statusAtTime: lead.status });
    await lead.save();
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: "Failed to add note", error: error.message });
  }
});

// EDIT NOTE ON LEAD
router.put("/:id/notes/:noteId", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Note text is required" });

    const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const note = lead.notes.id(req.params.noteId);
    if (!note) return res.status(404).json({ message: "Note not found" });

    note.text = text.trim();
    await lead.save();
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: "Failed to edit note", error: error.message });
  }
});

// DELETE NOTE FROM LEAD
router.delete("/:id/notes/:noteId", auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const noteIndex = lead.notes.findIndex((n) => n._id.toString() === req.params.noteId);
    if (noteIndex === -1) return res.status(404).json({ message: "Note not found" });

    lead.notes.splice(noteIndex, 1);
    await lead.save();
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: "Failed to delete note", error: error.message });
  }
});

// DELETE LEAD
router.delete("/:id", auth, async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete lead", error: error.message });
  }
});

export default router;
