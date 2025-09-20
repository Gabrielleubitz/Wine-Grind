import { doc, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface RegistrationData {
  id: string;
  name: string;
  email: string;
  phone: string;
  work: string;
  status: 'registered' | 'attended';
  isAttending?: boolean;
  ticketId?: string;
}

export class RegistrationService {
  // Find registration by ticket ID
  static async findByTicketId(ticketId: string): Promise<RegistrationData | null> {
    try {
      const q = query(collection(db, 'registrations'), where('ticketId', '==', ticketId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as RegistrationData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding registration by ticketId:', error);
      return null;
    }
  }

  // Find registration by document ID
  static async findById(id: string): Promise<RegistrationData | null> {
    try {
      const docRef = doc(db, 'registrations', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as RegistrationData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding registration by ID:', error);
      return null;
    }
  }

  // Find registration by email
  static async findByEmail(email: string): Promise<RegistrationData | null> {
    try {
      const q = query(collection(db, 'registrations'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as RegistrationData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding registration by email:', error);
      return null;
    }
  }

  // Update attendance status
  static async updateAttendanceStatus(
    registrationId: string, 
    status: 'registered' | 'attended',
    checkedInBy?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, 'registrations', registrationId);
      const updateData: any = { 
        status,
        ...(status === 'attended' ? { 
          isAttending: true,
          checkedInAt: new Date(),
          ...(checkedInBy && { checkedInBy })
        } : {})
      };
      
      await updateDoc(docRef, updateData);
      console.log('✅ Attendance status updated:', status);
    } catch (error) {
      console.error('❌ Error updating attendance status:', error);
      throw error;
    }
  }

  // Get registration stats
  static async getStats(): Promise<{ total: number; registered: number; attended: number }> {
    try {
      const registrationsRef = collection(db, 'registrations');
      const snapshot = await getDocs(registrationsRef);
      
      let total = 0;
      let registered = 0;
      let attended = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (data.status === 'registered') registered++;
        if (data.status === 'attended') attended++;
      });
      
      return { total, registered, attended };
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      return { total: 0, registered: 0, attended: 0 };
    }
  }
}