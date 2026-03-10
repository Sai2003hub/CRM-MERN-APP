import express from "express";
import mongoose from "mongoose";
import Organization from "../models/Organization.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Deal from "../models/Deal.js";
import auth from "../middleware/auth.js";
import { superadminOnly } from "../middleware/auth.js";

const router = express.Router();

// GET ALL TENANTS
router.get("/tenants", auth, superadminOnly, async (req, res) => {
  try {
    const orgs = await Organization.find({
      ownerId: { $ne: new mongoose.Types.ObjectId(req.userId) },
    }).populate("ownerId", "name email createdAt");

    const tenantsWithStats = await Promise.all(
      orgs.map(async (org) => {
        const orgId = org._id;
        const totalLeads = await Lead.countDocuments({ organizationId: orgId });
        const totalDeals = await Deal.countDocuments({ organizationId: orgId });
        const memberCount = await User.countDocuments({ organizationId: orgId });
        const totalRevenue = (org.payments || []).reduce((sum, p) => sum + p.amount, 0);

        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
          isActive: org.isActive,
          createdAt: org.createdAt,
          owner: org.ownerId,
          billingPlan: org.billingPlan,
          monthlyFee: org.monthlyFee,
          setupFee: org.setupFee,
          stats: { totalLeads, totalDeals, totalRevenue, memberCount },
        };
      })
    );

    res.json(tenantsWithStats);
  } catch (error) {
    console.error("Tenants fetch error:", error);
    res.status(500).json({ message: "Failed to fetch tenants" });
  }
});

// GET SINGLE TENANT DETAILS
router.get("/tenants/:orgId", auth, superadminOnly, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId).populate("ownerId", "name email");
    if (!org) return res.status(404).json({ message: "Organization not found" });

    if (org.ownerId && org.ownerId._id.toString() === req.userId.toString()) {
      return res.status(403).json({ message: "Cannot view your own organization here" });
    }

    const orgId = org._id;
    const totalLeads = await Lead.countDocuments({ organizationId: orgId });
    const totalDeals = await Deal.countDocuments({ organizationId: orgId });
    const members = await User.find({ organizationId: orgId }, "-password");

    const dealsByStage = await Deal.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(orgId) } },
      { $group: { _id: "$stage", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);

    const totalRevenue = (org.payments || []).reduce((sum, p) => sum + p.amount, 0);

    res.json({
      organization: org,
      members,
      stats: { totalLeads, totalDeals, totalRevenue, dealsByStage },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tenant details" });
  }
});

// LOG A PAYMENT FROM A TENANT
router.post("/tenants/:orgId/payments", auth, superadminOnly, async (req, res) => {
  try {
    const { amount, type, note, paidAt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }
    if (!type || !["subscription", "setup_fee"].includes(type)) {
      return res.status(400).json({ message: "Type must be 'subscription' or 'setup_fee'" });
    }

    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    org.payments.push({
      amount: Number(amount),
      type,
      note: note || "",
      paidAt: paidAt ? new Date(paidAt) : new Date(),
    });

    await org.save();

    const totalRevenue = org.payments.reduce((sum, p) => sum + p.amount, 0);
    res.status(201).json({ message: "Payment logged", payments: org.payments, totalRevenue });
  } catch (error) {
    res.status(500).json({ message: "Failed to log payment", error: error.message });
  }
});

// DELETE A PAYMENT
router.delete("/tenants/:orgId/payments/:paymentId", auth, superadminOnly, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const idx = org.payments.findIndex((p) => p._id.toString() === req.params.paymentId);
    if (idx === -1) return res.status(404).json({ message: "Payment not found" });

    org.payments.splice(idx, 1);
    await org.save();

    const totalRevenue = org.payments.reduce((sum, p) => sum + p.amount, 0);
    res.json({ message: "Payment removed", payments: org.payments, totalRevenue });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete payment" });
  }
});

// UPDATE TENANT BILLING SETTINGS
router.patch("/tenants/:orgId/billing", auth, superadminOnly, async (req, res) => {
  try {
    const { billingPlan, monthlyFee, setupFee } = req.body;
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    if (billingPlan) org.billingPlan = billingPlan;
    if (monthlyFee !== undefined) org.monthlyFee = Number(monthlyFee);
    if (setupFee !== undefined) org.setupFee = Number(setupFee);

    await org.save();
    res.json({ message: "Billing updated", organization: org });
  } catch (error) {
    res.status(500).json({ message: "Failed to update billing" });
  }
});

// TOGGLE TENANT ACTIVE STATUS
router.patch("/tenants/:orgId/toggle", auth, superadminOnly, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    if (org.ownerId && org.ownerId.toString() === req.userId.toString()) {
      return res.status(403).json({ message: "Cannot disable your own organization" });
    }

    org.isActive = !org.isActive;
    await org.save();

    res.json({ message: "Organization " + (org.isActive ? "activated" : "deactivated"), org });
  } catch (error) {
    res.status(500).json({ message: "Failed to toggle tenant" });
  }
});

// DELETE TENANT — permanently removes org, users, leads, and deals
router.delete("/tenants/:orgId", auth, superadminOnly, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    if (org.ownerId && org.ownerId.toString() === req.userId.toString()) {
      return res.status(403).json({ message: "Cannot delete your own organization" });
    }

    const orgId = org._id;
    await Lead.deleteMany({ organizationId: orgId });
    await Deal.deleteMany({ organizationId: orgId });
    await User.deleteMany({ organizationId: orgId });
    await Organization.findByIdAndDelete(orgId);

    res.json({ message: "Tenant and all associated data permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete tenant" });
  }
});

// PLATFORM-WIDE STATS
router.get("/stats", auth, superadminOnly, async (req, res) => {
  try {
    const tenantOrgs = await Organization.find({
      ownerId: { $ne: new mongoose.Types.ObjectId(req.userId) },
    });

    const tenantOrgIds = tenantOrgs.map((o) => o._id);
    const totalOrgs = tenantOrgs.length;

    const totalUsers = await User.countDocuments({ organizationId: { $in: tenantOrgIds } });
    const totalLeads = await Lead.countDocuments({ organizationId: { $in: tenantOrgIds } });
    const totalDeals = await Deal.countDocuments({ organizationId: { $in: tenantOrgIds } });

    const totalRevenue = tenantOrgs.reduce((sum, org) => {
      return sum + (org.payments || []).reduce((s, p) => s + p.amount, 0);
    }, 0);

    res.json({ totalOrgs, totalUsers, totalLeads, totalDeals, totalRevenue });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Failed to fetch platform stats" });
  }
});

export default router;