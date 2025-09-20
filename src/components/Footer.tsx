import React from 'react';
import { Mail, Linkedin, Instagram, Music, Headphones, Youtube, Send } from 'lucide-react';
import logoSvg from '../assets/W&G Logo.svg';
import tiktokSvg from '../assets/tiktok-svgrepo-com.svg';

const Footer = () => {
  const SpotifyIcon = () => (
    <svg viewBox="-0.5 -0.5 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
      <path d="M4.0813749999999995 9.551187500000001s3.0767499999999997 -0.6837500000000001 6.153499999999999 0.6836875" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
      <path d="M3.7395625 7.5s4.1023125 -1.0255625 7.520875 1.0255625" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
      <path d="M3.3976875 5.448874999999999c2.051125 -0.34187500000000004 5.4697499999999994 -0.6837500000000001 8.888375 1.367375" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
      <path d="M7.5 14.337187499999999C3.7239375000000003 14.337187499999999 0.6628125 11.276062499999998 0.6628125 7.5 0.6628125 3.7239375000000003 3.7239375000000003 0.6628125 7.5 0.6628125c3.7760624999999997 0 6.837187500000001 3.061125 6.837187500000001 6.837187500000001 0 3.7760624999999997 -3.061125 6.837187500000001 -6.837187500000001 6.837187500000001Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
    </svg>
  );

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <img 
              src={logoSvg}
              alt="Wine & Grind Logo" 
              className="h-16 w-auto filter brightness-0 invert"
            />
          </div>
          
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Where bold ideas meet real conversations. Join our exclusive community 
            of founders, investors, and operators shaping the future. Pop us a message anytime!
          </p>
          
          <div className="flex justify-center space-x-6 mb-8">
            <a
              href="https://www.linkedin.com/company/wineandgrind"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-6 w-6" />
            </a>
            <a
              href="https://www.instagram.com/wineandgrind_il/"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Instagram"
            >
              <Instagram className="h-6 w-6" />
            </a>
            <a
              href="https://www.tiktok.com/@wineandgrind?_t=ZS-8xHus8e2lgw&_r=1"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="TikTok"
            >
              <img src={tiktokSvg} alt="TikTok" className="h-6 w-6 filter invert opacity-80 hover:opacity-100 transition-opacity duration-200" />
            </a>
            <a
              href="https://open.spotify.com/show/58it1QXaM37CjyOPaUpBJq?si=a344124d49404d1f"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Spotify"
            >
              <SpotifyIcon />
            </a>
            <a
              href="https://podcasts.apple.com/us/podcast/wine-grind/id1774035442"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Apple Podcasts"
            >
              <Headphones className="h-6 w-6" />
            </a>
            <a
              href="https://www.youtube.com/@WineNGrind"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="YouTube"
            >
              <Youtube className="h-6 w-6" />
            </a>
            <a
              href="https://t.me/winengrind"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Telegram"
            >
              <Send className="h-6 w-6" />
            </a>
            <a
              href="mailto:info@wineandgrind.com"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Email"
            >
              <Mail className="h-6 w-6" />
            </a>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-gray-500 text-sm">
            <p>&copy; 2025 Wine & Grind. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;