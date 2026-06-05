import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectUpgrades() {
  const snap = await getDocs(collection(db, "bonuses"));
  let count = 0;
  snap.forEach(d => {
    const data = d.data();
    if (data.type === "level_upgrade") {
      count++;
      console.log(`Bonus ID: ${d.id} | User: ${data.userId} | Label: ${data.label} | Amount: ${data.amount}`);
    }
  });
  console.log(`Total level upgrade documents: ${count}`);
}

inspectUpgrades().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
