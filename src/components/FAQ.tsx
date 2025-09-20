import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What is Wine & Grind?",
      answer: "Wine & Grind is an exclusive, invite-only event series that brings together founders, investors, and operators for meaningful conversations about the future of business and technology. We combine professional networking with a relaxed, intimate atmosphere where real connections are made."
    },
    {
      question: "Who attends Wine & Grind events?",
      answer: "Our community consists of carefully vetted CEOs, founders, C-level executives, investors, and high-level operators from the tech and business world. We maintain a high bar for attendees to ensure quality conversations and valuable connections."
    },
    {
      question: "Can I present or speak at Wine & Grind?",
      answer: "Absolutely! We're always looking for exceptional speakers who can share valuable insights with our community. Wine & Grind is designed for genuine relationship building and strategic conversations, and we welcome presentations that focus on actionable insights rather than product pitches. If you're interested in speaking, simply let our AI assistant know during registration, or contact us directly at info@winengrind.com. We'll review your background and presentation topic to ensure it aligns with our community's interests and adds real value to the conversation."
    },
    {
      question: "Is Wine & Grind truly invite-only?",
      answer: "Yes, absolutely. We carefully curate our guest list to maintain the quality and intimacy that makes our events special. Applications are reviewed by our team, and invitations are extended based on professional background, potential contribution to discussions, and alignment with our community values."
    },
    {
      question: "Do I need to be in tech to attend?",
      answer: "While many of our attendees are from the tech industry, we welcome leaders from various sectors who are innovating and shaping the future of business. We value diverse perspectives and believe cross-industry connections often lead to the most interesting opportunities."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 slide-up">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-gray-600 slide-up-delay">
            Everything you need to know about Wine & Grind
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <button
                className="w-full px-8 py-6 text-left flex items-center justify-between focus:outline-none"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="h-6 w-6 text-red-700 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-8 pb-6">
                  <p className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Information */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Have More Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              We're here to help! Reach out to us directly for any inquiries about events, speaking opportunities, or partnerships.
            </p>
            <a 
              href="mailto:info@winengrind.com"
              className="inline-flex items-center justify-center bg-gradient-to-r from-red-700 to-blue-600 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300 font-semibold"
            >
              Contact Us: info@winengrind.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;