const fs = require("fs-extra");
const request = require("request");

// Module Configuration
module.exports.config = {
    name: "help",
    version: "1.1.0", // Updated version
    hasPermssion: 0,
    credits: "Original by MAHBUB SHAKON, de-obfuscated & improved by AI",
    description: "Shows a list of commands or details for a specific command.",
    commandCategory: "system",
    usages: "[command name | page number | all]",
    cooldowns: 5,
};

// This function runs when the user types a command starting with '?' (e.g., ?ping)
module.exports.handleEvent = function({ api, event }) {
    const { commands } = global.client;
    const { threadID, messageID, body } = event;

    // Check if the message starts with the command prefix from the original code ('?')
    if (!body || typeof body !== 'string' || !body.startsWith('?')) {
        return;
    }

    const commandName = body.slice(1).trim().toLowerCase(); // Get command name after '?'

    if (commands.has(commandName)) {
        // If the command exists, call the main run function to show its details
        module.exports.run({
            api,
            event,
            args: [commandName], // Pass the command name as an argument
            // getText is not used in this version, so a dummy function is fine
            getText: () => {} 
        });
    }
};

// This is the main function that runs when the user types "help"
module.exports.run = function({ api, event, args }) {
    const { commands } = global.client;
    const { threadID, messageID } = event;
    const commandName = (args[0] || "").toLowerCase();
    const threadSettings = global.data.threadData.get(parseInt(threadID)) || {};
    const prefix = threadSettings.PREFIX || global.config.PREFIX;

    //================================================
    //==  CASE 1: "help all" - Categorized List     ==
    //================================================
    if (commandName === 'all') {
        const commandsByCategory = {};
        for (const cmd of commands.values()) {
            const category = cmd.config.commandCategory || 'No Category';
            if (!commandsByCategory[category]) {
                commandsByCategory[category] = [];
            }
            commandsByCategory[category].push(cmd.config.name);
        }

        let msg = "✨ Here are all available bot commands ✨\n\n";
        const sortedCategories = Object.keys(commandsByCategory).sort();

        for (const category of sortedCategories) {
            msg += `╭─「 ${category.toUpperCase()} 」\n`;
            msg += `│ ${commandsByCategory[category].join(' • ')}\n`;
            msg += `╰─╄\n\n`;
        }
        
        msg += `💬 To see details for a command, use: ${prefix}help [command name]`;
        return api.sendMessage(msg, threadID);
    }

    //================================================
    //==  CASE 2: "help [command]" - Specific Info  ==
    //================================================
    else if (commands.has(commandName)) {
        const command = commands.get(commandName);
        const { name, description, usages, commandCategory, cooldowns, hasPermssion, credits } = command.config;

        let permissionText = "User";
        if (hasPermssion == 1) permissionText = "Group Admin";
        if (hasPermssion == 2) permissionText = "Bot Admin";

        const helpDetails = 
`╭───[ Command: ${name} ]───╮
│
│ • Description: ${description || "No description available."}
│ • Usage: ${prefix}${name} ${usages || ""}
│ • Category: ${commandCategory}
│ • Cooldown: ${cooldowns || 0} seconds
│ • Permission: ${permissionText}
│ • Credits: ${credits || "Unknown"}
│
╰───────────────────╯`;
        
        return api.sendMessage(helpDetails, threadID, messageID);
    }

    //================================================
    //==  CASE 3: "help" or "help [page]" - Paginated ==
    //================================================
    else {
        const allCommandNames = Array.from(commands.keys()).sort();
        const page = parseInt(args[0]) || 1;
        const commandsPerPage = 15;
        const totalPages = Math.ceil(allCommandNames.length / commandsPerPage);

        if (page < 1 || page > totalPages) {
            return api.sendMessage(`Invalid page number. Please enter a number from 1 to ${totalPages}.`, threadID, messageID);
        }
        
        const startIndex = (page - 1) * commandsPerPage;
        const commandsOnPage = allCommandNames.slice(startIndex, startIndex + commandsPerPage);

        let commandListText = commandsOnPage.map(cmd => `» ${cmd}`).join('\n');

        const helpListPage = 
`╭──────•◈•──────╮
  ✿ COMMANDS LIST ✿
╰──────•◈•──────╯\n\n` +
`${commandListText}\n\n` +
`──────────\n` +
`📄 Page ${page}/${totalPages} 📄\n\n` +
`Use "${prefix}help [command name]" for details.\n` +
`Use "${prefix}help all" for a categorized list.`;
        
        // Define an array of image URLs to be sent as an attachment
        const imageLinks = [
            "https://i.imgur.com/ybM9Wtr.jpg",
            "https://i.imgur.com/QdgH08j.jpg",
            // Add more image URLs here if you want
        ];
        const randomLink = imageLinks[Math.floor(Math.random() * imageLinks.length)];
        const imagePath = `${__dirname}/cache/help_${Date.now()}.jpg`;

        // Download the image and send it with the message
        request(encodeURI(randomLink))
            .pipe(fs.createWriteStream(imagePath))
            .on("close", () => {
                api.sendMessage({
                    body: helpListPage,
                    attachment: fs.createReadStream(imagePath)
                }, threadID, () => fs.unlinkSync(imagePath), messageID);
            })
            .on("error", (err) => {
                console.error("Failed to download help image:", err);
                // If download fails, send the text message anyway
                api.sendMessage(helpListPage, threadID, messageID);
            });
    }
};
