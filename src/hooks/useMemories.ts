import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  onSnapshot,
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

export interface Memory {
  id: string;
  date: string; // YYYY-MM-DD
  imageUrl: string; // base64
  note: string;
  createdAt: number;
  uid?: string;
}
export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setMemories([]);
      setIsLoaded(true);
      return;
    }

    const path = `users/${user.uid}/memories`;
    const q = query(
      collection(db, path),
      orderBy('date', 'desc')
    );

    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as Memory);
        setMemories(data);
        setIsLoaded(true);
      }, (error) => {
        setIsLoaded(true);
        handleFirestoreError(error, OperationType.GET, path);
      });
    } catch (error) {
      setIsLoaded(true);
      handleFirestoreError(error, OperationType.GET, path);
    }
    
    return () => unsubscribe();
  }, [user]);

  const addMemory = async (memory: Omit<Memory, 'id' | 'createdAt'>) => {
    if (!user) return;

    const id = crypto.randomUUID();
    const newMemory: Memory = {
      ...memory,
      id,
      createdAt: Date.now(),
      uid: user.uid
    };

    const path = `users/${user.uid}/memories/${id}`;
    try {
      await setDoc(doc(db, path), newMemory);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!user) return;

    const path = `users/${user.uid}/memories/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return { memories, addMemory, deleteMemory, isLoaded };
}
