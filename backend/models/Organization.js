import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    type: { type: String, enum: ["subscription", "setup_fee"], required: true },
    note: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now },
  }
);

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },

    // 🔑 Billing — what this tenant pays Sai
    billingPlan: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },
    monthlyFee: { type: Number, default: 0 },
    setupFee: { type: Number, default: 0 },

    // 🔑 Actual payments received from this tenant
    payments: [paymentSchema],
  },
  { timestamps: true }
);

organizationSchema.pre("save", async function () {
  if (this.isNew && !this.slug) {
    this.slug =
      this.name.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Math.random().toString(36).substr(2, 5);
  }
});

const Organization =
  mongoose.models.Organization ||
  mongoose.model("Organization", organizationSchema);

export default Organization;