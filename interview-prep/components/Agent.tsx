"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createFeedback } from "@/lib/actions/general.action";
import { cn } from "@/lib/utils";

enum Phase {
  SETUP = "SETUP",
  GENERATING = "GENERATING",
  FINISHED = "FINISHED",
}

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SetupAnswers {
  role: string;
  level: string;
  techstack: string;
  type: string;
  amount: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  interviewId?: string;
  feedbackId?: string;
}

const setupKeys: (keyof SetupAnswers | null)[] = [
  null,        // "Hello! Are you ready to begin?" - no data to save
  "type",      // "What type of interview..." 
  "role",      // "Which role or position..."
  "techstack", // "What technologies or tech stack..."
  "level",     // "What is the job experience level..."
  "amount",    // "How many practice questions..."
];

export default function Agent({
  userName,
  userId,
  interviewId,
  feedbackId,
}: AgentProps) {
  const router = useRouter();

  const setupQuestions = [
    `Hello ${userName}! Let's get you ready for your interview preparation. Are you ready to begin?`,
    `What type of interview would you like to prepare for — technical, behavioural, or a mix of both?`,
    `Which role or position are you applying for?`,
    `What technologies or tech stack will you be working with in this role?`,
    `What is the job experience level you are targeting — entry-level, mid-level, or senior?`,
    `How many practice questions would you like me to prepare for you?`
  ];

  const [phase, setPhase] = useState<Phase>(Phase.SETUP);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [setupAnswers, setSetupAnswers] = useState<SetupAnswers>({
    role: "",
    level: "",
    techstack: "",
    type: "",
    amount: "",
  });
  const [currentSetupIndex, setCurrentSetupIndex] = useState(0);
  const [transcript, setTranscript] = useState<{ role: 'ai' | 'user'; content: string; timestamp: number }[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [noResponseTimeout, setNoResponseTimeout] = useState<NodeJS.Timeout | null>(null);

  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("SpeechRecognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      console.log("Recognition started");
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      
      if (!result.isFinal) return;

      console.log("Transcript received:", transcript);
      
      if (!transcript || isProcessingRef.current) return;
      
      isProcessingRef.current = true;
      handleSpeechResult(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
      isProcessingRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearNoResponseTimer();
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || isListening || isSpeaking) return;
    try {
      console.log("Starting recognition...");
      recognitionRef.current.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    try {
      console.log("Stopping recognition...");
      recognitionRef.current.stop();
    } catch (error) {
      console.error("Error stopping recognition:", error);
    }
  };

  const speakQuestion = (text: string, isReAsk: boolean = false) => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    stopListening();
    clearNoResponseTimer();
    setIsSpeaking(true);

    // Add AI message to transcript only if it's not a re-ask
    if (!isReAsk) {
      setTranscript((prev) => [...prev, { 
        role: 'ai', 
        content: text, 
        timestamp: Date.now() 
      }]);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
      startNoResponseTimer();
    };

    speechSynthesis.speak(utterance);
  };

  const clearNoResponseTimer = () => {
    if (noResponseTimeout) {
      clearTimeout(noResponseTimeout);
      setNoResponseTimeout(null);
    }
  };

  const startNoResponseTimer = () => {
    clearNoResponseTimer();
    const timeout = setTimeout(() => {
      if (isListening && !isProcessingRef.current) {
        console.log("No response detected, re-asking question");
        stopListening();
        
        let currentQuestion = "";
        if (phase === Phase.SETUP && currentSetupIndex < setupQuestions.length) {
          currentQuestion = setupQuestions[currentSetupIndex];
        }
        
        if (currentQuestion) {
          setTimeout(() => {
            speakQuestion("I didn't hear your response. Let me ask again: " + currentQuestion, true);
          }, 500);
        }
      }
    }, 10000);
    
    setNoResponseTimeout(timeout);
  };

  const handleSpeechResult = (answer: string) => {
    console.log("Processing answer:", answer);
    stopListening();
    clearNoResponseTimer();
    
    // Add user message to transcript
    setTranscript((prev) => [...prev, { 
      role: 'user', 
      content: answer, 
      timestamp: Date.now() 
    }]);
    
    if (phase === Phase.SETUP) {
      handleSetupAnswer(answer);
    }
  };

  const handleSetupAnswer = (answer: string) => {
    console.log(`Current index: ${currentSetupIndex}, Answer: "${answer}"`);

    // Save answer for current question
    const key = setupKeys[currentSetupIndex];
    console.log(`Key for index ${currentSetupIndex}:`, key);
    
    if (key) {
      setSetupAnswers((prev) => {
        const updated = { ...prev, [key]: answer };
        console.log(`Updated setupAnswers:`, updated);
        return updated;
      });
    }

    setCurrentSetupIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
    isProcessingRef.current = false;

    if (nextIndex < setupQuestions.length) {
      setTimeout(() => {
        speakQuestion(setupQuestions[nextIndex]);
      }, 500);
    } else {
      // Setup completed, now generate interview
      // Use a ref to get the most up-to-date state
      setTimeout(() => {
        setSetupAnswers((currentAnswers) => {
          console.log("Final setupAnswers before API call:", currentAnswers);
          console.log("UserID before API call:", userId);
          generateAndSaveInterview(currentAnswers);
          return currentAnswers;
        });
      }, 500);
    }

      return nextIndex;
    });
  };

  const generateAndSaveInterview = async (finalAnswers?: SetupAnswers) => {
    setPhase(Phase.GENERATING);
    clearNoResponseTimer();
    stopListening();
    
    // Use finalAnswers if provided, otherwise use current state
    const answersToUse = finalAnswers || setupAnswers;
    
    try {
      // Speak generating message
      speakQuestion("Thank you! I'm now generating your interview questions. Please wait a moment while I prepare everything for you.", true);
      
      console.log("Generating interview with data:", answersToUse);
      console.log("UserId:", userId);
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answersToUse,
          userid: userId
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        // Interview saved successfully
        setTimeout(() => {
          speakQuestion("Perfect! Your interview questions have been generated and saved. You'll now be redirected to the home page where you can start your actual interview.", true);
          
          setTimeout(() => {
            finishSetup();
          }, 3000);
        }, 2000);
      } else {
        console.error("Failed to generate interview:", data.error);
        speakQuestion("I'm sorry, there was an error generating your interview questions. Please try again.", true);
        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    } catch (error) {
      console.error("Error generating interview:", error);
      speakQuestion("I'm sorry, there was an error generating your interview questions. Please try again.", true);
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
  };

  const finishSetup = () => {
    setPhase(Phase.FINISHED);
    setCallStatus(CallStatus.FINISHED);
    stopListening();
    clearNoResponseTimer();
    
    // Redirect to home page
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  const handleCall = () => {
    setCallStatus(CallStatus.CONNECTING);
    setTimeout(() => {
      setCallStatus(CallStatus.ACTIVE);
      startInterview();
    }, 1000);
  };

  const handleDisconnect = () => {
    stopListening();
    clearNoResponseTimer();
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setCallStatus(CallStatus.FINISHED);
    setPhase(Phase.FINISHED);
    
    // Redirect to home
    setTimeout(() => {
      router.push("/");
    }, 1000);
  };

  const startInterview = () => {
    setPhase(Phase.SETUP);
    setCurrentSetupIndex(0);
    isProcessingRef.current = false;
    speakQuestion(setupQuestions[0]);
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {transcript.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <div className="max-h-40 overflow-y-auto space-y-2">
              {transcript.slice(-4).map((message, index) => (
                <p
                  key={`${message.timestamp}-${index}`}
                  className={cn(
                    "transition-opacity duration-500 opacity-0 animate-fadeIn opacity-100 text-sm",
                    message.role === 'ai' ? "text-blue-600 font-medium" : "text-gray-800"
                  )}
                >
                  <span className="font-semibold">
                    {message.role === 'ai' ? 'AI: ' : 'You: '}
                  </span>
                  {message.content}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== CallStatus.CONNECTING && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>

      {phase === Phase.GENERATING && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Generating your interview questions...</p>
            <p className="text-sm text-gray-600 mt-2">Please wait while we prepare everything for you.</p>
          </div>
        </div>
      )}
    </>
  );
}