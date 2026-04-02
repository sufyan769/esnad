import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

const CONFIG = {
    apiKey: "AIzaSyBYJ2pVoWJ5ednWOnnF2dOJ43MJvDi_8rw",
    projectId: "hadeth-7baf7",
};

const app = initializeApp(CONFIG);
const db = getFirestore(app);

async function test(id) {
    console.log("Direct doc...");
    try {
        const snap = await getDoc(doc(db, 'hadiths', id));
        console.log("direct snap exists:", snap.exists());
    } catch(e) { console.error(e.message) }

    console.log("String query...");
    try {
        const q = query(collection(db, 'hadiths'), where("id", "==", String(id)), limit(1));
        const s = await getDocs(q);
        console.log("string query empty:", s.empty);
        if(!s.empty) console.log("Found:", s.docs[0].id);
    } catch(e) { console.error(e.message) }
    
    console.log("Number query...");
    try {
        const q = query(collection(db, 'hadiths'), where("id", "==", Number(id)), limit(1));
        const s = await getDocs(q);
        console.log("number query empty:", s.empty);
        if(!s.empty) console.log("Found:", s.docs[0].id);
    } catch(e) { console.error(e.message) }
}
test("1083");
