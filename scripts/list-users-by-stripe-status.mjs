import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "immobot-dc818";
const status = process.argv[2];

if (!status) {
  throw new Error("Usage: node scripts/list-users-by-stripe-status.mjs <stripeStatus>");
}

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
        uid: doc.name.split("/").pop(),
        createTime: doc.createTime,
        updateTime: doc.updateTime,
        data: decodeFields(doc.fields || {}),
      });
    }

    pageToken = body.nextPageToken || "";
  } while (pageToken);

  return users;
}

const users = await listUsers();
const matches = users
  .filter((user) => user.data?.stripeStatus === status)
  .map((user) => ({
    uid: user.uid,
    email: user.data.email || user.data.Email || "",
    role: user.data.role || "",
    createdAt: user.data.createdAt || "",
    createTime: user.createTime,
    stripeCustomerId: user.data.stripeCustomerId || "",
    stripeSubscriptionId: user.data.stripeSubscriptionId || "",
    stripeSubscriptionStatus: user.data.stripeSubscriptionStatus || "",
    stripeLastPayment: user.data.stripeLastPayment || "",
    stripeCheckoutSessionId: user.data.stripeCheckoutSessionId || "",
  }))
  .sort((a, b) => (a.createdAt || a.createTime).localeCompare(b.createdAt || b.createTime));

console.log(`Total users: ${users.length}`);
console.log(`Users with stripeStatus=${status}: ${matches.length}`);
if (matches.length) console.table(matches);
