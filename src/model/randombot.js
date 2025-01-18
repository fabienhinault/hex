'use strict';

import {Game} from './hexModel.js';
import { getRandomInt } from '../libhex.js';

export class RandomBot {
    constructor(game) {
        this.game = game;
    }

    play() {
        console.log(this.game.getPrompt());
        let iRow = getRandomInt(0, this.game.size);
        let iCol = getRandomInt(0, this.game.size);
        while (true) {
            while (iCol < this.game.size) {
                const free = (this.game.board[iRow][iCol].color === undefined);
                if (free) {
                    const winningChain = this.game.play(iRow, iCol);
                    return winningChain;
                } else {
                    iCol +=1
                }
            }
            iRow = (iRow + 1) % this.game.size;
            iCol = 0;
        }
    }
}
