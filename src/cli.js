'use strict';

import {Game} from './model/hexModel.js';
import { RawValueBot } from './model/rawValueBot.js';
import * as readline from "readline/promises";

const game = new Game(5);
const bot = new RawValueBot(game);
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
            console.log(winningChain.toString());
            break;
        }
    } catch (e) {
        console.log(e.message);
        continue;
    }
}
process.exit(0);
