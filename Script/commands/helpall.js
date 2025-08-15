/**
 * @name help
 * @version 1.0.4
 * @description Shows a list of all commands in a grid or details for a specific command.
 * @commandCategory system
 * @hasPermssion 0
 * @credits MAHBUB SHAKON // Original author credit
 * @usages 
 *  help
 *  help <command_name>
 *  help all
 * @cooldowns 5
 * @envConfig {
 *  "autoUnsend": true,
 *  "delayUnsend": 20
 * }
 */

// Language configuration for the help command (Corrected)
module.exports.languages = {
    "en": {
        "moduleInfo": "╭──────•◈•──────╮\n│❄️ Command: %1\n╰──────•◈•──────╯\n\n|● Description: %2\n\n|● Usage: %3\n|● Category: %4\n|● Cooldown: %5 seconds(s)\n|● Permission: %6\n\n•—» Use \"%7help <command>\" for details. «—•",
        "allCommandsHeader": "╭──────•◈•──────╮\n│ All Available Commands\n╰──────•◈•──────╯\n\n",
        "user": "User",
        "adminGroup": "Group Admin",
        "adminBot": "Bot Admin"
    }
};

/**
 * NOTE ON handleEvent:
 * The original 'handleEvent' was programmed to send a help message for ANY valid command typed.
 * This is incorrect behavior as it prevents commands from running their actual functions.
 * A proper implementation would only trigger on command errors, which this module cannot detect.
 * Therefore, it has been commented out to prevent issues with your other commands.
 */
/*
module.exports.handleEvent = function({ api, event, getText }) {
    // This function is disabled to prevent conflicts.
};
*/

module.exports.run = function({ api, event, args, getText }) {
    const { commands } = global.client;
    const { threadID, messageID } = event;
    const commandName = (args[0] || "").toLowerCase();
    
    // --- CRITICAL FIX: Correctly access the module's own envConfig ---
    // The previous code would have caused a TypeError crash.
    const { autoUnsend, delayUnsend } = this.config.envConfig;

    const prefix = (global.data.threadData.get(threadID) || {}).PREFIX || global.config.PREFIX;

    // --- Show help for a specific command ---
    if (commandName && commands.has(commandName)) {
        const command = commands.get(commandName);
        
        const permissionMap = {
            0: getText("user"),
            1: getText("adminGroup"),
            2: getText("adminBot")
        };
        const permission = permissionMap[command.config.hasPermssion] || getText("user");
        
        // CRITICAL FIX: Pass the 'prefix' as the 7th argument to match the template string.
        const helpMessage = getText("moduleInfo", 
            command.config.name, 
            command.config.description, 
            `${prefix}${command.config.name} ${(command.config.usages) ? command.config.usages : ""}`, 
            command.config.commandCategory, 
            command.config.cooldowns, 
            permission,
            prefix // This was the missing argument for %7
        );
        
        return api.sendMessage(helpMessage, threadID, messageID);
    }

    // --- Show all commands in a grid format (for 'help' and 'help all') ---
    else {
        const commandGroups = [];
        for (const command of commands.values()) {
            // Exclude the help command itself from the list
            if (command.config.name === "help") continue; 
            
            const category = command.config.commandCategory.toLowerCase() || 'no category';
            let group = commandGroups.find(g => g.group === category);
            if (!group) {
                group = { group: category, cmds: [] };
                commandGroups.push(group);
            }
            group.cmds.push(command.config.name);
        }

        // --- Grid Formatting Logic ---
        const columns = 3; // You can change this to 2, 3, or 4 for different layouts
        let maxLen = 0;
        commands.forEach(cmd => {
            if (cmd.config.name.length > maxLen) {
                maxLen = cmd.config.name.length;
            }
        });
        const colWidth = maxLen + 4;

        let helpMessage = getText("allCommandsHeader");

        commandGroups.sort((a, b) => a.group.localeCompare(b.group)); // Sort categories alphabetically
        
        commandGroups.forEach(group => {
            if (group.cmds.length === 0) return; // Don't show empty categories

            helpMessage += `╭─ ${group.group.charAt(0).toUpperCase() + group.group.slice(1)}\n╰─➤ `;
            
            let commandGrid = "";
            const sortedCmds = group.cmds.sort();

            for (let i = 0; i < sortedCmds.length; i++) {
                const cmd = sortedCmds[i];
                commandGrid += cmd.padEnd(colWidth);
                
                if ((i + 1) % columns === 0 && i < sortedCmds.length - 1) {
                    commandGrid += "\n      "; // Newline and indent for next row
                }
            }
            helpMessage += commandGrid.trim() + '\n\n';
        });

        helpMessage += `Total Commands: ${commands.size - 1}`; // -1 to exclude 'help'
        
        api.sendMessage(helpMessage, threadID, (err, info) => {
            if (err) return console.error(err);
            if (autoUnsend) {
                setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
            }
        }, messageID);
    }
};