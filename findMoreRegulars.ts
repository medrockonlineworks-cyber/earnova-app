import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findMoreRegulars() {
  console.log("Gathering data from other collections to trace regular users...");
  
  // 1. Trace by signed contracts or level mentions in all user documents (completed or deleted)
  const usersSnap = await getDocs(collection(db, "users"));
  const userMap = new Map<string, any>();
  usersSnap.forEach(d => {
    userMap.set(d.id, d.data());
  });

  // 2. Trace by Recharges (approved ones are indicative of level deposits)
  const rechargesSnap = await getDocs(collection(db, "recharges"));
  const rechargeStats = new Map<string, number>();
  rechargesSnap.forEach(d => {
    const data = d.data();
    if (data.userId && data.status === "approved") {
      const amount = data.amount || 0;
      rechargeStats.set(data.userId, (rechargeStats.get(data.userId) || 0) + amount);
    }
  });

  // 3. Trace by withdrawals (if they withdrew, they are active users)
  const withdrawalsSnap = await getDocs(collection(db, "withdrawals"));
  const withdrawalStats = new Map<string, any[]>();
  withdrawalsSnap.forEach(d => {
    const data = d.data();
    if (data.userId) {
      if (!withdrawalStats.has(data.userId)) withdrawalStats.set(data.userId, []);
      withdrawalStats.get(data.userId)!.push(data);
    }
  });

  // 4. Trace by any bonuses or commissions
  const bonusesSnap = await getDocs(collection(db, "bonuses"));
  const bonusStats = new Map<string, any[]>();
  bonusesSnap.forEach(d => {
    const data = d.data();
    if (data.userId) {
      if (!bonusStats.has(data.userId)) bonusStats.set(data.userId, []);
      bonusStats.get(data.userId)!.push(data);
    }
  });

  const commissionsSnap = await getDocs(collection(db, "commissions"));
  const commissionStats = new Map<string, any[]>();
  commissionsSnap.forEach(d => {
    const data = d.data();
    const uid = data.userId;
    if (uid) {
      if (!commissionStats.has(uid)) commissionStats.set(uid, []);
      commissionStats.get(uid)!.push(data);
    }
    const subordinate = data.subordinatePhone;
    if (subordinate) {
      if (!commissionStats.has(subordinate)) commissionStats.set(subordinate, []);
      commissionStats.get(subordinate)!.push(data);
    }
  });

  console.log("\n=== USERS WITH NO OR EMPTY PROFILE BUT HAVING ACTIVE REF DETAILS ===");
  const allCandidateIds = new Set<string>([
    ...userMap.keys(),
    ...rechargeStats.keys(),
    ...withdrawalStats.keys(),
    ...bonusStats.keys(),
    ...commissionStats.keys()
  ]);

  const levelDeposits: Record<string, number> = {
    "Intern": 0,
    "JOB1": 4000,
    "JOB2": 10000,
    "JOB3": 30000,
    "JOB4": 60000,
    "JOB5": 120000,
  };

  const levelByDeposit = (depValue: number) => {
    if (depValue >= 120000) return "JOB5";
    if (depValue >= 60000) return "JOB4";
    if (depValue >= 30000) return "JOB3";
    if (depValue >= 10000) return "JOB2";
    if (depValue >= 4000) return "JOB1";
    return "Intern";
  };

  const tracedList: any[] = [];

  allCandidateIds.forEach(uid => {
    const userDoc = userMap.get(uid);
    const rechargeAmt = rechargeStats.get(uid) || 0;
    const withdrawals = withdrawalStats.get(uid) || [];
    const bonuses = bonusStats.get(uid) || [];
    const commissions = commissionStats.get(uid) || [];

    // Let's see if this user has signed contracts or any trace of JOB
    let levelTrace = "Intern";
    if (userDoc?.currentLevel && userDoc.currentLevel.toUpperCase() !== "INTERN") {
      levelTrace = userDoc.currentLevel;
    } else {
      // Trace by signing bonus or contract signing in user doc
      const signingBonuses = bonuses.filter(b => b.type === "level_upgrade");
      if (signingBonuses.length > 0) {
        let maxUpgradeVal = 0;
        signingBonuses.forEach(b => {
          const match = (b.label || "").match(/JOB\d+/);
          if (match) {
            const levelNum = match[0];
            const dep = levelDeposits[levelNum] || 0;
            if (dep > maxUpgradeVal) {
              maxUpgradeVal = dep;
              levelTrace = levelNum;
            }
          }
        });
      } else if (userDoc?.signedContracts && userDoc.signedContracts.length > 0) {
        // Trace by signed contracts
        let maxUpgradeVal = 0;
        userDoc.signedContracts.forEach((c: string) => {
          const match = c.match(/JOB\d+/);
          if (match) {
            const dep = levelDeposits[match[0]] || 0;
            if (dep > maxUpgradeVal) {
              maxUpgradeVal = dep;
              levelTrace = match[0];
            }
          }
        });
      } else if (rechargeAmt > 0) {
        levelTrace = levelByDeposit(rechargeAmt);
      }
    }

    const hasTraces = rechargeAmt > 0 || withdrawals.length > 0 || bonuses.length > 0 || commissions.length > 0;
    
    tracedList.push({
      uid,
      hasUserDoc: !!userDoc,
      currentLevelInDoc: userDoc?.currentLevel || "none",
      determinedLevel: levelTrace,
      rechargeApproved: rechargeAmt,
      totalBonuses: bonuses.reduce((acc, b) => acc + (b.amount || 0), 0),
      totalCommissions: commissions.reduce((acc, c) => acc + (c.amount || 0), 0),
      fullName: userDoc?.fullName || "none"
    });
  });

  console.log("Candidates list (determined Level !== Intern):");
  const filteredTraced = tracedList.filter(item => item.determinedLevel !== "Intern" && item.uid !== "0926193920");
  filteredTraced.forEach(item => {
    console.log(JSON.stringify(item));
  });

  console.log(`Total regular candidate users found: ${filteredTraced.length}`);
}

findMoreRegulars().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
