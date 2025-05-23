import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white text-center p-8 mt-16">
      <p className="text-lg">© {new Date().getFullYear()} Perspective Engine</p>
      <p className="text-sm text-gray-400 mt-1">Breaking filter bubbles, one search at a time.</p>
    </footer>
  );
};

export default Footer;