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
  limit,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { nanoid } from 'nanoid';

export interface ReviewData {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  position: string;
  rating: number;
  comment: string;
  profilePictureUrl: string | null;
  createdAt: any;
}

export class ReviewService {
  // Create a new review
  static async createReview(
    eventId: string,
    userId: string,
    userName: string,
    position: string,
    rating: number,
    comment: string,
    profilePictureUrl: string | null
  ): Promise<string> {
    try {
      // Check if user has already reviewed this event
      const existingReview = await this.getUserReviewForEvent(userId, eventId);
      if (existingReview) {
        throw new Error('You have already reviewed this event');
      }

      // Create a new review ID
      const reviewId = nanoid(12);

      // Create review data
      const reviewData: ReviewData = {
        id: reviewId,
        eventId,
        userId,
        userName,
        position,
        rating: Math.min(Math.max(rating, 1), 5), // Ensure rating is between 1-5
        comment: comment.trim(),
        profilePictureUrl,
        createdAt: serverTimestamp()
      };

      // Save to Firestore
      await setDoc(doc(db, 'event_reviews', reviewId), reviewData);
      console.log('✅ Review created successfully:', reviewId);
      
      return reviewId;
    } catch (error) {
      console.error('❌ Error creating review:', error);
      throw error;
    }
  }

  // Get all reviews for an event
  static async getEventReviews(eventId: string): Promise<ReviewData[]> {
    try {
      const reviewsRef = collection(db, 'event_reviews');
      const q = query(
        reviewsRef, 
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReviewData[];
    } catch (error) {
      console.error('❌ Error fetching event reviews:', error);
      return [];
    }
  }

  // Check if user has already reviewed an event
  static async getUserReviewForEvent(userId: string, eventId: string): Promise<ReviewData | null> {
    try {
      const reviewsRef = collection(db, 'event_reviews');
      const q = query(
        reviewsRef,
        where('userId', '==', userId),
        where('eventId', '==', eventId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as ReviewData;
    } catch (error) {
      console.error('❌ Error checking user review:', error);
      return null;
    }
  }

  // Update an existing review
  static async updateReview(
    reviewId: string,
    userId: string,
    rating: number,
    comment: string
  ): Promise<void> {
    try {
      // Get the review to verify ownership
      const reviewRef = doc(db, 'event_reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        throw new Error('Review not found');
      }
      
      const reviewData = reviewDoc.data();
      
      // Verify ownership
      if (reviewData.userId !== userId) {
        throw new Error('You can only update your own reviews');
      }
      
      // Update the review
      await setDoc(reviewRef, {
        rating: Math.min(Math.max(rating, 1), 5), // Ensure rating is between 1-5
        comment: comment.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Review updated successfully:', reviewId);
    } catch (error) {
      console.error('❌ Error updating review:', error);
      throw error;
    }
  }

  // Delete a review
  static async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      // Get the review to verify ownership
      const reviewRef = doc(db, 'event_reviews', reviewId);
      const reviewDoc = await getDoc(reviewRef);
      
      if (!reviewDoc.exists()) {
        throw new Error('Review not found');
      }
      
      const reviewData = reviewDoc.data();
      
      // Verify ownership
      if (reviewData.userId !== userId) {
        throw new Error('You can only delete your own reviews');
      }
      
      // Delete the review
      await deleteDoc(reviewRef);
      console.log('✅ Review deleted successfully:', reviewId);
    } catch (error) {
      console.error('❌ Error deleting review:', error);
      throw error;
    }
  }

  // Format position for display
  static formatPosition(position: string): string {
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
}