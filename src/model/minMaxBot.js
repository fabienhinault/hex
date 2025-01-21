'use strict';

import { Evaluator, MemorySequenceValueStorage } from './evaluator.js';
import {black} from './hexModel.js';


export class MinMaxBot {
    constructor(game) {
        this.game = game;
        this.evaluator = new Evaluator(game, new MemorySequenceValueStorage(game.size), black);
    }

    play() {
        console.log(this.game.getPrompt());
        if (this.game.getPossibleNexts().length > 0) {
            this.evaluator.evaluateNextsSync(this.game.clock.getTime() + 1800);
        }
        const hexMin = this.evaluator.chooseNext();
        return this.game.play(hexMin.iRow, hexMin.iCol);
    }
}
