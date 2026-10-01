import React from 'react';
import { ChatrLandingPage } from './landing/ChatrLandingPage';

/**
 * Public crawlable homepage for CHATR.chat
 * Renders the consumer B2C Super App landing page with full Schema.org markup.
 */
const PublicHome: React.FC = () => {
  return <ChatrLandingPage initialAuthOpen={false} />;
};

export default PublicHome;
