const fs = require("fs-extra");
const path = require("path");
const Canvas = require("canvas");
const axios = require("axios");

// --- IMAGE GENERATION ENGINE (from NTKhang's script) ---

const defaultFontName = "BeVietnamPro-SemiBold";
const percentage = total => total / 100;

let deltaNext = 5; // Default value, can be adjusted.

// New leveling formulas
const expToLevel = (exp) => Math.floor((1 + Math.sqrt(1 + 8 * exp / deltaNext)) / 2);
const levelToExp = (level) => Math.floor(((Math.pow(level, 2) - level) * deltaNext) / 2);

async function makeRankCard(data) {
    const { userID, name, rank, level, exp, expNextLevel } = data;

    const currentExp = exp - levelToExp(level);

    // Fetch user's avatar
    const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const avatarBuffer = (await axios.get(avatarUrl, { responseType: 'arraybuffer' })).data;
    
    const dataLevel = {
        exp: currentExp,
        expNextLevel,
        name: name,
        rank: `#${rank}`,
        level: level,
        avatar: avatarBuffer
    };

    // Default design, can be customized here if needed
    const configRankCard = {
        widthCard: 2000,
        heightCard: 500,
        main_color: "#222222",
        sub_color: "#333333",
        alpha_subcard: 0.9,
        exp_color: "#00BFFF",
        expNextLevel_color: "#1C1C1C",
        text_color: "#FFFFFF",
        name_color: "#FFFFFF",
        level_color: "#00BFFF",
        rank_color: "#00BFFF"
    };

    const image = new RankCard({ ...configRankCard, ...dataLevel });
    return image.buildCard();
}

class RankCard {
    constructor(options) {
        this.widthCard = 2000;
        this.heightCard = 500;
        this.main_color = "#474747";
        this.sub_color = "rgba(255, 255, 255, 0.5)";
        this.alpha_subcard = 0.9;
        this.exp_color = "#e1e1e1";
        this.expNextLevel_color = "#3f3f3f";
        this.text_color = "#000000";
        this.fontName = "BeVietnamPro-Bold";
        this.textSize = 0;

        for (const key in options)
            this[key] = options[key];
    }

    async buildCard() {
        // This is a simplified version of the drawing logic from the source file
        const { widthCard, heightCard, main_color, sub_color, alpha_subcard, exp_color, expNextLevel_color, text_color, name_color, level_color, rank_color, exp, expNextLevel, name, level, rank, avatar } = this;
        
        const canvas = Canvas.createCanvas(widthCard, heightCard);
        const ctx = canvas.getContext("2d");

        // Background
        ctx.fillStyle = main_color;
        drawSquareRounded(ctx, 0, 0, widthCard, heightCard, 30);

        // Sub Card
        ctx.globalAlpha = alpha_subcard;
        ctx.fillStyle = sub_color;
        const alignRim = 30;
        drawSquareRounded(ctx, alignRim, alignRim, widthCard - alignRim * 2, heightCard - alignRim * 2, 20);
        ctx.globalAlpha = 1;
        
        // Avatar
        const avatarSize = heightCard - (alignRim * 2);
        const avatarX = alignRim;
        const avatarY = alignRim;
        const avatarImg = await Canvas.loadImage(avatar);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Text & EXP Bar
        const textX = avatarX + avatarSize + 30;
        const textY = alignRim + 50;

        // Name
        ctx.font = `80px "${this.fontName}"`;
        ctx.fillStyle = name_color || text_color;
        ctx.fillText(name, textX, textY + 80);

        // Rank and Level
        ctx.font = `60px "${this.fontName}"`;
        ctx.fillStyle = rank_color || text_color;
        ctx.fillText(`Rank: ${rank}`, textX, textY + 180);

        const levelText = `Level: ${level}`;
        const levelWidth = ctx.measureText(levelText).width;
        ctx.fillStyle = level_color || text_color;
        ctx.fillText(levelText, widthCard - alignRim - levelWidth - 30, textY + 80);

        // EXP Bar
        const expBarWidth = widthCard - textX - alignRim - 30;
        const expBarHeight = 60;
        const expBarX = textX;
        const expBarY = heightCard - alignRim - expBarHeight - 30;
        
        ctx.fillStyle = expNextLevel_color;
        drawSquareRounded(ctx, expBarX, expBarY, expBarWidth, expBarHeight, 30);

        const currentExpWidth = (exp / expNextLevel) * expBarWidth;
        if (currentExpWidth > 0) {
            ctx.fillStyle = exp_color;
            drawSquareRounded(ctx, expBarX, expBarY, currentExpWidth, expBarHeight, 30);
        }

        // EXP Text
        const expText = `${exp} / ${expNextLevel} EXP`;
        ctx.font = `45px "${this.fontName}"`;
        ctx.fillStyle = text_color;
        ctx.textAlign = 'center';
        ctx.fillText(expText, expBarX + expBarWidth / 2, expBarY + 45);

        return canvas.createPNGStream();
    }
}

// Helper drawing function
function drawSquareRounded(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
}


// --- BOT COMMAND MODULE ---

module.exports.config = {
    name: "rank",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "NTKhang (Migrated by Gemini)",
    description: "View your level or the level of the tagged person using a canvas-generated card.",
    commandCategory: "Group",
    usages: "[empty | @tag]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "path": "",
        "canvas": "",
        "axios": ""
    }
};

module.exports.onLoad = async function () {
    const cacheDir = path.resolve(__dirname, "cache");
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    const fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/BeVietnamPro-Bold.ttf";
    const fontPath = path.resolve(cacheDir, "BeVietnamPro-Bold.ttf");
    if (!fs.existsSync(fontPath)) {
        try {
            console.log("RANKCARD: Downloading font...");
            const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
            fs.writeFileSync(fontPath, response.data);
            Canvas.registerFont(fontPath, { family: "BeVietnamPro-Bold" });
            console.log("RANKCARD: Font downloaded successfully.");
        } catch (e) {
            console.error("RANKCARD: Failed to download font:", e);
        }
    } else {
        Canvas.registerFont(fontPath, { family: "BeVietnamPro-Bold" });
    }
};

module.exports.run = async ({ event, api, args, Currencies, Users }) => {
    const { senderID, threadID, messageID, mentions } = event;
    const targetIDs = Object.keys(mentions).length > 0 ? Object.keys(mentions) : [senderID];

    try {
        let dataAll = (await Currencies.getAll(["userID", "exp"])).filter(item => item.exp > 0);
        dataAll.sort((a, b) => b.exp - a.exp);

        for (const userID of targetIDs) {
            const rank = dataAll.findIndex(item => parseInt(item.userID) === parseInt(userID)) + 1;
            const name = await Users.getNameUser(userID);
            const userCurrency = await Currencies.getData(userID);

            if (!userCurrency || typeof userCurrency.exp !== 'number' || rank === 0) {
                api.sendMessage(`User ${name} has not been ranked yet.`, threadID, messageID);
                continue;
            }

            const totalExp = userCurrency.exp;
            const level = expToLevel(totalExp);
            const expForNextLevel = levelToExp(level + 1) - levelToExp(level);

            const cardData = {
                userID: userID,
                name: name,
                rank: rank,
                level: level,
                exp: totalExp,
                expNextLevel: expForNextLevel
            };

            const imageStream = await makeRankCard(cardData);
            const tempImagePath = path.resolve(__dirname, "cache", `${Date.now()}_rank.png`);
            
            const writeStream = fs.createWriteStream(tempImagePath);
            imageStream.pipe(writeStream);

            writeStream.on('finish', () => {
                api.sendMessage({
                    attachment: fs.createReadStream(tempImagePath)
                }, threadID, () => fs.unlinkSync(tempImagePath), messageID);
            });
        }
    } catch (error) {
        console.error("Error in rank command:", error);
        api.sendMessage("An error occurred while generating the rank card.", threadID, messageID);
    }
};
