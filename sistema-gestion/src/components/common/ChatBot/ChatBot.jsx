import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaPaperPlane, FaTimes, FaCommentDots } from 'react-icons/fa';
import './ChatBot.css';

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '¡Buenos días!';
  if (hour >= 12 && hour < 20) return '¡Buenas tardes!';
  return '¡Buenas noches!';
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: `${getTimeBasedGreeting()} Soy Palma, ¿en qué te puedo ayudar hoy?`, sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const faqs = {
    'hola': '¡Hola! ¿En qué puedo ayudarte hoy?',
    'como estas': '¡Muy bien! Gracias por preguntar. Estoy acá para ayudarte con cualquier duda sobre el sistema.',
    'los de soporte no responden': 'El equipo de soporte puede estar ocupado atendiendo otros tickets. Por favor, espere a que se libere un técnico para que pueda ayudarle con su problema.',
    '¿cómo creo un ticket?': 'Para crear un ticket: 1) Hacé clic en "CREAR TICKET", 2) Completá el asunto y descripción detallada del problema, 3) Seleccioná la prioridad (Baja, Media, Alta, Crítica), 5) Enviá el ticket. Aparecerá en tu historial con estado "Nuevo".',
    '¿cómo veo mis tickets?': 'Podés ver todos tus tickets en la sección "HISTORIAL". Ahí vas a encontrar el estado actual, fecha de creación, prioridad y detalles de cada ticket que hayas creado.',
    '¿cómo sé el estado de mi ticket?': 'En la sección "HISTORIAL" podés ver el estado de tus tickets. Los estados son: • NUEVO: Recién creado, esperando ser tomado • EN PROGRESO: Un técnico está trabajando en él • RESUELTO: Problema solucionado • CERRADO: Ticket finalizado • CANCELADO: Ticket cancelado • PENDIENTE: Pausado temporalmente',
    '¿puedo cancelar un ticket?': 'Sí, podés cancelar un ticket que esté en estado "NUEVO" desde la sección "HISTORIAL". Hacé clic en el botón "Borrar ticket" del ticket correspondiente. Una vez cancelado, el ticket desaparecerá de tu vista.',
    '¿qué prioridades puedo usar?': 'Podés asignar estas prioridades a tus tickets: • BAJA: Problemas menores que no afectan el trabajo • MEDIA: Problemas que pueden esperar pero necesitan atención • ALTA: Problemas que afectan el trabajo normal • CRÍTICA: Problemas urgentes que bloquean completamente el trabajo',
    '¿cómo contacto al soporte?': 'La mejor forma es crear un ticket detallado. También podés ver qué técnicos están conectados en el inicio o hablarlos por la plataforma de Teams.',
    '¿puedo ver quién está trabajando en mi ticket?': 'Sí, en los detalles del ticket podés ver qué técnico lo tiene asignado y cuándo fue tomado. Esta información aparece cuando hacés clic en "Ver Detalles" en tu historial.',
    'gracias': '¡De nada! ¿Hay algo más en lo que pueda ayudarte? Estoy aquí para resolver cualquier duda sobre el sistema.',
    'chau': '¡Hasta luego! Si tenés más preguntas sobre el sistema de tickets, no dudes en volver a consultarme. ¡Que tengas un buen día!',
    'Quien te creo?': 'Soy Palma, un chatbot creado por Nazareno para ayudarte con tus dudas sobre este sistema.',
    'Para que crearon esto?': '¡Te explico sin problemas! Este sistema fue creado con el fin de optimizar los tiempos del equipo de soporte y tener un control de los problemas que se presentan dentro de la empresa. ',
    'robot de mierda': '¿Tanta frustración manejás para decirme eso?',
    'robot puto': '¿Tanta frustración manejás para decirme eso?',
    'puto': '¿Tanta frustración manejás para decirme eso?',

  };

  const suggestedQuestions = [
    '¿Cómo creo un ticket?',
    '¿Cómo veo mis tickets?',
    '¿Cómo sé el estado de mi ticket?',
    '¿Puedo cancelar un ticket?',
    '¿Qué prioridades puedo usar?',
    '¿Cómo contacto al soporte?',
    '¿Puedo ver quién está trabajando en mi ticket?'
  ];

  const handleQuestionClick = (question) => {
    setInputValue(question);
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    const message = inputValue.trim();
    if (!message) return;

    // Agregar mensaje del usuario
    const userMessage = { text: message, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Procesar la respuesta
    const userInput = message.toLowerCase();
    let botResponse = 'Disculpa, no estoy configurado para responder eso.';
    
    // Buscar coincidencias en las preguntas frecuentes
    for (const [question, answer] of Object.entries(faqs)) {
      if (userInput.includes(question.toLowerCase())) {
        botResponse = answer;
        break;
      }
    }

    // Agregar respuesta del bot con un pequeño retraso
    setTimeout(() => {
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    }, 500);

    setInputValue('');
  };

  const toggleChat = () => setIsOpen(!isOpen);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      {isOpen ? (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <FaRobot className="chatbot-icon" />
              <span>PALMA</span>
            </div>
            <button className="close-btn" onClick={toggleChat}>
              <FaTimes />
            </button>
          </div>
          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <React.Fragment key={index}>
                <div className={`message ${msg.sender}`}>
                  {msg.text}
                </div>
                {msg.sender === 'user' && messages[index + 1]?.sender === 'bot' && (
                  <div className="suggested-questions">
                    {suggestedQuestions.map((question, qIndex) => (
                      <button 
                        key={qIndex}
                        className="suggested-question"
                        onClick={() => handleQuestionClick(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
            {messages.length === 1 && (
              <div className="suggested-questions initial-questions">
                {suggestedQuestions.map((question, index) => (
                  <button 
                    key={index}
                    className="suggested-question"
                    onClick={() => handleQuestionClick(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="chatbot-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              autoFocus
            />
            <button type="submit">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      ) : (
        <button className="chatbot-toggle" onClick={toggleChat}>
          <FaCommentDots className="chat-icon" />
        </button>
      )}
    </div>
  );
};

export default ChatBot;
