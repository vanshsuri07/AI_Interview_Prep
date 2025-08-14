import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, role, level, techstack, amount, userid } = body;

    console.log("Received request body:", body);
    console.log("Generating interview questions with:", { type, role, level, techstack, amount, userid });

    // Validate required fields
    if (!type || !role || !level || !techstack || !amount || !userid) {
      return Response.json({ 
        success: false, 
        error: "Missing required fields",
        received: { type, role, level, techstack, amount, userid }
      }, { status: 400 });
    }

    const { text: questionsResponse } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare ${amount} questions for a job interview.
        The job role is: ${role}
        The job experience level is: ${level}
        The tech stack used in the job is: ${techstack}
        The focus between behavioural and technical questions should lean towards: ${type}
        
        Important instructions:
        - Return ONLY a valid JSON array of strings
        - Each question should be a complete, well-formed interview question
        - Do not use special characters like /, *, #, or any markdown formatting
        - Questions will be read by a voice assistant, so they should sound natural when spoken
        - Mix the question types based on the '${type}' preference
        - Make questions appropriate for the '${level}' experience level
        
        Example format:
        ["What is your experience with React and how have you used it in previous projects", "Tell me about a challenging problem you solved in your last role", "How do you approach debugging complex issues in production"]
        
        Generate exactly ${amount} questions now.`,
    });

    console.log("Generated questions response:", questionsResponse);

    // Parse the questions from the AI response
    let questions;
    try {
      // Clean up the response in case there's extra text
      const cleanedResponse = questionsResponse.trim();
      const jsonMatch = cleanedResponse.match(/\[.*\]/s);
      
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON array found in response");
      }
    } catch (parseError) {
      console.error("Error parsing questions:", parseError);
      console.error("Raw response:", questionsResponse);
      return Response.json({ 
        success: false, 
        error: "Failed to parse generated questions",
        details: parseError 
      }, { status: 500 });
    }

    // Validate questions array
    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json({ 
        success: false, 
        error: "Invalid questions format - expected non-empty array" 
      }, { status: 500 });
    }

    // Create interview document
    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(",").map((tech: string) => tech.trim()),
      questions: questions,
      userId: userid, // Fixed: using userid (lowercase) from the request
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    console.log("Saving interview to Firebase:", interview);

    // Save to Firebase
    const docRef = await db.collection("interviews").add(interview);
    
    console.log("Interview saved successfully with ID:", docRef.id);

    return Response.json({ 
      success: true, 
      interviewId: docRef.id,
      questionsCount: questions.length 
    }, { status: 200 });

  } catch (error) {
    console.error("Error generating interview:", error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Interview API is working!" }, { status: 200 });
}