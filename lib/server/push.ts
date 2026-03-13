import admin from "firebase-admin";

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  return admin;
}

export async function sendPushToToken({
  token,
  title,
  body,
}: {
  token: string;
  title: string;
  body: string;
}) {
  const firebaseAdmin = getFirebaseAdmin();

  return firebaseAdmin.messaging().send({
    token,
    notification: {
      title,
      body,
    },
  });
}