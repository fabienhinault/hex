'use strict';

import {range} from './libhex.js' 

export let white = {value: 1, getICoord: h => h.iRow};
export const black = {value: -1, getICoord: h => h.iCol, other: white};
white.other = black;

//class Player

//const whitePlayer
/**
 * A Hex is a hexagonal cell of the Hex board
 * */
class Hex {

    constructor(game, iRow, iCol) {
        this.game = game;
        this.iRow = iRow;
        this.iCol = iCol;
        /** the color of the token on the cell 
         * */
        this.color = undefined;
        /** the possible chain containing the token on the cell
         * */
        this.chain = undefined;
    }
    getColumnLetter() {
      // 65 = A 
      return String.fromCharCode(65 + this.iCol);
    }

    playWhite() {
        this.play(white);
    }

    play(color) {
        if (this.color !== undefined) {
            throw new Error('illegal move');
        }
        this.color = color;
        const chains = new Set(
            this.game.getNeighbourHexes(this.iRow, this.iCol)
                .filter(h => h.color === this.color)
                .map(h => h.chain));
        if (chains.size === 0) {
            this.chain = new Chain(this);
        } else {
            const iter = chains.values();
            const firstChain = iter.next().value;
            firstChain.addHex(this);
            while (!iter.done) {
                firstChain.addChain(iter.next().value);
            }
        }
        return this.chain.isWinning();
    }

    getICoord() {
        return this.color.getICoord(this);
    }
}
class Chain {
    constructor(hex) {
        this.hexes = [hex];
        this.game = hex.game;
        this.isTouchingHigh = (hex.getICoord() === this.game.size - 1);
        this.isTouchingLow = (hex.getICoord() === 0);
        this.game.chains.get(hex.color).push(this);
    }
/*

    getColor() {
        return this.hexes[0].color;
    }

    addHex(hex) {
        this.hexes.push(hex);
        hex.chain = this;
        this.isTouchingHigh ||= (hex.getICoord() === game.size - 1);
        this.isTouchingLow ||= (hex.getICoord() === 0);
    }

    addChain(chain) {
        this.hexes = this.hexes.concat(chain.hexes);
        chain.hexes.forEach(h => h.chain = this);
        this.game.getChains(this.getColor()).delete(chain);
        this.isTouchingHigh||= chain.isTouchingHigh;
        this.isTouchingLow ||= chain.isTouchingLow;
    }

*/
    isWinning() {
        return this.isTouchingHigh && this.isTouchingLow;
    }

}
class GameState {

}

class GameStateWhitesTurn extends GameState {
    constructor(game) {
        super();
        this.game = game;
    }

    play(iRow, iCol) {
        return this.game.board[iRow][iCol].play(white);
    }

    next() {
        return new GameStateBlacksTurn(this.game);
    }
}

class GameStateBlacksTurn extends GameState {
    constructor(game) {
        super();
        this.game = game;
    }

    play(iRow, iCol) {
        return this.game.board[iRow][iCol].play(black);
    }

    next() {
        return new GameStateWhitesTurn(this.game);
    }
}

export class Game {
    constructor(size) {
        this.size = size;
        this.board = range(size).map(iRow => range(size).map((iCol) => new Hex(this, iRow, iCol)));
        this.chains = new Map();
        this.chains.set(white, []);
        this.chains.set(black, []);
        // this.currentColor = white;
        this.currentState = new GameStateWhitesTurn(this);
    }
    play(iRow, iCol) {
        const winning = this.currentState.play(iRow, iCol);
        if (winning) {
            return true;
        } else {
            this.currentState = this.currentState.next();
        }
    }

    getNeighbourHexes(iRow, iCol) {
        return [[iRow - 1, iCol], [iRow - 1, iCol + 1], [iRow, iCol -1], [iRow, iCol + 1], [iRow + 1, iCol -1], [iRow + 1, iCol]].filter(
            rc => rc[0] >= 0 && rc[0] < this.size && rc[1] >= 0 && rc[1] < this.size).map(
            rc => this.board[rc[0]][rc[1]]);
    }
}
