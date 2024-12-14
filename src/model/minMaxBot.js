'use strict';

import { randArgMin } from '../libhex.js';
import { Evaluator, MemorySequenceValueStorage } from './evaluator.js';
import {black} from './hexModel.js';


export class MinMaxBot {
    constructor(game) {
        this.game = game;
        this.evaluator = new Evaluator(game, new MemorySequenceValueStorage, black);
    }

    getMoveValue(hex) {
        return hex.game.after(hex.iRow, hex.iCol).toPositionString();
        g.play(hex.iRow, hex.iCol);
        return g.getRawValue();
    }

    play() {
        console.log(this.game.toAscii());
        if (this.game.getPossibleNexts().length > 0) {
            this.evaluator.evaluateNextsSync(this.game.clock.getTime() + 900);
        }
        const hexMin = this.evaluator.chooseNext();
        return this.game.play(hexMin.iRow, hexMin.iCol);
    }
}
