import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectRecharges() {
  const snap = await getDocs(collection(db, "recharges"));
  console.log(`Total recharge requests in DB: ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`Recharge ID: ${d.id} | User: ${data.userId} | Amount: ${data.amount} | Status: ${data.status} | Timestamp:`, data.timestamp);
  });
}

inspectRecharges().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
