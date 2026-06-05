import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
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

async function auditAllUsers() {
  const usersSnap = await getDocs(collection(db, "users"));
  const userMap = new Map<string, any>();
  usersSnap.forEach(d => {
    userMap.set(d.id, d.data());
  });

  const bonusesSnap = await getDocs(collection(db, "bonuses"));
  const bonusMap = new Map<string, any[]>();
  bonusesSnap.forEach(d => {
    const data = d.data();
    if (data.userId) {
      if (!bonusMap.has(data.userId)) bonusMap.set(data.userId, []);
      bonusMap.get(data.userId)!.push(data);
    }
  });

  const commissionsSnap = await getDocs(collection(db, "commissions"));
  const commMap = new Map<string, any[]>();
  commissionsSnap.forEach(d => {
    const data = d.data();
    if (data.userId) {
      if (!commMap.has(data.userId)) commMap.set(data.userId, []);
      commMap.get(data.userId)!.push(data);
    }
  });

  const rechargesSnap = await getDocs(collection(db, "recharges"));
  const rechargeMap = new Map<string, any[]>();
  rechargesSnap.forEach(d => {
    const data = d.data();
    if (data.userId) {
      if (!rechargeMap.has(data.userId)) rechargeMap.set(data.userId, []);
      rechargeMap.get(data.userId)!.push(data);
    }
  });

  console.log(`=== START DIRECTORY OF ALL 98 DATABASE USERS ===`);
  const details: any[] = [];

  const allUids = new Set<string>([
    ...userMap.keys(),
    ...bonusMap.keys(),
    ...commMap.keys(),
    ...rechargeMap.keys()
  ]);

  for (const uid of allUids) {
    const docData = userMap.get(uid) || {};
    const bonuses = bonusMap.get(uid) || [];
    const commissions = commMap.get(uid) || [];
    const recharges = rechargeMap.get(uid) || [];

    // Analyze bonuses for level upgrade
    let upgradeLevel = "Intern";
    const upgrades = bonuses.filter(b => b.type === "level_upgrade");
    if (upgrades.length > 0) {
      let maxDep = 0;
      upgrades.forEach(u => {
        const match = (u.label || "").match(/JOB\d+/);
        if (match) {
          const dep = levelDeposits[match[0]] || 0;
          if (dep > maxDep) {
            maxDep = dep;
            upgradeLevel = match[0];
          }
        }
      });
    }

    // Analyze signed contracts
    let contractLevel = "Intern";
    if (docData.signedContracts && Array.isArray(docData.signedContracts)) {
      let maxDep = 0;
      docData.signedContracts.forEach((c: string) => {
        const match = c.toUpperCase().match(/JOB\d+/);
        if (match) {
          const dep = levelDeposits[match[0]] || 0;
          if (dep > maxDep) {
            maxDep = dep;
            contractLevel = match[0];
          }
        }
      });
    }

    // Determine resolved level
    let resolvedLevel = docData.currentLevel || "Intern";
    if (resolvedLevel === "Intern" || !docData.currentLevel) {
      if (upgradeLevel !== "Intern") {
        resolvedLevel = upgradeLevel;
      } else if (contractLevel !== "Intern") {
        resolvedLevel = contractLevel;
      }
    }

    // Check completed tasks counts or commissions patterns
    const completedCount = docData.completedTaskIds?.length || 0;

    details.push({
      uid,
      fullName: docData.fullName || "no-name",
      docLevel: docData.currentLevel || "none",
      resolvedLevel,
      upgradeLevel,
      contractLevel,
      incomeInDoc: docData.income !== undefined ? docData.income : "none",
      bonusCount: bonuses.length,
      commissionCount: commissions.length,
      rechargeCount: recharges.length,
      completedTasks: completedCount,
    });
  }

  // Sort: regular users first, then interns with name, then unnamed
  details.sort((a, b) => {
    const isRegA = a.resolvedLevel !== "Intern" ? 1 : 0;
    const isRegB = b.resolvedLevel !== "Intern" ? 1 : 0;
    if (isRegA !== isRegB) return isRegB - isRegA;
    
    const hasNameA = a.fullName !== "no-name" ? 1 : 0;
    const hasNameB = b.fullName !== "no-name" ? 1 : 0;
    if (hasNameA !== hasNameB) return hasNameB - hasNameA;

    return a.uid.localeCompare(b.uid);
  });

  details.forEach((d) => {
    console.log(JSON.stringify(d));
  });

  console.log(`\nRegular Users Total: ${details.filter(d => d.resolvedLevel !== "Intern").length}`);
}

auditAllUsers().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
