import React from 'react';
import { Users, Calendar, Trophy } from 'lucide-react';

const About = () => {
  const stats = [
    { icon: Calendar, number: '4', label: 'Events Hosted' },
    { icon: Users, number: '700+', label: 'CEOs & Leaders' },
    { icon: Trophy, number: '100%', label: 'Invite-Only' },
  ];

  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 slide-up">
            What is <span className="gradient-text">Wine & Grind</span>?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed slide-up-delay">
            We've hosted 4 events with over 700 CEOs, investors, and high-tech leaders. 
            Our next one is just around the corner. Wine & Grind is where the future 
            of business and technology takes shape through meaningful connections and 
            bold conversations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className={`text-center slide-up hover-lift bg-gray-50 p-8 rounded-2xl`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-700 to-blue-600 rounded-full mb-4">
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-red-50 to-blue-50 rounded-3xl p-8 md:p-12 slide-up">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              "Wine & Grind isn't just another networking event. It's a carefully curated 
              experience where industry leaders come together to share insights, challenge 
              assumptions, and forge the partnerships that will define tomorrow's business landscape. 
              Every conversation matters, every connection counts."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;