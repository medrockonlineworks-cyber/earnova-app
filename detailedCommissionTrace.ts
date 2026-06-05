import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function traceCommissions() {
  const commissionsSnap = await getDocs(collection(db, "commissions"));
  const commUsers = new Map<string, { sum: number, count: number, types: Set<string> }>();

  commissionsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const uid = data.userId;
    if (uid) {
      if (!commUsers.has(uid)) {
        commUsers.set(uid, { sum: 0, count: 0, types: new Set() });
      }
      const entry = commUsers.get(uid)!;
      entry.sum += data.amount || 0;
      entry.count += 1;
      if (data.type) entry.types.add(data.type);
    }
  });

  console.log("=== USERS WHO RECEIVED COMMISSIONS ===");
  for (const [uid, info] of commUsers.entries()) {
    const userDS = await getDoc(doc(db, "users", uid));
    const uData = userDS.exists() ? userDS.data() : null;
    console.log(`User: ${uid} | Sum: ${info.sum.toFixed(2)} | Count: ${info.count} | CurrentLevel: ${uData?.currentLevel || "none"} | Name: ${uData?.fullName || "none"}`);
  }
}

traceCommissions().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
