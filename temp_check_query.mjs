import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";

const CONFIG = {
    apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
    projectId: "hadeth-7baf7",
};

const app = initializeApp(CONFIG);
const db = getFirestore(app);

async function check() {
    const q = query(collection(db, 'hadiths'), where("id", "==", 2053), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        console.log("Found by numeric id 2053!");
        console.log("Data:", JSON.stringify(snap.docs[0].data(), null, 2));
    } else {
        const q2 = query(collection(db, 'hadiths'), where("id", "==", "2053"), limit(1));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
            console.log("Found by string id '2053'!");
        } else {
            console.log("NOT found by id 2053");
        }
    }
}
check();
