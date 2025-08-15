const axios = require('axios');

// --- IMPORTANT: PASTE YOUR GEMINI API KEY HERE ---
// For better security, consider using environment variables if your platform supports them.
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
        version: '1.1', // Updated version
        credit: 'Google Gemini Official API',
        description: 'Connects to the official Gemini AI API',
        cooldowns: 5,
        hasPermssion: 0,
        commandCategory: 'google',
        usages: {
            en: '{pn} message | photo',
        }
    },

    run: async function({ api, args, event }) {
        const prompt = args.join(' ');
        
        try {
            let requestBody;
            let apiUrl;

            // Check if the command is a reply to a message with an image
            if (event.type === 'message_reply' && event.messageReply.attachments?.[0]?.type === 'photo') {
                const attachment = event.messageReply.attachments[0];
                const imagePart = await urlToGenerativePart(attachment.url);
                
                // Use the Vision model for image and text
                apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;
                
                // Construct the request body for a multimodal query
                requestBody = {
                    contents: [{
                        parts: [
                            { text: prompt },
                            imagePart
                        ]
                    }]
                };

            } else {
                // This is a text-only request
                if (!prompt) {
                    const welcomeMessage = "𖣘 -𝐁𝐎𝐓 ⚠️\nAssalamu Alaikum\n\nHow can I assist you today?";
                    return api.sendMessage(welcomeMessage, event.threadID, event.messageID);
                }
                
                // Use the standard text model
                apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
                
                // Construct the request body for a text-only query
                requestBody = {
                    contents: [{
                        parts: [{ text: prompt }]
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
                throw new Error("No content received from Gemini API.");
            }

        } catch (error) {
            console.error("Gemini API Error:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.error?.message || "An unknown error occurred while contacting the Gemini API.";
            api.sendMessage(`API Error: ${errorMessage}`, event.threadID, event.messageID);
        }
    }
};
