
import { GoogleGenAI, Type } from "@google/genai";
import { BrainDumpItem, Note, MomentumMapData, FinishLine, Chunk, SubStep, EnergyTag } from '../contracts';
import { Result, RefinementSuggestion, ClusterMove, Cluster, ScheduleEvent } from '../types';
import { CompletionRecord } from '../types';
import { Message } from '../components/AiChat';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Processes a raw text "brain dump" into structured items.
 * Originally from App.tsx
 */
export const processBrainDumpText = async (text: string): Promise<Result<BrainDumpItem[]>> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING, description: 'A unique identifier for the item (e.g., timestamp and index).' },
                item: { type: Type.STRING, description: 'The original text of the single, distinct thought or task.' },
                tags: { 
                    type: Type.ARRAY, 
                    description: 'An array of relevant tags or categories (e.g., "Work", "Marketing", "Urgent", "Idea").',
                    items: { type: Type.STRING } 
                },
                isUrgent: { type: Type.BOOLEAN, description: 'True if the item contains language indicating urgency (e.g., "by Thursday", "ASAP").' },
            },
            required: ['id', 'item', 'tags', 'isUrgent'],
        },
    };

    const prompt = `
      Analyze the following text, which is a "brain dump" of thoughts.
      Split the text into individual, distinct items.
      For each item, perform the following actions:
      1.  **Extract Tags**: Assign a list of relevant tags (e.g., "Work", "Personal", "Ideas", "Marketing Campaign", "Q2 Budget"). Combine high-level categories and specific projects into a single list of tags. If the item is urgent, also include an "Urgent" tag.
      2.  **Detect Urgency**: Separately determine if the item is time-sensitive based on keywords (e.g., "by EOD", "tomorrow", "needs to be done"). Set isUrgent to true if so.
      3.  **Generate ID**: Create a unique ID for each item using the current timestamp in milliseconds combined with its index.
      Return the output as a JSON object that strictly follows this schema.

      Input Text:
      "${text}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        const data = Array.isArray(result) ? result : [];
        return { ok: true, data };
    } catch (error) {
        console.error("Error processing with Gemini:", error);
        return { ok: false, error: "Failed to process thoughts. The AI model might be busy. Please try again." };
    }
};

/**
 * Refines brain dump items with notes to add more structured data.
 * Originally from BrainDump.tsx
 */
export const refineBrainDumpItems = async (items: BrainDumpItem[], notes: Record<string, Note>): Promise<Result<RefinementSuggestion[]>> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                itemId: { type: Type.STRING },
                proposedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                proposedUrgency: { type: Type.STRING, enum: ['low', 'normal', 'high'] },
                blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
                timeEstimateMinutesP50: { type: Type.NUMBER },
                timeEstimateMinutesP90: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                rationale: { type: Type.STRING },
                createdAt: { type: Type.STRING }
            },
            required: ['itemId', 'proposedTags', 'proposedUrgency', 'blockers', 'timeEstimateMinutesP50', 'timeEstimateMinutesP90', 'confidence', 'rationale', 'createdAt']
        }
    };

    const itemsForPrompt = items.map(item => ({
        id: item.id,
        item: item.item,
        tags: item.tags,
        note: (notes[item.id] && notes[item.id].shareWithAI) ? notes[item.id].text : null
    }));

    const prompt = `
      You are an expert project manager. Analyze this list of tasks. For each task, provide refined metadata based on its description and any provided notes.
      - **Task Archetypes**: Identify the type of task (e.g., errand with travel, deep work, meeting, admin). This informs the time estimate.
      - **P50/P90 Time Estimates**: Provide a 50th percentile (P50, median) and 90th percentile (P90, pessimistic) time estimate in WHOLE MINUTES. P90 must be >= P50. A large gap between P50 and P90 indicates uncertainty or dependencies.
      - **Blockers**: Identify any dependencies or obstacles (e.g., "awaiting feedback", "requires travel").
      - **Confidence**: Rate your confidence in the analysis from 0.0 to 1.0.
      - **Rationale**: Provide a one-sentence justification for your suggestions.
      - **Urgency**: Classify as 'low', 'normal', 'high'.
      - **CreatedAt**: Use the current ISO 8601 timestamp.
      - **Privacy**: A null note means the user did not consent to sharing it. Analyze based on the item text alone.

      Return a JSON array of suggestion objects, strictly following the schema.

      **Input Items:**
      ${JSON.stringify(itemsForPrompt)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        const jsonStr = response.text.trim();
        return { ok: true, data: JSON.parse(jsonStr) };
    } catch (error) {
        console.error("Error refining items:", error);
        return { ok: false, error: "The AI failed to refine the items." };
    }
};

/**
 * Plans clusters from refined brain dump items.
 * Originally from BrainDump.tsx
 */
export const planBrainDumpClusters = async (items: BrainDumpItem[], refinements: RefinementSuggestion[]): Promise<Result<{ moves: ClusterMove[]; summary: string; clusters: Cluster[] }>> => {
    const itemMap = new Map(items.map(i => [i.id, i]));
    const itemsForClustering = refinements.map(ref => ({
        id: ref.itemId,
        item: itemMap.get(ref.itemId)?.item || '',
        refinedTags: ref.proposedTags,
        p90: ref.timeEstimateMinutesP90,
        blockers: ref.blockers,
    }));
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING },
            clusters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        clusterName: { type: Type.STRING },
                        itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        estimatedTime: { type: Type.STRING }
                    },
                    required: ['clusterName', 'itemIds', 'estimatedTime']
                }
            }
        },
        required: ['summary', 'clusters']
    };

    const prompt = `
      Given this list of tasks and their refined metadata (tags, time estimates), your job is to organize them into logical clusters.
      1.  **Create Clusters**: Group items into clusters with descriptive names (e.g., "Q3 Marketing Plan", "Household Errands"). Every item must belong to one cluster.
      2.  **Estimate Cluster Time**: Sum the P90 estimates for all items in a cluster and provide a human-readable total time (e.g., "3 hours 30 minutes", "5 days").
      3.  **Write Summary**: Provide a brief, 1-2 sentence summary of the organizational changes.
      
      Return a single JSON object with "summary" and "clusters".

      **Input Data:**
      ${JSON.stringify(itemsForClustering)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        const moves: ClusterMove[] = []; 
        return { ok: true, data: { ...result, moves } };
    } catch (error) {
        console.error("Error planning cluster:", error);
        return { ok: false, error: "The AI failed to plan the clusters." };
    }
};

/**
 * Generates an initial Momentum Map from a high-level goal.
 * Originally from MomentumMap.tsx
 */
export const generateMomentumMap = async (goal: string, history: Record<EnergyTag, CompletionRecord[]>): Promise<Result<MomentumMapData>> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            finishLine: {
                type: Type.OBJECT,
                properties: { statement: { type: Type.STRING }, acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } } },
                required: ['statement', 'acceptanceCriteria'],
            },
            chunks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING }, title: { type: Type.STRING },
                        subSteps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { id: { type: Type.STRING }, description: { type: Type.STRING }, isComplete: { type: Type.BOOLEAN } },
                                required: ['id', 'description', 'isComplete'],
                            },
                        },
                        p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER },
                        energyTag: { type: Type.STRING, enum: Object.values(EnergyTag) },
                        blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        isComplete: { type: Type.BOOLEAN },
                        warning: { type: Type.STRING, description: 'A gentle warning if an estimate seems unusually high or low based on user history.' }
                    },
                    required: ['id', 'title', 'subSteps', 'p50', 'p90', 'energyTag', 'blockers', 'isComplete'],
                },
            },
        },
        required: ['finishLine', 'chunks'],
    };

    const historySummary = Object.entries(history)
        .filter(([, records]) => records.length > 3)
        .map(([tag, records]) => {
            const avgDeviation = records.reduce((acc, r) => acc + (r.actualDurationMinutes - r.estimatedDurationMinutes), 0) / records.length;
            return `- For '${tag}' tasks, user's actual time is, on average, ${Math.round(avgDeviation)} minutes ${avgDeviation > 0 ? 'longer' : 'shorter'} than estimated.`;
        }).join('\n');
    
    const prompt = `
      You are a world-class project manager. Create a detailed project plan for the following high-level goal.
      The plan should have a clear "Finish Line" and be broken down into logical "Chunks" of work. Each chunk should be about 25-90 minutes of focused work.
      
      **User Performance History:**
      Use this summary of the user's past performance to create more accurate and personalized time estimates. Adjust your P50/P90 estimates based on these patterns.
      ${historySummary || "No significant user history available. Use general estimates."}

      **Instructions:**
      1.  **Finish Line**: Define the final goal and list 3-5 concrete acceptance criteria.
      2.  **Chunks**: Break the project into logical chunks. For each chunk:
          - Give it a clear, actionable title.
          - Break it down into 2-5 small, concrete sub-steps.
          - Provide P50 (median) and P90 (pessimistic) time estimates in WHOLE MINUTES, informed by the user's history.
          - Assign an appropriate EnergyTag.
          - If your estimate for a chunk deviates significantly from what the user's history suggests (e.g., you estimate 30m for a Creative task but they usually take 60m), add a brief, friendly 'warning' message explaining the potential discrepancy.
          - List any potential initial blockers.
          - Generate unique IDs for chunks and sub-steps (e.g., "chunk-1", "ss-1-1").
          - Set initial "isComplete" status to false for all items.

      Return a single JSON object that strictly follows the provided schema.

      **High-Level Goal**: "${goal}"
    `;

    try {
        const apiCall = ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 60 seconds. The AI might be busy, please try again.")), 60000));
        const response = await Promise.race([apiCall, timeout]);
        const jsonStr = (response as any).text.trim();
        const data = JSON.parse(jsonStr) as Omit<MomentumMapData, 'version'>;
        return { ok: true, data: { ...data, version: 1 } };
    } catch (error: any) {
        console.error("Error generating initial plan:", error);
        return { ok: false, error: error?.message || "The AI failed to generate a plan. Please try again later." };
    }
};

/**
 * Re-plans incomplete chunks of a Momentum Map based on a new finish line.
 * Originally from MomentumMap.tsx
 */
export const replanMomentumMap = async (finishLine: FinishLine, completedSubSteps: { id: string; description: string }[], incompleteChunks: Chunk[]): Promise<Result<Chunk[]>> => {
     const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING }, title: { type: Type.STRING },
                subSteps: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { id: { type: Type.STRING }, description: { type: Type.STRING }, isComplete: { type: Type.BOOLEAN } },
                        required: ['id', 'description', 'isComplete'],
                    },
                },
                p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER },
                energyTag: { type: Type.STRING, enum: Object.values(EnergyTag) },
                blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
                isComplete: { type: Type.BOOLEAN },
            },
            required: ['id', 'title', 'subSteps', 'p50', 'p90', 'energyTag', 'blockers', 'isComplete'],
        },
    };

    const prompt = `
        You are a world-class project manager, tasked with re-planning a project because the final goal has changed.
        
        **New Goal (Finish Line)**: ${finishLine.statement}
        **New Acceptance Criteria**: ${finishLine.acceptanceCriteria.join(', ')}

        **Completed Work (DO NOT CHANGE)**:
        The following sub-steps have already been completed and must remain in the plan as-is.
        - ${completedSubSteps.map(s => s.description).join('\n- ') || 'None'}

        **Existing Incomplete Chunks (ADJUST THESE)**:
        Analyze the following incomplete chunks and adjust their titles, sub-steps, and estimates to align with the *new* Finish Line.
        You can add, remove, or modify chunks and sub-steps as needed to create the most efficient path to the new goal.
        Preserve existing IDs if a chunk or sub-step is only slightly modified. Create new IDs for entirely new items.
        
        **Return a JSON array of the NEW, re-planned chunks.**

        **Incomplete Chunks to Re-plan**:
        ${JSON.stringify(incompleteChunks, null, 2)}
    `;

    try {
        const apiCall = ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out after 60 seconds. The AI might be busy, please try again.")), 60000));
        const response = await Promise.race([apiCall, timeout]);
        const jsonStr = (response as any).text.trim();
        return { ok: true, data: JSON.parse(jsonStr) };
    } catch (error: any) {
        console.error("Error replanning:", error);
        return { ok: false, error: error?.message || "The AI failed to re-plan. Please try again." };
    }
};

/**
 * Suggests a way to split a large chunk into smaller ones.
 * Originally from MomentumMap.tsx
 */
export const suggestChunkSplit = async (chunk: Chunk, finishLine: string, prevChunkTitle?: string, nextChunkTitle?: string): Promise<Result<Chunk[]>> => {
    const chunkSchema = {
        type: Type.OBJECT, properties: {
            id: { type: Type.STRING }, title: { type: Type.STRING },
            subSteps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, description: { type: Type.STRING }, isComplete: { type: Type.BOOLEAN } }, required: ['id', 'description', 'isComplete'] } },
            p50: { type: Type.NUMBER }, p90: { type: Type.NUMBER },
            energyTag: { type: Type.STRING, enum: Object.values(EnergyTag) },
            blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
            isComplete: { type: Type.BOOLEAN },
        }, required: ['id', 'title', 'subSteps', 'p50', 'p90', 'energyTag', 'blockers', 'isComplete'],
    };
    const schema = { type: Type.ARRAY, items: chunkSchema };
    
    const prompt = `
      You are an expert project manager. A user finds a "chunk" of work too large and wants to split it.
      Your task is to break the given chunk into 2 or 3 smaller, more manageable chunks.
      Use the provided context to ensure the new chunks form a logical sequence.

      - Each new chunk should be a logical sub-part of the original.
      - Each new chunk should have a clear, actionable title.
      - Distribute the original sub-steps among the new chunks. You can rephrase them for clarity if needed.
      - Create new P50 and P90 estimates for each new chunk. The sum of the new P90s should be roughly equal to the original P90.
      - Assign the same EnergyTag as the original.
      - Generate new unique IDs for the new chunks (e.g., "chunk-1-split-a") and their sub-steps (e.g., "ss-1-a-1").
      - Set "isComplete" to false.

      **Project Context:**
      - **Overall Goal (Finish Line):** ${finishLine}
      - **Previous Chunk:** ${prevChunkTitle || 'N/A (This is the first chunk)'}
      - **Next Chunk:** ${nextChunkTitle || 'N/A (This is the last chunk)'}

      **Original Chunk to Split:**
      ${JSON.stringify({ title: chunk.title, subSteps: chunk.subSteps.map(s => s.description), p90: chunk.p90, energyTag: chunk.energyTag }, null, 2)}

      Return a JSON array of the new chunk objects, strictly following the schema.
    `;

    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
        const jsonStr = response.text.trim();
        return { ok: true, data: JSON.parse(jsonStr) };
    } catch (error) {
        console.error("Error generating split suggestion:", error);
        return { ok: false, error: "The AI failed to suggest a split. Please try again or split it manually." };
    }
};

/**
 * Suggests a small, actionable micro-step to unblock a user.
 * Originally from MomentumMap.tsx
 */
export const suggestUnblocker = async (subStep: SubStep, context: string): Promise<Result<string>> => {
    const schema = { type: Type.OBJECT, properties: { suggestion: { type: Type.STRING } }, required: ['suggestion'] };
    const prompt = `
      You are a helpful productivity coach. A user is feeling stuck on a task.
      Your goal is to suggest a single, tiny, concrete, and easy-to-start "micro-step" to help them get moving.
      This micro-step should take less than 5 minutes to complete. It's about building momentum, not solving the whole problem.

      - Focus on a physical action (e.g., "Open a new document and title it...", "Draft a one-sentence email to...").
      - Do not suggest just "thinking about it" or "making a plan".
      - The suggestion should be a simple declarative sentence.

      **Project Goal:** ${context}
      **Stuck on this sub-step:** "${subStep.description}"
      **Known blockers:** ${subStep.blockers?.join(', ') || 'None specified'}

      Return a single JSON object with one key, "suggestion", containing the string for the micro-step.
      Example: { "suggestion": "Open a new email draft to John Smith with the subject 'Quick question'." }
    `;
    
    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return { ok: true, data: result.suggestion };
    } catch (error) {
        console.error("Error generating unblocker suggestion:", error);
        return { ok: false, error: "The AI failed to provide a suggestion. Try rephrasing your goal." };
    }
};

/**
 * Suggests a title for a chunk based on its sub-steps.
 * Originally from MomentumMap.tsx
 */
export const suggestChunkTitle = async (subSteps: {description: string}[]): Promise<Result<string>> => {
    const schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ['title'] };
    const prompt = `
        Based on the following list of sub-tasks, generate a concise and actionable title (3-5 words) that summarizes the overall goal of these tasks.

        Sub-tasks:
        ${subSteps.map(s => `- ${s.description}`).join('\n')}

        Return a single JSON object with one key, "title".
    `;

    try {
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: schema } });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return { ok: true, data: result.title };
    } catch (error) {
        console.error("Error generating chunk title:", error);
        return { ok: false, error: "AI failed to suggest a title." };
    }
};

/**
 * Parses a natural language string to create a structured reminder.
 * Originally from CalendarPage.tsx
 */
export const parseNaturalLanguageReminder = async (text: string, scheduleEvents: ScheduleEvent[]): Promise<Result<{ anchorTitle: string; offsetMinutes: number; message: string; why: string }>> => {
    const anchorTitles = [...new Set(scheduleEvents.map(e => e.title))];
    const schema = {
        type: Type.OBJECT, properties: {
            anchorTitle: { type: Type.STRING, description: "The title of the anchor event to link this reminder to. Must be an exact match from the provided list.", enum: anchorTitles.length > 0 ? anchorTitles : undefined },
            offsetMinutes: { type: Type.NUMBER, description: "The offset in minutes from the anchor's start time. Negative for before, positive for after." },
            message: { type: Type.STRING, description: "The content of the reminder message for the user." },
            why: { type: Type.STRING, description: "A brief, friendly explanation for why this reminder is being set at this time." }
        }, required: ["anchorTitle", "offsetMinutes", "message", "why"]
    };

    const prompt = `
        You are a helpful scheduling assistant. Parse the user's natural language request to create a structured reminder object.
        - The 'anchorTitle' MUST be an exact match from the provided list of available anchor titles.
        - Calculate 'offsetMinutes' based on the request (e.g., "10 minutes before" is -10, "at the start" is 0, "5 minutes after" is 5).
        - Extract the core reminder 'message'.
        - Create a simple 'why' message, like "Because you asked to be reminded."

        Available Anchor Titles:
        ${anchorTitles.join(', ')}

        User Request:
        "${text}"

        Return a single JSON object that strictly follows the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        if (anchorTitles.length > 0 && !anchorTitles.includes(result.anchorTitle)) {
             throw new Error(`Could not find an anchor named "${result.anchorTitle}". Please check the name.`);
        }
        return { ok: true, data: result };
    } catch (error: any) {
        console.error("Error parsing reminder with Gemini:", error);
        const errorMessage = error instanceof Error && error.message.includes('Could not find an anchor') ? error.message : "I had trouble understanding that. Could you try rephrasing? e.g., 'Remind me to pack my gym bag 30 minutes before Gym Session'";
        return { ok: false, error: errorMessage };
    }
};

/**
 * Processes a user's chat message to determine the correct action or clarification.
 * Originally from AiChat.tsx
 */
export const processAiChatMessage = async (currentMessages: Message[], scheduleEvents: ScheduleEvent[]): Promise<Result<any>> => {
    const aiSchema = {
        type: Type.OBJECT, properties: {
            thought: { type: Type.STRING, description: "Your reasoning for the response." },
            response_type: { type: Type.STRING, enum: ["CLARIFICATION", "ACTION_CONFIRMATION", "GENERAL_RESPONSE"] },
            message: { type: Type.STRING, description: "The message to show to the user." },
            clarification_options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of short, button-friendly options for the user to select from to resolve ambiguity." },
            action: {
                type: Type.OBJECT, properties: {
                    name: { type: Type.STRING, enum: ["ADD_ANCHOR", "ADD_REMINDER", "PAUSE_NOTIFICATIONS"] },
                    parameters: {
                        type: Type.OBJECT, properties: {
                            title: { type: Type.STRING }, startTime: { type: Type.STRING }, endTime: { type: Type.STRING },
                            days: { type: Type.ARRAY, items: { type: Type.STRING } },
                            reminderMessage: { type: Type.STRING }, offsetMinutes: { type: Type.NUMBER },
                            anchorTitle: { type: Type.STRING }, durationDays: { type: Type.NUMBER }
                        }
                    }
                }
            }
        }, required: ["thought", "response_type", "message"]
    };

    const history = currentMessages.map(m => `${m.role}: ${m.text}`).join('\n');
    const anchors = [...new Set(scheduleEvents.map(a => a.title))];

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
        return { ok: true, data: result };
    } catch (error) {
        console.error("AI Chat Error:", error);
        return { ok: false, error: "AI processing failed." };
    }
};
