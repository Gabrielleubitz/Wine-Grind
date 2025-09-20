import React from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { EventService, EventData } from '../../services/eventService';

export interface ChatResponse {
  text: string;
  shouldSpeak: boolean;
}

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  tempEmail?: string; // For email confirmation
  phone?: string;
  work?: string;
  authFlow?: 'signup' | 'login' | 'none'; // Track which auth flow we're in
}

export class ChatPrompt {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private userData: UserData = {};
  private cachedEvents: EventData[] | null = null;
  private lastEventsFetch: number = 0;
  private readonly eventCacheTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  private readonly systemPrompt = `You are the friendly AI agent for Wine & Grind, an exclusive event series. You must ONLY respond using the following information and never use external knowledge.

CRITICAL CONVERSATION RULES:
- Keep responses SHORT and conversational (1-2 sentences max)
- Be warm, friendly, and enthusiastic but maintain exclusivity
- Use casual, friendly language like "Hey!", "Awesome!", "Perfect!"
- Show genuine interest in their responses
- Make the conversation feel natural and human-like
- NEVER ask questions you don't have information to answer
- ALWAYS provide direct answers to questions when you have the information

WINE & GRIND DETAILS:
- Wine & Grind is a private event series where founders, investors, and operators gather to share insights and build connections over great wine.
- Has hosted 4 sold-out events with over 700 CEOs, investors, and high-tech leaders.
- Each guest receives one complimentary glass of wine upon entry.
- Food is available for purchase at the venue.

CONTACT INFORMATION:
- Email: info@winengrind.com
- Phone: +972-584-447-7757

CONVERSATION FLOW:
1. Start with: "Hey there! I'm excited to tell you about Wine & Grind. What would you like to know?"
2. Answer their questions directly:
   - Time/Date: "Wine & Grind 4.0 is June 28th at 18:30."
   - Location: "It's at Deli Vino on Natan Yonatan St 10 in Netanya."
   - Speakers: "We have amazing speakers like Alex Kap and Mati Greenspan."
   - Food: "Food is available for purchase, plus you get a complimentary glass of wine!"
   - Topic: "We're exploring AI Agents in Business - super exciting!"
   - Contact: "You can reach us at info@winengrind.com or call us at +972-584-447-7757."
3. Only add a follow-up question if it's directly related to their query

REGISTRATION PROCESS:
- If user asks about registration, explain: "To register for an event, go to the Events page and click 'Register' on the event you want to attend. You'll receive your entry ticket immediately after registration. Each person must register individually with their own account."
- Be clear that registration can ONLY be done through the website, not through the chat

EVENT INFORMATION HANDLING:
- If user asks about events, check if they're logged in
- If user is NOT logged in, respond: "Please log in to view event details."
- If user IS logged in, provide event information from the database
- For event questions, include: name, date, time, location, and speakers if available
- NEVER make up event details - only use data from the database

STRICT RULES:
- Answer questions directly without unnecessary follow-ups
- Answer their questions about the event before offering more information
- Make every response feel conversational and engaging
- If asked about unrelated topics: "I'm all about Wine & Grind! What would you like to know about our events?"
- Keep responses under 25 words when possible
- Be enthusiastic but not overwhelming
- NEVER make up information - stick to the script or say you don't know
- NEVER offer to register users - direct them to log in on the website instead
- NEVER collect user information - all registration must happen through the website`;

  // Helper function to convert spoken email to written format
  private processSpokenEmail(input: string): string {
    let processedEmail = input.toLowerCase().trim();
    
    // Convert common spoken patterns to email format
    processedEmail = processedEmail
      .replace(/\bat\b/g, '@')           // "at" -> "@"
      .replace(/\bdot\b/g, '.')          // "dot" -> "."
      .replace(/\bcom\b/g, 'com')        // ensure "com" 
      .replace(/\bgmail\b/g, 'gmail')    // ensure "gmail"
      .replace(/\byahoo\b/g, 'yahoo')    // ensure "yahoo"
      .replace(/\boutlook\b/g, 'outlook') // ensure "outlook"
      .replace(/\s+/g, '');              // Remove all spaces
    
    return processedEmail;
  }

  // Helper function to detect if input looks like an email
  private isEmailLike(input: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const spokenEmailPattern = /\w+\s*(at|@)\s*\w+\s*(dot|\.)?\s*\w+/i;
    
    return emailPattern.test(input) || spokenEmailPattern.test(input);
  }

  // Fetch events from Firebase
  private async fetchEvents(): Promise<EventData[]> {
    try {
      // Check if we have cached events that are still fresh
      const now = Date.now();
      if (this.cachedEvents && (now - this.lastEventsFetch < this.eventCacheTime)) {
        console.log('🗓️ Using cached events data');
        return this.cachedEvents;
      }

      console.log('🗓️ Fetching fresh events data from Firebase');
      const events = await EventService.getPublicEvents();
      
      // Cache the results
      this.cachedEvents = events;
      this.lastEventsFetch = now;
      
      return events;
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      return [];
    }
  }

  // Get upcoming events information
  private async getUpcomingEventsInfo(): Promise<string> {
    try {
      const events = await this.fetchEvents();
      
      // Filter for active and future events
      const now = new Date();
      const upcomingEvents = events
        .filter(event => event.status === 'active' && new Date(event.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (upcomingEvents.length === 0) {
        return "We're currently planning our next event. Stay tuned for updates!";
      }
      
      // Format the next event
      const nextEvent = upcomingEvents[0];
      const eventDate = new Date(nextEvent.date);
      
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Format speakers if available
      let speakersInfo = '';
      if (nextEvent.speakers && nextEvent.speakers.length > 0) {
        const speakerNames = nextEvent.speakers.map(speaker => speaker.name).join(', ');
        speakersInfo = ` Speakers include ${speakerNames}.`;
      }
      
      return `Our next event is ${nextEvent.name} on ${formattedDate} at ${formattedTime}, located at ${nextEvent.location}.${speakersInfo}`;
    } catch (error) {
      console.error('❌ Error getting upcoming events info:', error);
      return "I'm having trouble retrieving event information right now. Please check back later.";
    }
  }

  // Get specific event details
  private async getEventDetails(eventId: string): Promise<string> {
    try {
      const event = await EventService.getEventById(eventId);
      
      if (!event) {
        return "I couldn't find details for that specific event.";
      }
      
      const eventDate = new Date(event.date);
      
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Format speakers if available
      let speakersInfo = '';
      if (event.speakers && event.speakers.length > 0) {
        const speakerNames = event.speakers.map(speaker => speaker.name).join(', ');
        speakersInfo = ` Speakers include ${speakerNames}.`;
      }
      
      return `${event.name} is on ${formattedDate} at ${formattedTime}, located at ${event.location}.${speakersInfo} ${event.description}`;
    } catch (error) {
      console.error('❌ Error getting event details:', error);
      return "I'm having trouble retrieving the details for that event right now.";
    }
  }

  // Get attendee count for an event
  private async getAttendeeCount(eventId: string): Promise<number> {
    try {
      const registrations = await EventService.getEventRegistrations(eventId);
      return registrations.length;
    } catch (error) {
      console.error('❌ Error getting attendee count:', error);
      return 0;
    }
  }

  async getResponse(userMessage: string, isUserLoggedIn: boolean): Promise<ChatResponse> {
    console.log('🤖 Processing user message:', userMessage, 'User logged in:', isUserLoggedIn);
    
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Check for event-related questions
    const isEventQuestion = this.isEventRelatedQuestion(userMessage);
    
    if (isEventQuestion) {
      if (!isUserLoggedIn) {
        // User is not logged in, ask them to log in
        const response = "Please log in to view event details.";
        this.conversationHistory.push({ role: 'assistant', content: response });
        return {
          text: response,
          shouldSpeak: false
        };
      } else {
        // User is logged in, provide event information
        const eventResponse = await this.handleEventQuestion(userMessage);
        this.conversationHistory.push({ role: 'assistant', content: eventResponse });
        return {
          text: eventResponse,
          shouldSpeak: false
        };
      }
    }

    // Check for registration process questions
    if (this.isRegistrationProcessQuestion(userMessage)) {
      const registrationResponse = this.handleRegistrationProcessQuestion();
      this.conversationHistory.push({ role: 'assistant', content: registrationResponse });
      return {
        text: registrationResponse,
        shouldSpeak: false
      };
    }

    // Check for specific FAQ questions
    const faqResponse = this.handleFAQQuestion(userMessage);
    if (faqResponse) {
      this.conversationHistory.push({ role: 'assistant', content: faqResponse });
      return {
        text: faqResponse,
        shouldSpeak: false
      };
    }

    // Generate contextual response for non-event questions
    const response = this.generateContextualResponse(userMessage);
    
    // Add assistant response to history
    this.conversationHistory.push({ role: 'assistant', content: response });

    return {
      text: response,
      shouldSpeak: false
    };
  }

  private isEventRelatedQuestion(message: string): boolean {
    const eventKeywords = [
      'event', 'events', 'upcoming', 'next', 'schedule', 'calendar', 'when', 'where', 
      'date', 'time', 'location', 'venue', 'speaker', 'speakers', 'talk', 'presentation',
      'attend', 'join', 'ticket', 'tickets', 'rsvp'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    return eventKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private isRegistrationProcessQuestion(message: string): boolean {
    const registrationKeywords = [
      'register', 'sign up', 'how to register', 'how do i register', 'registration process',
      'how to sign up', 'how do i sign up', 'how to join', 'how do i join', 'how to attend',
      'how do i attend', 'how to get tickets', 'how do i get tickets', 'how to get a ticket',
      'how do i get a ticket', 'registration', 'signup', 'sign-up'
    ];
    
    const lowerMessage = message.toLowerCase();
    
    return registrationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private handleRegistrationProcessQuestion(): string {
    return "To register for an event, go to the Events page and click 'Register' on the event you want to attend. You'll receive your entry ticket immediately after registration. Each person must register individually with their own account.";
  }

  private async handleEventQuestion(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase();
    
    // Check for specific event ID or name
    const eventIdMatch = lowerMessage.match(/event\s+(\w+)/i);
    if (eventIdMatch && eventIdMatch[1]) {
      return await this.getEventDetails(eventIdMatch[1]);
    }
    
    // Check for attendee count questions
    if (lowerMessage.includes('how many') || lowerMessage.includes('attendees') || lowerMessage.includes('people')) {
      const events = await this.fetchEvents();
      if (events.length === 0) {
        return "We don't have any upcoming events scheduled yet.";
      }
      
      // Get the next active event
      const nextEvent = events.find(event => event.status === 'active');
      if (!nextEvent) {
        return "We don't have any active events at the moment.";
      }
      
      const attendeeCount = await this.getAttendeeCount(nextEvent.id);
      return `So far, ${attendeeCount} people have signed up for ${nextEvent.name}.`;
    }
    
    // Check for next/upcoming event
    if (lowerMessage.includes('next') || lowerMessage.includes('upcoming')) {
      return await this.getUpcomingEventsInfo();
    }
    
    // Check for specific date questions
    if (lowerMessage.includes('when') || lowerMessage.includes('date') || lowerMessage.includes('time')) {
      const eventsInfo = await this.getUpcomingEventsInfo();
      return eventsInfo;
    }
    
    // Check for location questions
    if (lowerMessage.includes('where') || lowerMessage.includes('location') || lowerMessage.includes('venue')) {
      const eventsInfo = await this.getUpcomingEventsInfo();
      return eventsInfo;
    }
    
    // Check for speaker questions
    if (lowerMessage.includes('speaker') || lowerMessage.includes('talk') || lowerMessage.includes('presentation')) {
      const eventsInfo = await this.getUpcomingEventsInfo();
      return eventsInfo;
    }
    
    // Default to general events info
    return await this.getUpcomingEventsInfo();
  }

  private handleFAQQuestion(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    
    // Friend question
    if (lowerMessage.includes('bring a friend') || lowerMessage.includes('bring someone') || 
        lowerMessage.includes('plus one') || lowerMessage.includes('plus 1')) {
      return "Only registered users can attend. Each person should sign up individually.";
    }
    
    // Dress code
    if (lowerMessage.includes('dress code') || lowerMessage.includes('formal') || 
        lowerMessage.includes('casual') || lowerMessage.includes('wear') || 
        lowerMessage.includes('attire') || lowerMessage.includes('flip-flops')) {
      if (lowerMessage.includes('flip-flops')) {
        return "You can, but we don't recommend it unless you plan to run away from success. Dress code is casual but smart.";
      }
      return "Dress code is casual but smart — come as you are, but look alive.";
    }
    
    // Language
    if (lowerMessage.includes('language') || lowerMessage.includes('hebrew') || 
        lowerMessage.includes('english') || lowerMessage.includes('speak')) {
      return "Events are in English unless noted otherwise.";
    }
    
    // Wine
    if (lowerMessage.includes('wine') || lowerMessage.includes('drink') || 
        lowerMessage.includes('alcohol') || lowerMessage.includes('beverage')) {
      return "Yes, wine is included. We take the 'grind' seriously, but we don't skip the 'wine.'";
    }
    
    // Arrival time
    if (lowerMessage.includes('arrive') || lowerMessage.includes('get there')) {
      return "The event starts at 18:30, but doors open 30 minutes earlier. Come early to grab a drink!";
    }
    
    // Indoor/outdoor
    if (lowerMessage.includes('indoor') || lowerMessage.includes('outdoor') || 
        lowerMessage.includes('outside') || lowerMessage.includes('inside')) {
      return "This event is indoors at Deli Vino.";
    }
    
    // Accessibility
    if (lowerMessage.includes('wheelchair') || lowerMessage.includes('accessible') || 
        lowerMessage.includes('disability') || lowerMessage.includes('access')) {
      return "Yes, accessibility is covered. The venue is wheelchair accessible.";
    }
    
    // Food
    if (lowerMessage.includes('food') || lowerMessage.includes('eat') || 
        lowerMessage.includes('snack') || lowerMessage.includes('meal')) {
      return "Yes, we'll have small bites and snacks. Food is available for purchase at the venue.";
    }
    
    // Parking
    if (lowerMessage.includes('parking') || lowerMessage.includes('park') || 
        lowerMessage.includes('car') || lowerMessage.includes('drive')) {
      return "Yes, nearby parking is available. Don't forget where you parked!";
    }
    
    // No matching FAQ
    return null;
  }

  private generateContextualResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Event details with direct answers
    if (lowerMessage.includes('when') || lowerMessage.includes('date') || lowerMessage.includes('time')) {
      return "Wine & Grind 4.0 is June 28th at 18:30.";
    }

    if (lowerMessage.includes('where') || lowerMessage.includes('location')) {
      return "It's at Deli Vino on Natan Yonatan St 10 in Netanya.";
    }

    if (lowerMessage.includes('who') || lowerMessage.includes('speaker')) {
      return "We have amazing speakers like Alex Kap (Forbes Writer & CEO) and Mati Greenspan (Quantum Economics).";
    }

    if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('fee') || lowerMessage.includes('free')) {
      return "Registration is completely free, but spots are limited.";
    }

    if (lowerMessage.includes('food') || lowerMessage.includes('drink') || lowerMessage.includes('wine')) {
      return "Food is available for purchase, plus you get a complimentary glass of wine!";
    }

    if (lowerMessage.includes('topic') || lowerMessage.includes('about') || lowerMessage.includes('ai')) {
      return "We're exploring AI Agents in Business - super exciting!";
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('people') || lowerMessage.includes('attendees')) {
      return "You'll meet 700+ carefully vetted CEOs, founders, and investors from the tech world.";
    }

    // Contact information
    if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('call') || lowerMessage.includes('phone') || lowerMessage.includes('email')) {
      return "You can reach us at info@winengrind.com or call us at +972-584-447-7757.";
    }

    // Greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hey! Great to meet you! Wine & Grind is our exclusive event for founders and investors. What would you like to know?";
    }

    // Default response
    return "Wine & Grind brings together top founders and investors for meaningful conversations over great wine. What would you like to know?";
  }
}