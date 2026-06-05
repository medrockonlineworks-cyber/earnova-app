import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function listUsers() {
  const snap = await getDocs(collection(db, "users"));
  console.log(`Total users in DB: ${snap.size}`);
  snap.forEach(docSnap => {
    const data = docSnap.data();
    console.log(`ID: ${docSnap.id} | Name: ${data.fullName || "N/A"} | Level: ${data.currentLevel || "N/A"} | Phone: ${data.phoneNumber || "N/A"} | Income: ${data.income || 0}`);
  });
}

listUsers().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
