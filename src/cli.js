'use strict';

import {Game} from './model/hexModel.js';
import { MinMaxBot } from './model/minMaxBot.js';
import * as readline from "readline/promises";

const game = new Game(5);
const bot = new MinMaxBot(game);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
while (true) {
    try{
        let winningChain = await game.promptOnce(rl);
        if (winningChain) {
            process.exit(0);
        }
        winningChain = bot.play();
        if (winningChain) {
            console.log(game.getPrompt());
            console.log(winningChain.toString());
            break;
        }
    } catch (e) {
        console.log(e.message);
        continue;
    }
}
process.exit(0);
