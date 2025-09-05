import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ScheduleEvent, SmartReminder, ReminderStatus, ContextTag } from '../types';
import WandIcon from './icons/WandIcon';
import XIcon from './icons/XIcon';
import SendIcon from './icons/SendIcon';
import PlusIcon from './icons/PlusIcon';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- TYPE DEFINITIONS ---
type Message = {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    card?: CardData;
    isClarification?: boolean;
    options?: string[];
};

type CardData = {
    type: 'reminder' | 'anchor' | 'pause';
    title: string;
    details: string[];
};

interface AiChatProps {
    scheduleEvents: ScheduleEvent[];
    setScheduleEvents: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
    smartReminders: SmartReminder[];
    setSmartReminders: React.Dispatch<React.SetStateAction<SmartReminder[]>>;
    pauseUntil: string | null;
    setPauseUntil: React.Dispatch<React.SetStateAction<string | null>>;
    addChangeToHistory: (message: string, undoCallback: () => void) => void;
}

// --- HELPER FUNCTIONS ---
const DAYS_OF_WEEK: ScheduleEvent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const formatTimeForToast = (time: string): string => {
    if (!time) return '';
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour}${minuteStr !== '00' ? `:${minuteStr}` : ''}${ampm}`;
};

const formatDaysForToast = (days: ScheduleEvent['day'][]) => {
    if (days.length === 0) return '';
    const dayMap: Record<ScheduleEvent['day'], string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
    const sortedDays = DAYS_OF_WEEK.filter(d => days.includes(d));
    if (sortedDays.join(',') === 'Monday,Tuesday,Wednesday,Thursday,Friday') return 'Weekdays';
    if (sortedDays.join(',') === 'Saturday,Sunday') return 'Weekends';
    return sortedDays.map(d => dayMap[d]).join(', ');
};

const formatOffsetForToast = (offsetMinutes: number) => {
    if (offsetMinutes === 0) return "at the start";
    const minutes = Math.abs(offsetMinutes);
    return `${minutes} min ${offsetMinutes < 0 ? "before" : "after"}`;
};

// --- GEMINI CONFIGURATION ---
const aiSchema = {
    type: Type.OBJECT,
    properties: {
        thought: { type: Type.STRING, description: "Your reasoning for the response." },
        response_type: { type: Type.STRING, enum: ["CLARIFICATION", "ACTION_CONFIRMATION", "GENERAL_RESPONSE"] },
        message: { type: Type.STRING, description: "The message to show to the user." },
        clarification_options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of short, button-friendly options for the user to select from to resolve ambiguity."
        },
        action: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, enum: ["ADD_ANCHOR", "ADD_REMINDER", "PAUSE_NOTIFICATIONS"] },
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        startTime: { type: Type.STRING },
                        endTime: { type: Type.STRING },
                        days: { type: Type.ARRAY, items: { type: Type.STRING } },
                        reminderMessage: { type: Type.STRING },
                        offsetMinutes: { type: Type.NUMBER },
                        anchorTitle: { type: Type.STRING },
                        durationDays: { type: Type.NUMBER }
                    }
                }
            }
        }
    },
    required: ["thought", "response_type", "message"]
};


// --- COMPONENT ---
const AiChat: React.FC<AiChatProps> = (props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { id: 0, role: 'assistant', text: "Hi! How can I help you set up your day?" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleToggleOpen = (openState: boolean) => {
        setIsOpen(openState);
        if (openState) {
            setHasUnread(false);
        }
    }

    const processAction = (action: any) => {
        const { name, parameters } = action;
        let card: CardData | undefined = undefined;

        if (name === 'ADD_ANCHOR' && parameters.days) {
            const originalEvents = [...props.scheduleEvents];
            const newEvents = parameters.days.map((day: ScheduleEvent['day']) => ({
                id: `ai-${Date.now()}-${day}`, day, title: parameters.title,
                startTime: parameters.startTime, endTime: parameters.endTime,
                contextTags: [ContextTag.Personal]
            }));
            props.setScheduleEvents(prev => [...prev, ...newEvents]);
            
            const dayStr = formatDaysForToast(parameters.days);
            const timeStr = `${formatTimeForToast(parameters.startTime)}–${formatTimeForToast(parameters.endTime)}`;
            const message = `Anchor added: "${parameters.title}" on ${dayStr}, ${timeStr}.`;
            props.addChangeToHistory(message, () => props.setScheduleEvents(originalEvents));
            
            card = { type: 'anchor', title: parameters.title, details: [`${formatDaysForToast(parameters.days)}`, `${formatTimeForToast(parameters.startTime)} - ${formatTimeForToast(parameters.endTime)}`] };
        } else if (name === 'ADD_REMINDER') {
            const targetAnchors = props.scheduleEvents.filter(e => e.title === parameters.anchorTitle);
            if (targetAnchors.length > 0) {
                const originalReminders = [...props.smartReminders];
                const newReminders: SmartReminder[] = targetAnchors.map(anchor => ({
                    id: `ai-sr-${anchor.id}-${Date.now()}`, eventId: anchor.id,
                    offsetMinutes: parameters.offsetMinutes, message: parameters.reminderMessage,
                    why: `Set by you via AI assistant.`, isLocked: false, isExploratory: false,
                    status: ReminderStatus.Active, snoozeHistory: [], snoozedUntil: null, successHistory: [], allowExploration: true,
                }));
                props.setSmartReminders(prev => [...prev, ...newReminders]);
                
                const offsetStr = formatOffsetForToast(parameters.offsetMinutes);
                const message = `Reminder set: "${parameters.reminderMessage}" ${offsetStr} "${parameters.anchorTitle}".`;
                props.addChangeToHistory(message, () => props.setSmartReminders(originalReminders));
                
                card = { type: 'reminder', title: parameters.reminderMessage, details: [`${formatOffsetForToast(parameters.offsetMinutes)} "${parameters.anchorTitle}"`] };
            }
        } else if (name === 'PAUSE_NOTIFICATIONS') {
            const originalPause = props.pauseUntil;
            const pauseUntilDate = new Date();
            pauseUntilDate.setDate(pauseUntilDate.getDate() + (parameters.durationDays || 1));
            props.setPauseUntil(pauseUntilDate.toISOString());
            const message = `Reminders paused for ${parameters.durationDays || 1} day(s).`;
            props.addChangeToHistory(message, () => props.setPauseUntil(originalPause));
            card = { type: 'pause', title: message, details: [`Resuming on ${pauseUntilDate.toLocaleDateString()}`] };
        }
        return card;
    };
    
    const sendMessage = async (currentMessages: Message[]) => {
        setIsLoading(true);

        const history = currentMessages.map(m => `${m.role}: ${m.text}`).join('\n');
        const anchors = [...new Set(props.scheduleEvents.map(a => a.title))];

        const prompt = `You are a friendly and supportive executive function assistant. Your tone is always encouraging and never scolding. Use simple, plain language. Your goal is to help the user manage their schedule by creating 'anchors' (like appointments) and 'reminders', or pausing notifications. You must respond with a JSON object matching the provided schema.

- **Be Transparent**: When you make an assumption (e.g., 'Friday' means this coming Friday, '7' means 7 PM), you MUST state it clearly in your confirmation message. For example: "Got it. I've scheduled that for this coming Friday at 7 PM. You can tap to change it if that's not right."
- **Handle Ambiguity Gracefully**: If a request is unclear (e.g., missing AM/PM, multiple anchors with the same name like 'Meeting'), ask for clarification.
    - Set 'response_type' to 'CLARIFICATION'.
    - Ask a simple question in the 'message' field.
    - Provide short, clear options in 'clarification_options' (e.g., ["In the morning", "In the afternoon"], ["The 9 AM meeting", "The 2 PM meeting"]).
- **Confirm Actions Clearly**: If you are confident, perform the action and confirm it.
    - Set 'response_type' to 'ACTION_CONFIRMATION'.
    - Write a friendly confirmation in 'message' that recaps what you did and any assumptions you made.
    - Fill out the 'action' object with all the details.
- **Handle General Chat**: For greetings or chat that isn't a command, use 'GENERAL_RESPONSE' and keep it brief and positive.
- **Rule for Reminders**: The 'anchorTitle' parameter must EXACTLY match one of the available anchor titles. If the user is vague, you must ask for clarification by providing the matching anchor titles as options.

Current Date: ${new Date().toISOString()}
Available Anchors: ${anchors.length > 0 ? anchors.join(', ') : 'No anchors have been set up yet.'}

Conversation History (for context):
${history}
`;

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { responseMimeType: "application/json", responseSchema: aiSchema }
            });

            const result = JSON.parse(response.text.trim());
            let card: CardData | undefined;

            if (result.response_type === "ACTION_CONFIRMATION" && result.action) {
                card = processAction(result.action);
            }

            const newAssistantMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                text: result.message,
                card,
                isClarification: result.response_type === "CLARIFICATION",
                options: result.clarification_options || []
            };

            setMessages(prev => [...prev, newAssistantMessage]);

            if(result.response_type === "CLARIFICATION" && !isOpen) {
                setHasUnread(true);
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            const errorMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                text: "Sorry, I had trouble understanding that. Could you try rephrasing?"
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSendMessage = () => {
        if (!userInput.trim()) return;
        const newUserMessage: Message = { id: Date.now(), role: 'user', text: userInput };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setUserInput('');
        sendMessage(newMessages);
    };

    const handleOptionClick = (option: string) => {
        const newUserMessage: Message = { id: Date.now(), role: 'user', text: option };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        sendMessage(newMessages);
    };

    const renderMessageCard = (card: CardData) => {
        const iconMap = {
            anchor: <PlusIcon className="h-5 w-5 text-green-600" />,
            reminder: <WandIcon className="h-5 w-5 text-blue-600" />,
            pause: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
        };
        const colorMap = {
            anchor: 'bg-green-50 border-green-200',
            reminder: 'bg-blue-50 border-blue-200',
            pause: 'bg-yellow-50 border-yellow-200',
        }

        return (
            <div className={`mt-2 p-3 rounded-lg border ${colorMap[card.type]}`}>
                <div className="flex items-center gap-2">
                    {iconMap[card.type]}
                    <p className="font-semibold text-stone-800 text-sm">{card.title}</p>
                </div>
                <div className="pl-7 mt-1 space-y-0.5">
                    {card.details.map((detail, i) => (
                        <p key={i} className="text-xs text-stone-600">{detail}</p>
                    ))}
                </div>
            </div>
        )
    };
    
    if (!isOpen) {
        return (
            <button
                onClick={() => handleToggleOpen(true)}
                className="fixed bottom-8 right-8 z-50 h-16 w-16 bg-[#C75E4A] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-opacity-90 transition-all transform hover:scale-110"
                aria-label="Open AI Assistant"
            >
                <WandIcon className="h-8 w-8" />
                {hasUnread && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => handleToggleOpen(false)}></div>
            <div className="relative w-full max-w-md bg-[#F8F5F2] shadow-2xl flex flex-col h-full animate-fade-in">
                <header className="p-4 border-b border-stone-200 flex justify-between items-center bg-white/80 backdrop-blur-lg">
                    <h2 className="text-xl font-bold text-stone-800">AI Assistant</h2>
                    <button onClick={() => handleToggleOpen(false)} className="p-1 rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-colors" aria-label="Close chat">
                        <XIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#C75E4A] text-white rounded-br-lg' : 'bg-white text-stone-800 rounded-bl-lg border'}`}>
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                                {msg.card && renderMessageCard(msg.card)}
                                {msg.options && msg.options.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {msg.options.map(option => (
                                            <button 
                                                key={option} 
                                                onClick={() => handleOptionClick(option)}
                                                className="px-3 py-1 text-sm font-semibold text-[#C75E4A] bg-white border border-[#C75E4A] rounded-full hover:bg-stone-50 transition-colors"
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-[85%] p-3 rounded-2xl bg-white text-stone-800 rounded-bl-lg border flex items-center gap-2">
                                <span className="h-2 w-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 bg-stone-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <footer className="p-4 border-t border-stone-200 bg-white/80 backdrop-blur-lg">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Message AI Assistant..."
                            className="flex-1 w-full px-4 py-2 bg-white border border-stone-300 rounded-full focus:ring-2 focus:ring-[#C75E4A] focus:outline-none transition-shadow"
                            disabled={isLoading}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !userInput.trim()} className="h-10 w-10 flex-shrink-0 bg-[#C75E4A] rounded-full text-white flex items-center justify-center disabled:bg-stone-400 transition-colors">
                            <SendIcon className="h-5 w-5" />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AiChat;