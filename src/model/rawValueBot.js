'use strict';

import { randArgMin } from '../libhex.js';

function getMoveValue(hex) {
    let g = hex.game.copy();
    g.play(hex.iRow, hex.iCol);
    return g.getRawValue();
} 

export class RawValueBot {
    constructor(game) {
        this.game = game;
    }

    play() {
        console.log(this.game.toAscii());
        const hexMin = randArgMin(this.game.board.flat().filter(h => h.color === undefined), getMoveValue);
        return this.game.play(hexMin.iRow, hexMin.iCol);
    }
}

