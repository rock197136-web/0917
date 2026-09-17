  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBjkKYryRVBZSkthVEflTkqwmDuFiR9JE0",
    authDomain: "bxbs-c0759.firebaseapp.com",
    projectId: "bxbs-c0759",
    storageBucket: "bxbs-c0759.firebasestorage.app",
    messagingSenderId: "388767962489",
    appId: "1:388767962489:web:8518b01e446332f00a4ba8",
    measurementId: "G-21R1CPPND2"
  };

  function isConfigured(){
    return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY");
  }

  window.cloudSync = { isConfigured, ready:false };

  if(isConfigured()){
    (async () => {
      try{
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js");
        const {
          getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc,
          onSnapshot, collection, writeBatch, serverTimestamp,
          query, where, limit
        } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");

        const app = initializeApp(FIREBASE_CONFIG);
        const db = getFirestore(app);
        let currentCode = null;
        let unsubMeta = null;
        let unsubMatches = null;

        function stop(){
          if(unsubMeta) unsubMeta();
          if(unsubMatches) unsubMatches();
          unsubMeta = null; unsubMatches = null; currentCode = null;
        }

        window.cloudSync = {
          isConfigured,
          ready: true,

          // codeEntered may be either the referee (full-access) code, which
          // is also the Firestore document id, or the read-only viewer code,
          // which is stored as a field on that same document.
          async resolveCode(codeEntered){
            const directSnap = await getDoc(doc(db, 'events', codeEntered));
            if(directSnap.exists()){
              return { role:'referee', eventCode:codeEntered, data:directSnap.data() };
            }
            const q = query(collection(db, 'events'), where('viewerCode', '==', codeEntered), limit(1));
            const qSnap = await getDocs(q);
            if(!qSnap.empty){
              const d = qSnap.docs[0];
              return { role:'viewer', eventCode:d.id, data:d.data() };
            }
            return null;
          },

          async createEvent(refCode, viewerCode, metaData){
            await setDoc(doc(db, 'events', refCode), { ...metaData, viewerCode, updatedAt: serverTimestamp() });
          },

          join(code, onMeta, onMatches){
            stop();
            currentCode = code;
            unsubMeta = onSnapshot(doc(db, 'events', code), snap => {
              if(snap.exists()) onMeta(snap.data());
            });
            unsubMatches = onSnapshot(collection(db, 'events', code, 'matches'), snap => {
              const list = [];
              snap.forEach(d => list.push(d.data()));
              onMatches(list);
            });
          },

          leave(){ stop(); },

          async pushMeta(metaData){
            if(!currentCode) return;
            await setDoc(doc(db, 'events', currentCode), { ...metaData, updatedAt: serverTimestamp() }, { merge:true });
          },

          async pushMatches(matchArray){
            if(!currentCode || matchArray.length === 0) return;
            const batch = writeBatch(db);
            matchArray.forEach(m => batch.set(doc(db, 'events', currentCode, 'matches', String(m.id)), m));
            await batch.commit();
          },

          async clearMatches(){
            if(!currentCode) return;
            const snap = await getDocs(collection(db, 'events', currentCode, 'matches'));
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        };
        window.dispatchEvent(new Event('cloudsync-ready'));
      }catch(err){
        console.error('Firebase 初始化失敗，改用本機模式：', err);
        window.cloudSync = { isConfigured:()=>false, ready:false };
        window.dispatchEvent(new Event('cloudsync-ready'));
      }
    })();
  } else {
    window.dispatchEvent(new Event('cloudsync-ready'));
  }
