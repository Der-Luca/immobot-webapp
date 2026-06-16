import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "immobot-dc818";
const today = process.argv[2] || new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes("--dry-run");

const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const accessToken = firebaseConfig.tokens?.access_token;

if (!accessToken) {
  throw new Error("No Firebase CLI access token found. Run: firebase login --reauth");
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)])
  );
}

async function listUsers() {
  const users = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`
    );
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Firestore REST request failed: ${res.status} ${body}`);
    }

    const body = await res.json();
    for (const doc of body.documents || []) {
      users.push({
        name: doc.name,
        uid: doc.name.split("/").pop(),
        createTime: doc.createTime,
        data: decodeFields(doc.fields || {}),
      });
    }

    pageToken = body.nextPageToken || "";
  } while (pageToken);

  return users;
}

function userDate(user) {
  return String(user.data.createdAt || user.createTime || "").slice(0, 10);
}

function isProtected(data) {
  return Boolean(
    data.role === "admin" ||
      data.stripeSubscriptionId ||
      data.stripeSubscriptionStatus ||
      data.stripeLastPayment
  );
}

async function patchStripeStatus(user) {
  const url = new URL(`https://firestore.googleapis.com/v1/${user.name}`);
  url.searchParams.append("updateMask.fieldPaths", "stripeStatus");

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        stripeStatus: { stringValue: "checkout_cancelled" },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update ${user.uid}: ${res.status} ${body}`);
  }
}

const users = await listUsers();
const candidates = users
  .filter((user) => user.data.stripeStatus === "checkout_started")
  .filter((user) => userDate(user) !== today)
  .filter((user) => !isProtected(user.data))
  .sort((a, b) => (a.data.createdAt || a.createTime).localeCompare(b.data.createdAt || b.createTime));

console.log(`Today preserved: ${today}`);
console.log(`Candidates to migrate: ${candidates.length}`);
console.table(
  candidates.map((user) => ({
    uid: user.uid,
    email: user.data.email || user.data.Email || "",
    createdAt: user.data.createdAt || "",
    createTime: user.createTime,
    stripeCustomerId: user.data.stripeCustomerId || "",
    stripeCheckoutSessionId: user.data.stripeCheckoutSessionId || "",
  }))
);

if (dryRun) {
  console.log("Dry run only. No documents changed.");
  process.exit(0);
}

for (const user of candidates) {
  await patchStripeStatus(user);
}

console.log(`Migrated ${candidates.length} users from checkout_started to checkout_cancelled.`);
