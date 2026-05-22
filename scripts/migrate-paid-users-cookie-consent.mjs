import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "immobot-dc818";
const dryRun = process.argv.includes("--dry-run");
const firebaseClientId =
  process.env.FIREBASE_CLIENT_ID ||
  "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const firebaseClientSecret = process.env.FIREBASE_CLIENT_SECRET || "j9iVZfS8kkCEFUPaAeJV0sAi";

const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
async function getAccessToken() {
  if (process.env.FIRESTORE_ACCESS_TOKEN) return process.env.FIRESTORE_ACCESS_TOKEN;

  const refreshToken = firebaseConfig.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("No Firebase CLI refresh token found. Run: firebase login --reauth");
  }

  const res = await fetch("https://www.googleapis.com/oauth2/v3/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: firebaseClientId,
      client_secret: firebaseClientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to refresh Firebase CLI token: ${res.status} ${body}`);
  }

  const body = await res.json();
  if (!body.access_token) {
    throw new Error("Token refresh response did not include access_token.");
  }

  return body.access_token;
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

async function listUsers(accessToken) {
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
        updateTime: doc.updateTime,
        data: decodeFields(doc.fields || {}),
      });
    }

    pageToken = body.nextPageToken || "";
  } while (pageToken);

  return users;
}

async function patchCookieConsent(user, now, accessToken) {
  const url = new URL(`https://firestore.googleapis.com/v1/${user.name}`);
  url.searchParams.append("updateMask.fieldPaths", "cookieConsent");

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        cookieConsent: {
          mapValue: {
            fields: {
              accepted: { booleanValue: true },
              acceptedAt: { timestampValue: now },
              updatedAt: { timestampValue: now },
              migratedAt: { timestampValue: now },
              migration: { stringValue: "paid-users-cookie-consent-v1" },
              version: { integerValue: 1 },
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to update ${user.uid}: ${res.status} ${body}`);
  }
}

const accessToken = await getAccessToken();
const users = await listUsers(accessToken);
const candidates = users
  .filter((user) => user.data?.stripeStatus === "paid")
  .filter((user) => user.data?.cookieConsent?.accepted !== true)
  .sort((a, b) => (a.data.createdAt || a.createTime).localeCompare(b.data.createdAt || b.createTime));

console.log(`Total users: ${users.length}`);
console.log(`Paid users missing cookieConsent.accepted=true: ${candidates.length}`);
console.table(
  candidates.map((user) => ({
    uid: user.uid,
    email: user.data.email || user.data.Email || "",
    stripeStatus: user.data.stripeStatus || "",
    stripeSubscriptionStatus: user.data.stripeSubscriptionStatus || "",
    cookieConsentAccepted: user.data.cookieConsent?.accepted ?? "",
    createdAt: user.data.createdAt || "",
    updateTime: user.updateTime || "",
  }))
);

if (dryRun) {
  console.log("Dry run only. No documents changed.");
  process.exit(0);
}

const now = new Date().toISOString();
for (const user of candidates) {
  await patchCookieConsent(user, now, accessToken);
}

console.log(`Updated ${candidates.length} paid users with cookieConsent.accepted=true.`);
