const requiredAttestations = [
  "CMS_RELEASE_CREDENTIALS_ROTATED",
  "CMS_RELEASE_HISTORY_CLEANUP_APPROVED",
];

const missing = requiredAttestations.filter(
  (name) => process.env[name] !== "confirmed",
);

if (missing.length > 0) {
  console.error(
    `CMS production release blocked. Release owner must set ${missing.join(
      ", ",
    )}=confirmed only after completing the corresponding gated steps.`,
  );
  process.exit(1);
}

console.log("CMS release gate passed; schema migration may proceed.");
