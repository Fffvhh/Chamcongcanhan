import { auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  
  // Handle offline error gracefully - don't crash the app
  if (message.includes('the client is offline')) {
    console.warn(`Firestore is offline during ${operationType} on ${path}. Operation will retry when online.`);
    return;
  }

  // Handle quota exceeded gracefully - don't crash the app
  if (message.includes('Quota limit exceeded') || message.includes('resource-exhausted')) {
    console.error(`Firestore quota exceeded during ${operationType} on ${path}. Please try again tomorrow or upgrade your Firebase plan.`);
    return;
  }

  // Handle internal assertion failures (often caused by quota limits or offline state)
  if (message.includes('INTERNAL ASSERTION FAILED')) {
    console.error(`Firestore internal error during ${operationType} on ${path}. This may be related to quota limits or network issues.`, error);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
