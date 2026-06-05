import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspectSalaries() {
  const snap = await getDocs(collection(db, "salary_payouts"));
  console.log(`Total salary documents: ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`Doc ID: ${d.id} | UserID: ${data.userId} | Phone: ${data.phoneNumber} | Name: ${data.fullName} | Position: ${data.position} | Amount: ${data.salaryAmount}`);
  });
}

inspectSalaries().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
