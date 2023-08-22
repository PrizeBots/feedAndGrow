//npx ts-node src/server.ts


import express from 'express';
import * as http from 'http';

import { Server, Socket } from 'socket.io'; // Update the import statement

const app = express();
const server = http.createServer(app);
const io = new Server(server); // Use new Server() to create the socket.io 

const PORT = 3000;
const NUM_BOTS = 10; // Number of bots to spawn
const TICK_RATE = 30; // Server tick rate in milliseconds
const DEFAULT_BOT_SPEED = 10;
const FULL_GROWN = 100;
const RED_CIRCLE_RADIUS = 5; // Radius of the red circle
const FIXED_TICK_RATE = 1000;
//app.use(express.static('src'));
app.use(express.static('src', {
  extensions: ['html', 'js', 'css', 'wav'], // Add 'wav' to the list of extensions
}));

interface Bot {
  id: string;
  x: number;
  y: number;
  color: string;
  health: number; // New property for bot's health
  speed: number; // Add the 'speed' property to the 'Bot' interface

  consumedRedDots: number;
  size: number;

}


interface RedCircle {
  id: string;
  x: number;
  y: number;
}
const bots: Bot[] = [];

const redCircles: RedCircle[] = [];
const tester = new Int8Array();
// const bots: Bot[] = new Int8Array();
// const redCircles = new Int8Array();

function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx ** 2 + dy ** 2);
}

function getRandomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16); // Generate a random hexadecimal color
}

function getRandomPosition() {
  return Math.floor(Math.random() * 800);
}

function getRandomDirection(): 'up' | 'down' | 'left' | 'right' {
  const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

function findClosestMatchingBot(bot: Bot) {
  let closestMatchingBot: Bot | null = null;
  let closestDistance = Infinity;

  for (const otherBot of bots) {
    if (otherBot !== bot && otherBot.size >= FULL_GROWN) {
      const distance = getDistance(bot.x, bot.y, otherBot.x, otherBot.y);
      if (distance < closestDistance && isBotInRange(bot, otherBot)) {
        closestDistance = distance;
        closestMatchingBot = otherBot;
      }
    }
  }

  return closestMatchingBot;
}

function moveBotTowardsTarget(bot: Bot, target: { x: number; y: number }) {
  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  const speed = bot.speed;

  if (distance > speed) {
    const ratio = speed / distance;
    bot.x += dx * ratio;
    bot.y += dy * ratio;
  } else {
    consumeRedDot(bot, target as RedCircle); // Assume target is RedCircle and consume it
  }
}

function moveBots() {
  for (const bot of bots) {
    //if bot is big enough 
    if (bot.size >= FULL_GROWN) {
      //go find a mate
      const closestBot = findClosestMatchingBot(bot);
      //if theres a mate then go get it
      if (closestBot) {
        moveBotTowards(bot, closestBot);
      } else {
        roam(bot);
      }
      //if no mate available then move around and eat more food

    } else {
      roam(bot);
    }
  }

  function roam(bot: Bot) {
    if (Math.random() < 0.6) {
      const newDirection = getRandomDirection();
      switch (newDirection) {
        case 'up':
          bot.y = Math.max(bot.y - bot.speed, 0);
          break;
        case 'down':
          bot.y = Math.min(bot.y + bot.speed, 799);
          break;
        case 'left':
          bot.x = Math.max(bot.x - bot.speed, 0);
          break;
        case 'right':
          bot.x = Math.min(bot.x + bot.speed, 799);
          break;
        default:
          break;
      }
    }
  }


  updateBotTargets(); // Call the function to update bot targets

  //which data type is best to emit here?
  io.emit('bots', bots); // Emit updated bot positions to all clients

}


// Check if a bot is within the range to be considered for interaction
function isBotInRange(bot: Bot, otherBot: Bot) {
  const sizeDifference = Math.abs(bot.size - otherBot.size);
  return sizeDifference <= bot.size * 0.2; // Within +/- 20% of the bot's size
}

// Check if two bots are colliding
function areBotsColliding(botA: Bot, botB: Bot) {
  const distance = getDistance(botA.x, botA.y, botB.x, botB.y);
  const collisionDistance = botA.size / 2 + botB.size / 2;
  return distance <= collisionDistance;
}

// Create a new bot with random color and size 10
function createRandomBot(): Bot {
  return {
    id: `bot_${Math.random().toString(36).substr(2, 9)}`,
    x: getRandomPosition(),
    y: getRandomPosition(),
    color: getRandomColor(),
    health: 100,
    speed: DEFAULT_BOT_SPEED,
    consumedRedDots: 0,
    size: 1,
  };
}




// Handle bot collisions and create new bots
// Handle bot collisions and create new bots
function handleBotCollisions() {
  const collidedBots: Bot[] = [];
  for (let i = 0; i < bots.length; i++) {
    for (let j = i + 1; j < bots.length; j++) {
      const botA = bots[i];
      const botB = bots[j];

      if (botA.size >= FULL_GROWN && botB.size >= FULL_GROWN && areBotsColliding(botA, botB)) {
        // Add the collided bots to the list
        collidedBots.push(botA, botB);
      }
    }
  }

  // If there are collided bots, create new bots and remove the collided bots
  if (collidedBots.length > 0) {
    for (const bot of collidedBots) {
      const index = bots.indexOf(bot);
      if (index !== -1) {
        bots.splice(index, 1);
        io.emit('botRemoved', bot.id); // Emit a m
      }
    }

    // Create 4 new bots of size 10
    for (let k = 0; k < 4; k++) {
      const newBot = createRandomBot();
      newBot.size = 1;
      bots.push(newBot);
    }

    // Emit the updated bot data to all clients
    io.emit('bots', bots);
  }
}


function findClosestRedDot(bot: Bot) {
  let closestRedDot: RedCircle | null = null;
  let closestDistance = Infinity;

  for (const redDot of redCircles) {
    const distance = getDistance(bot.x, bot.y, redDot.x, redDot.y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestRedDot = redDot;
    }
  }

  return closestRedDot;
}


function consumeRedDot(bot: Bot, redDot: RedCircle) {

  // Increase the bot's consumedRedDots count
  bot.consumedRedDots++;
  if (bot.speed > 1) bot.speed *= .9;
  console.log(bot.speed);
  bot.size = bot.size * 2;
  // Remove the consumed red dot from the array
  const index = redCircles.indexOf(redDot);
  if (index !== -1) {
    redCircles.splice(index, 1);
  }
  io.emit('redCircleConsumedByBot', redDot.id);
  io.emit('redCircles', redCircles);
  return redDot;
}


function moveBotTowardsRedDot(bot: Bot, redDot: RedCircle) {
  const dx = redDot.x - bot.x;
  const dy = redDot.y - bot.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  let speed = bot.speed;

  if (distance > speed) {
    // Move the bot closer to the red dot
    const ratio = speed / distance;
    bot.x += dx * ratio;
    bot.y += dy * ratio;
  } else {
    // The bot is close enough to consume the red dot
    consumeRedDot(bot, redDot);
  }
}




io.on('connection', (socket: Socket) => {
  socket.emit('bots', bots); // Send the current bots array to the newly connected bot
  socket.emit('redCircles', redCircles);

  socket.on('disconnect', () => {
    const index = bots.findIndex((b) => b.id === socket.id);
    if (index !== -1) {
      bots.splice(index, 1);
      io.emit('botDisconnected', socket.id);
    }
  });

  socket.on('placeRedCircle', (position: { x: number; y: number }) => {
    if (!position) return;

    // Add the new red dot to the array of redCircles
    const redCircle: RedCircle = {
      id: socket.id,
      x: position.x,
      y: position.y,
    };
    redCircles.push(redCircle);

    // Emit the updated array of red dots to all clients
    io.emit('redCircles', redCircles);
  });




  const consumeRedDotHandler = (redDotId: string) => {
    const redDot = redCircles.find((rd) => rd.id === redDotId);
    if (redDot) {
      const botId = socket.id;
      const bot = bots.find((b) => b.id === botId);
      if (bot) {
        const consumedRedDot = consumeRedDot(bot, redDot);
        io.emit('redCircleConsumedByBot', { botId, redDotId });
        // If needed, you can also send the consumedRedDot to the client for additional handling
        // io.emit('redCircleConsumedByBot', { botId, redDot });
      }
    }
  };

  socket.on('consumeRedDot', consumeRedDotHandler);
});
function moveBotTowardsBot(bot: Bot, otherBot: Bot) {
  const dx = otherBot.x - bot.x;
  const dy = otherBot.y - bot.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  let speed = bot.speed;

  if (distance > speed) {
    // Move the bot closer to the other bot
    const ratio = speed / distance;
    bot.x += dx * ratio;
    bot.y += dy * ratio;
  } else {
    // The bot is close enough to perform any additional actions here
  }
}
function updateBotTargets() {
  for (const bot of bots) {
    if (bot.size >= FULL_GROWN) {
      const closestBot = findClosestMatchingBot(bot);
      if (closestBot) {
        moveBotTowardsBot(bot, closestBot);
      }
      else{
        const closestRedDot = findClosestRedDot(bot);
      if (closestRedDot) {
        moveBotTowardsRedDot(bot, closestRedDot);
      }
      }
    } else {
      const closestRedDot = findClosestRedDot(bot);
      if (closestRedDot) {
        moveBotTowardsRedDot(bot, closestRedDot);
      }
    }
  }

  handleBotCollisions(); // Handle bot collisions and create new bots
}
function moveBotTowards(bot: Bot, target: { x: number; y: number }) {
  const dx = target.x - bot.x;
  const dy = target.y - bot.y;
  const distance = Math.sqrt(dx ** 2 + dy ** 2);
  const speed = bot.speed;

  if (distance > speed) {
    const ratio = speed / distance;
    bot.x += dx * ratio;
    bot.y += dy * ratio;
  } else {
    // The bot is close enough to perform any additional actions here
  }
}
function spawnBots() {
  for (let i = 0; i < NUM_BOTS; i++) {
    const bot: Bot = {
      id: `bot_${i}`,
      x: getRandomPosition(),
      y: getRandomPosition(),
      color: getRandomColor(),
      health: 100,
      speed: DEFAULT_BOT_SPEED,

      //latency: getRandomLatency(), // Generate random latency value for each bot
      consumedRedDots: 0,
      size: 1,
    };
    bots.push(bot);
  }
}

spawnBots();


setInterval(moveBots, TICK_RATE);

server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
