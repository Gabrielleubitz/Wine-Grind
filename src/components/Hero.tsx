import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Hero = () => {
  const { user, isPending } = useAuth();

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 fade-in">
            <div className="mb-4">Wine & Grind</div>
            Where <span className="gradient-text-bold-ideas">Bold Ideas</span> Meet
            <br />
            <span className="gradient-text">Real Conversations</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed fade-in-delay">
            Wine & Grind brings together founders, investors, and operators for curated events 
            where the future is shaped—one conversation (and one glass) at a time.
          </p>
          
          <div className="flex justify-center slide-up">
            {user ? (
              // If user is logged in but pending, don't show events button
              isPending ? (
                <Link
                  to="/pending"
                  className="bg-yellow-600 text-white px-8 py-4 rounded-full hover:bg-yellow-700 transition-all duration-300 font-semibold text-lg flex items-center space-x-2 hover-lift"
                >
                  <span>Check Application Status</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to="/events"
                  className="bg-red-700 text-white px-8 py-4 rounded-full hover:bg-red-800 transition-all duration-300 font-semibold text-lg flex items-center space-x-2 hover-lift"
                >
                  <span>View Events</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              )
            ) : (
              <Link
                to="/signup"
                className="bg-red-700 text-white px-8 py-4 rounded-full hover:bg-red-800 transition-all duration-300 font-semibold text-lg flex items-center space-x-2 hover-lift"
              >
                <span>Join Wine & Grind</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>
        
        <div className="mt-20 slide-up-delay">
          <div className="flex justify-center">
            <div className="w-2 h-16 bg-gradient-to-b from-red-700 to-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;