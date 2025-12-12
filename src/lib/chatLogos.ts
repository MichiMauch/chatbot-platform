export interface ChatLogo {
  id: string;
  name: string;
  path: string | null;
}

export const chatLogos: ChatLogo[] = [
  { id: "default", name: "Standard (Bot-Icon)", path: null },
  { id: "artificial-intelligence", name: "Artificial Intelligence", path: "/animations/artificial-intelligence.json" },
  { id: "assistance", name: "Assistance", path: "/animations/assistance.json" },
  { id: "bot-assistant", name: "Bot Assistant", path: "/animations/bot-assistant.json" },
  { id: "chat-bot", name: "Chat Bot", path: "/animations/chat-bot.json" },
  { id: "chatbot", name: "Chatbot", path: "/animations/chatbot.json" },
  { id: "chatbot1", name: "Chatbot 1", path: "/animations/chatbot1.json" },
  { id: "chatbot2", name: "Chatbot 2", path: "/animations/chatbot2.json" },
  { id: "robot-talking", name: "Robot Talking", path: "/animations/robot-talking.json" },
  { id: "search", name: "Search", path: "/animations/search.json" },
  { id: "settings", name: "Settings", path: "/animations/settings.json" },
];

export type ChatLogoId = (typeof chatLogos)[number]["id"];
