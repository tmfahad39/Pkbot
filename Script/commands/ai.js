const axios = require('axios');

// --- 🚨 IMPORTANT: PASTE YOUR REAL GEMINI API KEY HERE ---
// Replace "PASTE_YOUR_KEY_HERE" with your actual key. Keep it secret!
const GEMINI_API_KEY = "AIzaSyBVmU2I4oHWKKfutGnXUOyMjLZglxcSPpA";

/**
 * A helper function to download an image from a URL and convert it to a Base64 string.
 * This is required because the Gemini API needs the raw image data, not just a URL.
 * @param {string} url The URL of the image to fetch.
 * @returns {Promise<{mimeType: string, data: string}>} The image data formatted for the API.
 */
async function urlToGenerativePart(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        
        // Determine mime type from headers, default to jpeg
        const mimeType = response.headers['content-type'] || 'image/jpeg';
        const data = Buffer.from(response.data).toString('base64');
        
        return {
            inlineData: {
                mimeType,
                data
            }
        };
    } catch (error) {
        console.error("Error fetching or converting image:", error);
        throw new Error("Could not process the image from the URL.");
    }
}

module.exports = {
    config: {
        name: 'ai',
        version: '1.2', // Updated version
        credit: 'Google Gemini Official API',
        description: 'A friendly and witty AI assistant powered by Gemini', // Updated description
        cooldowns: 5,
        hasPermssion: 0,
        commandCategory: 'google',
        usages: {
            en: '{pn} [your question] | Reply to an image with {pn} [question about image]',
        }
    },

    run: async function({ api, args, event }) {
        // This instruction is sent with every prompt to guide the AI's tone and personality.
        const persona = `Your name is Gemini. You are a friendly, witty, and helpful AI assistant. 
        Your goal is to provide accurate information in a fun, conversational, and sometimes humorous way. 
        Feel free to use emojis to make the conversation more lively. 
        Now, answer the user's request: `;

        const userPrompt = args.join(' ');
        
        try {
            let requestBody;
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

            // Check if the command is a reply to a message with an image
            if (event.type === 'message_reply' && event.messageReply.attachments?.[0]?.type === 'photo') {
                const attachment = event.messageReply.attachments[0];
                const imagePart = await urlToGenerativePart(attachment.url);
                
                const finalPrompt = persona + userPrompt;

                // Construct the request body for a multimodal query (text + image)
                requestBody = {
                    contents: [{
                        parts: [
                            { text: finalPrompt },
                            imagePart
                        ]
                    }]
                };

            } else {
                // This is a text-only request
                if (!userPrompt) {
                    const welcomeMessage = "Hey there! 👋 I'm Gemini, your friendly AI assistant.\n\nAsk me anything, or reply to a photo with a question about it!";
                    return api.sendMessage(welcomeMessage, event.threadID, event.messageID);
                }
                
                const finalPrompt = persona + userPrompt;
                
                // Construct the request body for a text-only query
                requestBody = {
                    contents: [{
                        parts: [{ text: finalPrompt }]
                    }]
                };
            }

            // Make the API call to Google's official endpoint
            const response = await axios.post(apiUrl, requestBody, {
                headers: { 'Content-Type': 'application/json' }
            });

            // Safely extract the text response from the API result
            const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                api.sendMessage(text, event.threadID, event.messageID);
            } else {
                const stopReason = response.data?.candidates?.[0]?.finishReason;
                if (stopReason && stopReason !== 'STOP') {
                     api.sendMessage(`Whoops! My circuits got a little tangled. The response was blocked because: ${stopReason}. Maybe try asking in a different way? 🤔`, event.threadID, event.messageID);
                } else {
                     throw new Error("No content received from Gemini API. The response might be empty or blocked.");
                }
            }

        } catch (error) {
            console.error("Gemini API Error:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.error?.message || "An unknown error occurred while contacting the Gemini API.";
            api.sendMessage(`Uh oh! Houston, we have a problem. 🚀 The API returned an error: ${errorMessage}`, event.threadID, event.messageID);
        }
    }
};
