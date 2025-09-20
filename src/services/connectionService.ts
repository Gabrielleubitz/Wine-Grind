import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db, retryOnNetworkFailure } from '../firebase/config';
import { nanoid } from 'nanoid';

export interface Connection {
  id: string;
  fromUid: string;
  toUid: string;
  eventId: string;
  timestamp: any;
  fromName?: string;
  toName?: string;
  fromWork?: string;
  toWork?: string;
  fromPosition?: string;
  toPosition?: string;
  fromLinkedin?: string;
  toLinkedin?: string;
  fromEmail?: string;
  toEmail?: string;
  fromProfileImage?: string | null;
  toProfileImage?: string | null;
}

export class ConnectionService {
  // Create a new connection between two users
  static async createConnection(fromUid: string, toUid: string, eventId: string): Promise<string> {
    try {
      // Check if users exist
      const fromUserDoc = await retryOnNetworkFailure(() => getDoc(doc(db, 'users', fromUid)));
      const toUserDoc = await retryOnNetworkFailure(() => getDoc(doc(db, 'users', toUid)));
      
      if (!fromUserDoc.exists()) {
        throw new Error('Source user not found');
      }
      
      if (!toUserDoc.exists()) {
        throw new Error('Target user not found');
      }
      
      // Check if connection already exists for this event
      const existingConnection = await this.checkExistingConnection(fromUid, toUid, eventId);
      if (existingConnection) {
        console.log('✅ Connection already exists:', existingConnection.id);
        return existingConnection.id;
      }
      
      // Generate unique ID for the connection
      const connectionId = nanoid(12);
      
      // Get user data for enriching the connection
      const fromUserData = fromUserDoc.data();
      const toUserData = toUserDoc.data();
      
      console.log('📸 From user profile image:', fromUserData.profileImage);
      console.log('📸 To user profile image:', toUserData.profileImage);
      
      console.log('📸 From user data:', { 
        name: fromUserData.displayName || fromUserData.name,
        profileImage: fromUserData.profileImage 
      });
      console.log('📸 To user data:', { 
        name: toUserData.displayName || toUserData.name,
        profileImage: toUserData.profileImage 
      });
      
      // Create connection object
      const connection: Connection = {
        id: connectionId,
        fromUid,
        toUid,
        eventId,
        timestamp: serverTimestamp(),
        // Enrich with user data
        fromName: fromUserData.displayName || fromUserData.name || '',
        toName: toUserData.displayName || toUserData.name || '',
        fromWork: fromUserData.work || '',
        toWork: toUserData.work || '',
        fromPosition: fromUserData.position || '',
        toPosition: toUserData.position || '',
        fromLinkedin: fromUserData.linkedinUsername || '',
        toLinkedin: toUserData.linkedinUsername || '',
        fromEmail: fromUserData.email || '',
        toEmail: toUserData.email || '',
        fromProfileImage: fromUserData.profileImage || null,
        toProfileImage: toUserData.profileImage || null
      };
      
      // Save to Firestore
      await retryOnNetworkFailure(() => setDoc(doc(db, 'connections', connectionId), connection));
      
      console.log('✅ Connection created successfully:', connectionId);
      return connectionId;
    } catch (error) {
      console.error('❌ Error creating connection:', error);
      throw error;
    }
  }
  
  // Check if a connection already exists between two users for a specific event
  static async checkExistingConnection(fromUid: string, toUid: string, eventId: string): Promise<Connection | null> {
    try {
      const connectionsRef = collection(db, 'connections');
      
      // Check in both directions (from->to and to->from)
      const q1 = query(
        connectionsRef,
        where('fromUid', '==', fromUid),
        where('toUid', '==', toUid),
        where('eventId', '==', eventId)
      );
      
      const q2 = query(
        connectionsRef,
        where('fromUid', '==', toUid),
        where('toUid', '==', fromUid),
        where('eventId', '==', eventId)
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        retryOnNetworkFailure(() => getDocs(q1)),
        retryOnNetworkFailure(() => getDocs(q2))
      ]);
      
      // Return the first connection found (if any)
      if (!snapshot1.empty) {
        return { id: snapshot1.docs[0].id, ...snapshot1.docs[0].data() } as Connection;
      }
      
      if (!snapshot2.empty) {
        return { id: snapshot2.docs[0].id, ...snapshot2.docs[0].data() } as Connection;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error checking existing connection:', error);
      return null;
    }
  }
  
  // Get all connections for a user
  static async getUserConnections(userId: string, limitCount = 50): Promise<Connection[]> {
    try {
      const connectionsRef = collection(db, 'connections');
      
      // Get connections where user is either the source or target
      const q1 = query(
        connectionsRef,
        where('fromUid', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const q2 = query(
        connectionsRef,
        where('toUid', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        retryOnNetworkFailure(() => getDocs(q1)),
        retryOnNetworkFailure(() => getDocs(q2))
      ]);
      
      // Combine results
      const connections: Connection[] = [];
      
      snapshot1.forEach(doc => {
        const data = doc.data();
        console.log('📸 Connection where user is fromUid:', {
          id: doc.id,
          fromProfileImage: data.fromProfileImage,
          toProfileImage: data.toProfileImage
        });
        connections.push({ id: doc.id, ...data } as Connection);
      });
      
      snapshot2.forEach(doc => {
        const data = doc.data();
        console.log('📸 Connection where user is toUid:', {
          id: doc.id,
          fromProfileImage: data.fromProfileImage,
          toProfileImage: data.toProfileImage
        });
        connections.push({ id: doc.id, ...data } as Connection);
      });
      
      // Sort by timestamp (newest first)
      connections.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
      });
      
      // Remove duplicates (if any)
      const uniqueConnections = connections.filter((connection, index, self) =>
        index === self.findIndex(c => c.id === connection.id)
      );
      
      return uniqueConnections;
    } catch (error) {
      console.error('❌ Error fetching user connections:', error);
      return [];
    }
  }
  
  // Get connections for a user filtered by event
  static async getUserConnectionsByEvent(userId: string, eventId: string): Promise<Connection[]> {
    try {
      const connectionsRef = collection(db, 'connections');
      
      // Get connections where user is either the source or target for the specific event
      const q1 = query(
        connectionsRef,
        where('fromUid', '==', userId),
        where('eventId', '==', eventId),
        orderBy('timestamp', 'desc')
      );
      
      const q2 = query(
        connectionsRef,
        where('toUid', '==', userId),
        where('eventId', '==', eventId),
        orderBy('timestamp', 'desc')
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        retryOnNetworkFailure(() => getDocs(q1)),
        retryOnNetworkFailure(() => getDocs(q2))
      ]);
      
      // Combine results
      const connections: Connection[] = [];
      
      snapshot1.forEach(doc => {
        connections.push({ id: doc.id, ...doc.data() } as Connection);
      });
      
      snapshot2.forEach(doc => {
        connections.push({ id: doc.id, ...doc.data() } as Connection);
      });
      
      // Sort by timestamp (newest first)
      connections.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
      });
      
      // Remove duplicates (if any)
      const uniqueConnections = connections.filter((connection, index, self) =>
        index === self.findIndex(c => c.id === connection.id)
      );
      
      return uniqueConnections;
    } catch (error) {
      console.error('❌ Error fetching user connections by event:', error);
      return [];
    }
  }
  
  // Format timestamp for display
  static formatTimestamp(timestamp: any): string {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // Format position for display
  static formatPosition(position: string | undefined): string {
    if (!position) return '';
    
    const positionMap: Record<string, string> = {
      'investor': 'Investor',
      'c_level': 'C-Level Executive',
      'vp_level': 'VP Level',
      'director': 'Director',
      'senior_manager': 'Senior Manager',
      'manager': 'Manager',
      'senior_contributor': 'Senior Contributor',
      'individual_contributor': 'Individual Contributor',
      'junior_level': 'Junior Level',
      'founder': 'Founder',
      'consultant': 'Consultant',
      'student': 'Student',
      'other': 'Other'
    };
    
    return positionMap[position] || position;
  }
  
  // Format LinkedIn username for display
  static formatLinkedinUrl(username: string | undefined): string {
    if (!username) return '';
    
    // Remove any linkedin.com prefix if present
    const cleanUsername = username.replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//i, '');
    
    // Remove trailing slash if present
    return cleanUsername.replace(/\/$/, '');
  }
}