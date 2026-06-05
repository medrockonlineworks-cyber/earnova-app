import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const internMislabeledPhones = [
  "0942052839",
  "0926909039",
  "251786978816",
  "0921486068",
  "0957570828",
  "0903850000",
  "0912905930",
  "915721539",
  "0913127129",
  "0914749209"
];

async function traceDetailedCommissions() {
  const snap = await getDocs(collection(db, "commissions"));
  const commsByUser: Record<string, any[]> = {};
  
  internMislabeledPhones.forEach(p => { commsByUser[p] = []; });
  
  snap.forEach(d => {
    const data = d.data();
    const uid = data.userId;
    if (uid && internMislabeledPhones.includes(uid)) {
      commsByUser[uid].push({ id: d.id, ...data });
    }
  });

  for (const phone of internMislabeledPhones) {
    const list = commsByUser[phone] || [];
    console.log(`\n=== PHONE: ${phone} | Total docs: ${list.length} ===`);
    if (list.length === 0) {
      console.log("No commissions found.");
      continue;
    }
    // Summarize list elements
    const types = new Set(list.map(x => x.type || "none"));
    const amounts = list.map(x => x.amount || 0);
    const sum = amounts.reduce((a, b) => a + b, 0);
    console.log(`Sum of commissions: ${sum}`);
    console.log(`Types: ${Array.from(types).join(", ")}`);
    console.log("Sample commission values:", amounts.slice(0, 10).join(", "));
    
    // Print first 5 commissions to check typical amounts
    console.log("First 3 commissions:");
    list.slice(0, 3).forEach(c => {
      console.log(`  Amt: ${c.amount} | Type: ${c.type} | Subordinate: ${c.subordinatePhone} | Details: ${c.details || ""}`);
    });
  }
}

traceDetailedCommissions().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
