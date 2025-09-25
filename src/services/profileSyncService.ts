import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

export class ProfileSyncService {
  /**
   * 🔄 Sync user's profile image across all connections and speaker assignments
   * This should be called whenever a user updates their profile picture
   */
  static async syncUserProfileImage(userId: string, newProfileImageUrl: string | null): Promise<void> {
    console.log('🔄 Starting profile image sync for user:', userId);
    console.log('🖼️ New profile image URL:', newProfileImageUrl);
    
    try {
      // Run all sync operations in parallel for better performance
      await Promise.all([
        this.syncConnectionsProfileImage(userId, newProfileImageUrl),
        this.syncSpeakerAssignmentsProfileImage(userId, newProfileImageUrl),
        this.syncEventSpeakersProfileImage(userId, newProfileImageUrl)
      ]);
      
      console.log('✅ Profile image sync completed successfully');
    } catch (error) {
      console.error('❌ Error during profile image sync:', error);
      throw error;
    }
  }

  /**
   * 🔗 Update profile image in all connections where user is involved
   */
  private static async syncConnectionsProfileImage(userId: string, profileImageUrl: string | null): Promise<void> {
    console.log('🔗 Syncing profile image in connections...');
    
    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Get connections where user is the "from" user
      const fromConnectionsQuery = query(
        collection(db, 'connections'),
        where('fromUid', '==', userId)
      );
      
      const fromConnectionsSnapshot = await getDocs(fromConnectionsQuery);
      fromConnectionsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          fromProfileImage: profileImageUrl
        });
        updateCount++;
      });

      // Get connections where user is the "to" user
      const toConnectionsQuery = query(
        collection(db, 'connections'),
        where('toUid', '==', userId)
      );
      
      const toConnectionsSnapshot = await getDocs(toConnectionsQuery);
      toConnectionsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          toProfileImage: profileImageUrl
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated profile image in ${updateCount} connections`);
      } else {
        console.log('📝 No connections found to update');
      }
    } catch (error) {
      console.error('❌ Error syncing connections profile image:', error);
      throw error;
    }
  }

  /**
   * 🎤 Update profile image in speaker assignments
   */
  private static async syncSpeakerAssignmentsProfileImage(userId: string, profileImageUrl: string | null): Promise<void> {
    console.log('🎤 Syncing profile image in speaker assignments...');
    
    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Get speaker assignments for this user
      const speakerAssignmentsQuery = query(
        collection(db, 'speakerAssignments'),
        where('speakerId', '==', userId)
      );
      
      const speakerAssignmentsSnapshot = await getDocs(speakerAssignmentsQuery);
      speakerAssignmentsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          speakerProfileImage: profileImageUrl
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated profile image in ${updateCount} speaker assignments`);
      } else {
        console.log('📝 No speaker assignments found to update');
      }
    } catch (error) {
      console.error('❌ Error syncing speaker assignments profile image:', error);
      throw error;
    }
  }

  /**
   * 📅 Update profile image in event speakers arrays
   */
  private static async syncEventSpeakersProfileImage(userId: string, profileImageUrl: string | null): Promise<void> {
    console.log('📅 Syncing profile image in event speakers...');
    
    try {
      // Get all events where user is a speaker
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const speakers = eventData.speakers || [];
        
        // Find speaker in the array
        const speakerIndex = speakers.findIndex((speaker: any) => speaker.userId === userId);
        
        if (speakerIndex >= 0) {
          // Update the speaker's profile image
          speakers[speakerIndex].profileImage = profileImageUrl;
          
          batch.update(eventDoc.ref, {
            speakers: speakers
          });
          
          updateCount++;
          console.log(`📝 Found speaker in event: ${eventData.name}`);
        }
      }

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated profile image in ${updateCount} event speakers arrays`);
      } else {
        console.log('📝 No event speakers found to update');
      }
    } catch (error) {
      console.error('❌ Error syncing event speakers profile image:', error);
      throw error;
    }
  }

  /**
   * 🔄 Full profile data sync (name, work, position, etc.)
   * Use this when user updates any profile information
   */
  static async syncUserProfileData(userId: string): Promise<void> {
    console.log('🔄 Starting full profile data sync for user:', userId);
    
    try {
      // Get latest user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const profileData = {
        name: userData.displayName || userData.name || '',
        work: userData.work || '',
        position: userData.position || '',
        linkedinUsername: userData.linkedinUsername || '',
        email: userData.email || '',
        profileImage: userData.profileImage || null
      };

      console.log('📋 Latest profile data:', profileData);

      // Sync all data types
      await Promise.all([
        this.syncConnectionsFullData(userId, profileData),
        this.syncSpeakerAssignmentsFullData(userId, profileData),
        this.syncEventSpeakersFullData(userId, profileData)
      ]);

      console.log('✅ Full profile data sync completed successfully');
    } catch (error) {
      console.error('❌ Error during full profile sync:', error);
      throw error;
    }
  }

  /**
   * 🔗 Sync full profile data in connections
   */
  private static async syncConnectionsFullData(userId: string, profileData: any): Promise<void> {
    console.log('🔗 Syncing full profile data in connections...');
    
    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Update "from" connections
      const fromConnectionsQuery = query(
        collection(db, 'connections'),
        where('fromUid', '==', userId)
      );
      
      const fromConnectionsSnapshot = await getDocs(fromConnectionsQuery);
      fromConnectionsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          fromName: profileData.name,
          fromWork: profileData.work,
          fromPosition: profileData.position,
          fromLinkedin: profileData.linkedinUsername,
          fromEmail: profileData.email,
          fromProfileImage: profileData.profileImage
        });
        updateCount++;
      });

      // Update "to" connections
      const toConnectionsQuery = query(
        collection(db, 'connections'),
        where('toUid', '==', userId)
      );
      
      const toConnectionsSnapshot = await getDocs(toConnectionsQuery);
      toConnectionsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          toName: profileData.name,
          toWork: profileData.work,
          toPosition: profileData.position,
          toLinkedin: profileData.linkedinUsername,
          toEmail: profileData.email,
          toProfileImage: profileData.profileImage
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated full profile data in ${updateCount} connections`);
      }
    } catch (error) {
      console.error('❌ Error syncing connections full data:', error);
      throw error;
    }
  }

  /**
   * 🎤 Sync full profile data in speaker assignments
   */
  private static async syncSpeakerAssignmentsFullData(userId: string, profileData: any): Promise<void> {
    console.log('🎤 Syncing full profile data in speaker assignments...');
    
    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      const speakerAssignmentsQuery = query(
        collection(db, 'speakerAssignments'),
        where('speakerId', '==', userId)
      );
      
      const speakerAssignmentsSnapshot = await getDocs(speakerAssignmentsQuery);
      speakerAssignmentsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          speakerName: profileData.name,
          speakerEmail: profileData.email,
          speakerProfileImage: profileData.profileImage
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated full profile data in ${updateCount} speaker assignments`);
      }
    } catch (error) {
      console.error('❌ Error syncing speaker assignments full data:', error);
      throw error;
    }
  }

  /**
   * 📅 Sync full profile data in event speakers
   */
  private static async syncEventSpeakersFullData(userId: string, profileData: any): Promise<void> {
    console.log('📅 Syncing full profile data in event speakers...');
    
    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const speakers = eventData.speakers || [];
        
        const speakerIndex = speakers.findIndex((speaker: any) => speaker.userId === userId);
        
        if (speakerIndex >= 0) {
          // Update the speaker's full data
          speakers[speakerIndex] = {
            ...speakers[speakerIndex],
            name: profileData.name,
            email: profileData.email,
            profileImage: profileData.profileImage
          };
          
          batch.update(eventDoc.ref, {
            speakers: speakers
          });
          
          updateCount++;
        }
      }

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated full profile data in ${updateCount} event speakers`);
      }
    } catch (error) {
      console.error('❌ Error syncing event speakers full data:', error);
      throw error;
    }
  }

  /**
   * 🔧 Manual sync trigger - use this to fix existing data
   * This can be called from admin panel or run as maintenance
   */
  static async manualSyncAllUsers(): Promise<void> {
    console.log('🔧 Starting manual sync for all users...');
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      let processedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        console.log(`🔄 Processing user ${processedCount + 1}/${usersSnapshot.size}: ${userId}`);
        
        try {
          await this.syncUserProfileData(userId);
          processedCount++;
        } catch (error) {
          console.error(`❌ Failed to sync user ${userId}:`, error);
          // Continue with other users even if one fails
        }
        
        // Add a small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Manual sync completed. Processed ${processedCount}/${usersSnapshot.size} users`);
    } catch (error) {
      console.error('❌ Error during manual sync:', error);
      throw error;
    }
  }
}

export default ProfileSyncService;