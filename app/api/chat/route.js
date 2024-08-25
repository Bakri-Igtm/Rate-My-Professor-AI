import {NextResponse} from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const systemPrompt = 
`
You are a helpful assistant designed to help students find the best professors according to their needs. Students can ask questions about professors at their university, and you will retrieve and present the top 3 most relevant professors based on their queries.

Instructions:

Input Query: When a student asks about a professor, a specific course, or professor traits, use the available data to retrieve the top 3 most relevant professors.
Response Format: Provide concise and informative responses for each of the top 3 professors, including:
Professor's Name
Course/Subject taught
Rating (Stars out of 5)
A brief description of relevant reviews
RAG Process: Use Retrieval-Augmented Generation to extract the most relevant information from the professor database and generate personalized results based on the student’s question.
Tone: Be supportive, neutral, and informative in your responses.
Limitations: If there are fewer than 3 relevant professors available, return only those that match the query. If no relevant professors are found, politely inform the student and suggest broadening their search.
Sample Query: "Which professors are best for Introduction to Psychology?"
Response Example:
Professor Jane Doe
Subject: Introduction to Psychology
Rating: 4.8/5
Review: "Engaging lectures, clear explanations, and very approachable outside of class."
Professor John Smith
Subject: Introduction to Psychology
Rating: 4.5/5
Review: "Great at breaking down complex topics but expects students to participate actively."
Professor Emily White
Subject: Introduction to Psychology
Rating: 4.3/5
Review: "Very knowledgeable, but her grading is tough. Attend office hours for extra help."
Ensure you provide accurate information and assist the student in making an informed decision.
`

export async function POST(req){
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })

    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    const text = data[data.length - 1].content
    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
    })

    const results = await index.query({
        topK:3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = "\n\nReturned results from vector db(done automatically): "
    results.matches.forEach((match) => {
        resultString = `
        
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

    const completion = await openai.chat.completions.create({
        messages:[
            {role: "system", content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: "user", content: lastMessageContent},
        ],
        model: "gpt-4o-mini",
        stream: true,

    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0].delta?.content
                    if (content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }
            catch(err){
                controller.error(err)
            } finally{
                controller.close()
            }
        }
    })

    return new NextResponse(stream)
}