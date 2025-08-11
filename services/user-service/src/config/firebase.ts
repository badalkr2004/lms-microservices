import admin from 'firebase-admin';
import { config } from './config';
import { logger } from '@lms/logger';

export const initFirebase = () => {
  try {
    if (!config.firebase.serviceAccount) {
      throw new Error('Firebase service account key not provided');
    }

    const serviceAccount = JSON.parse(config.firebase.serviceAccount);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: config.firebase.projectId,
    });

    logger.info('Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error);
    process.exit(1);
  }
};

export const verifyFirebaseToken = async (token: string) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    logger.error('Firebase token verification failed:', error);
    throw new Error('Invalid Firebase token');
  }
};
