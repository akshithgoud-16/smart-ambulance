import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/help.css";

function Help() {
  const chatWindowRef = useRef(null);
  const quickQuestions = useMemo(
    () => [
      "How do I book an ambulance?",
      "How do I track my ambulance?",
      "How do drivers or police log in?",
      "How do I contact support?",
    ],
    []
  );

  const cannedReplies = useMemo(
    () => [
      {
        keywords: ["book", "booking", "ambulance"],
        response:
          "Go to Book Ambulance from the navbar, share pickup and drop location, confirm details, and submit. You can see the live status under My Bookings.",
      },
      {
        keywords: ["track", "status", "live"],
        response:
          "Open My Bookings to see your active request, live driver location (when assigned), and status updates.",
      },
      {
        keywords: ["driver", "police", "dashboard"],
        response:
          "Drivers and police personnel should sign in from the Auth page with their credentials, then use their respective dashboards to view assigned cases and update progress.",
      },
      {
        keywords: ["support", "contact", "help", "issue"],
        response:
          "For urgent help call local emergency services. For app issues, use the contact form on Contact Us or email support@smart-ambulance.local.",
      },
    ],
    []
  );

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi there! I can help with booking, tracking, and account questions. Ask me anything.",
    },
  ]);

  useEffect(() => {
    if (!chatWindowRef.current) return;
    chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
  }, [messages]);

  const findReply = (text) => {
    const lower = text.toLowerCase();
    const match = cannedReplies.find((entry) =>
      entry.keywords.some((keyword) => lower.includes(keyword))
    );

    if (match) return match.response;

    return "I could not match that to our help topics. Try asking about booking, tracking, or support, or reach out via Contact Us.";
  };

  const sendMessage = (content) => {
    if (!content.trim()) return;

    const userText = content.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInput("");

    const reply = findReply(userText);
    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
    }, 350);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="help-page">
      <section className="help-hero">
        <div>
          <p className="eyebrow">Support</p>
          <h1>Need a hand?</h1>
          <p className="subhead">
            Ask our assistant or browse the quick tips below to get answers
            faster.
          </p>
        </div>
        <div className="hero-card">
          <h3>Popular guidance</h3>
          <ul>
            <li>Booking an ambulance with live tracking</li>
            <li>Keeping your contact and location details accurate</li>
            <li>Using driver and police dashboards to update status</li>
          </ul>
        </div>
      </section>

      <section className="help-grid">
        <div className="info-card">
          <h2>Quick tips</h2>
          <ul>
            <li>
              Make sure location services are enabled so drivers can reach you
              faster.
            </li>
            <li>
              Save common addresses for quicker bookings from the Book
              Ambulance page.
            </li>
            <li>
              Check My Bookings to confirm driver ETA and vehicle details.
            </li>
            <li>
              For emergencies, always dial local emergency services first.
            </li>
          </ul>
        </div>

        <div className="chat-card">
          <div className="chat-header">
            <div>
              <p className="eyebrow">Chatbot</p>
              <h3>Ask a question</h3>
              <p className="subhead">Instant answers to common questions.</p>
            </div>
          </div>

          <div className="quick-actions">
            {quickQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => sendMessage(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <div className="chat-window" ref={chatWindowRef}>
            {messages.map((message, index) => (
              <div
                key={`${message.sender}-${index}`}
                className={`chat-bubble ${message.sender}`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask about booking, tracking, or support..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              aria-label="Ask a question"
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default Help;
