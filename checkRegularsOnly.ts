import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const levelDeposits: Record<string, number> = {
  "Intern": 0,
  "JOB1": 4000,
  "JOB2": 10000,
  "JOB3": 30000,
  "JOB4": 60000,
  "JOB5": 120000,
};

async function checkRegularsOnly() {
  const usersSnap = await getDocs(collection(db, "users"));
  const regularUsers: any[] = [];
  
  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    const lStr = (data.currentLevel || "").toUpperCase();
    if (lStr !== "INTERN" && lStr !== "" && data.role !== "admin") {
      regularUsers.push({
        id: docSnap.id,
        fullName: data.fullName,
        currentLevel: data.currentLevel,
        income: data.income,
        workDeposit: data.workDeposit
      });
    }
  });

  console.log(`Regular Users found of level JOB1+: count=${regularUsers.length}`);
  console.log(JSON.stringify(regularUsers, null, 2));
}

checkRegularsOnly().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
