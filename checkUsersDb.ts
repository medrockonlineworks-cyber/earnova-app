import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkUsers() {
  const usersSnap = await getDocs(collection(db, "users"));
  console.log(`Total users in DB: ${usersSnap.size}`);
  
  const regularUsers: any[] = [];
  const inters: any[] = [];
  const admins: any[] = [];

  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    const info = {
      id: docSnap.id,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      currentLevel: data.currentLevel,
      role: data.role,
      workDeposit: data.workDeposit,
      income: data.income
    };
    
    if (data.role === "admin") {
      admins.push(info);
    } else if ((data.currentLevel || "").toUpperCase() === "INTERN") {
      inters.push(info);
    } else {
      regularUsers.push(info);
    }
  });

  console.log(`=== ADMINS (${admins.length}) ===`);
  console.log(JSON.stringify(admins, null, 2));

  console.log(`=== REGULAR USERS (${regularUsers.length}) ===`);
  console.log(JSON.stringify(regularUsers, null, 2));
}

checkUsers().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
