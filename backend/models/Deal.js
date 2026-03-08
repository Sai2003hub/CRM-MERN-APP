import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    stageAtTime: { type: String },
  },
  { timestamps: true }
);

const dealSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, default: 0 },
    subscriptionType: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },
    setupFee: { type: Number, default: 0 },
    stage: {
      type: String,
      default: "Open",
      enum: ["Open", "Proposal", "Negotiation", "Won", "Lost"],
    },
    notes: [noteSchema],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
    },
    // Multi-tenancy: every deal belongs to an org
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    // Invite system
    inviteToken: { type: String, default: null },
    inviteStatus: {
      type: String,
      enum: ["not_invited", "pending", "accepted"],
      default: "not_invited",
    },
    invitedEmail: { type: String, default: null },
    invitedName: { type: String, default: null },
  },
  { timestamps: true }
);

const Deal = mongoose.models.Deal || mongoose.model("Deal", dealSchema);
export default Deal;
