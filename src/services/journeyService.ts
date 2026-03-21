import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../firebase';

export interface Journey {
  id: string;
  title: string;
  startLocation: string;
  endLocation: string;
  date: string;
  time?: string;
  distance?: string;
  note?: string;
  imageUrl?: string;
  uid: string;
}

export const getJourneys = async (): Promise<Journey[]> => {
  if (!auth.currentUser) return [];
  try {
    const q = query(
      collection(db, `users/${auth.currentUser.uid}/journeys`),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Journey);
  } catch (error) {
    handleFirestoreError(error, 'get' as any, `users/${auth.currentUser?.uid}/journeys`);
    return [];
  }
};

export const addJourney = async (journey: Omit<Journey, 'id' | 'uid'>): Promise<void> => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  try {
    const id = crypto.randomUUID();
    const newJourney: Journey = {
      ...journey,
      id,
      uid: auth.currentUser.uid
    };
    await setDoc(doc(db, `users/${auth.currentUser.uid}/journeys`, id), newJourney);
  } catch (error) {
    handleFirestoreError(error, 'create' as any, `users/${auth.currentUser?.uid}/journeys`);
  }
};

export const deleteJourney = async (id: string): Promise<void> => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  try {
    await deleteDoc(doc(db, `users/${auth.currentUser.uid}/journeys`, id));
  } catch (error) {
    handleFirestoreError(error, 'delete' as any, `users/${auth.currentUser?.uid}/journeys/${id}`);
  }
};

export const updateJourney = async (id: string, journey: Partial<Omit<Journey, 'id' | 'uid'>>): Promise<void> => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  try {
    await setDoc(doc(db, `users/${auth.currentUser.uid}/journeys`, id), journey, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update' as any, `users/${auth.currentUser?.uid}/journeys/${id}`);
  }
};
