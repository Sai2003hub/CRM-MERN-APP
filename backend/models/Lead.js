import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    statusAtTime: { type: String },
  },
  { timestamps: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    status: {
      type: String,
      default: "New",
    },
    notes: [noteSchema],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Multi-tenancy: every lead belongs to an org
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
