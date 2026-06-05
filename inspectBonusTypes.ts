import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectBonusTypes() {
  const snap = await getDocs(collection(db, "bonuses"));
  const types = new Map<string, number>();
  const labels = new Map<string, number>();
  
  snap.forEach(d => {
    const data = d.data();
    const typeStr = data.type || "none";
    const labelStr = data.label || "none";
    types.set(typeStr, (types.get(typeStr) || 0) + 1);
    labels.set(labelStr, (labels.get(labelStr) || 0) + 1);
  });

  console.log("=== UNIQUE BONUS TYPES ===");
  for (const [t, count] of types.entries()) {
    console.log(`Type: ${t} | Count: ${count}`);
  }

  console.log("\n=== UNIQUE BONUS LABELS ===");
  for (const [l, count] of labels.entries()) {
    console.log(`Label: ${l} | Count: ${count}`);
  }
}

inspectBonusTypes().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
