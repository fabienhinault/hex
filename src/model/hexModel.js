'use strict';

import {range, argsOpt, optimum } from '../libhex.js'
import * as readline from "readline/promises";

class Player {
    constructor(value, getICoord, getJCoord, compare, initialValue, prompt, positionString, other) {
        this.value = value;
        this.getICoord = getICoord;
        this.getJCoord = getJCoord;
        this.initialValue = initialValue;
        this.compare = compare;
        this.prompt = prompt;
        this.positionString = positionString;
        this.other = other;
    }

    getBestValue(values) {
        return optimum(values, x => x, this.compare, this.initialValue).value;
    }

    getArgsBest(elements, f) {
        return argsOpt(elements, f, this.compare, this.initialValue);
    }

    attenuate(value) {
        return value - 0.1 * this.value;
    }
}

export let white = new Player(1, h => h.iRow, h => h.iCol, (x, y) => x > y, Number.NEGATIVE_INFINITY, '●', 'w', null);
export const black = new Player(
    -1, h => h.iCol, h => h.iRow, (x, y) => x < y, Number.POSITIVE_INFINITY, '\x1b[43m\x1b[30m●\x1b[0m', 'b', white);
white.other = black;
let players = [white, black];

export function getLastPlayer(moves) {
    return players[(moves.length % 2)];
}

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
            let iteratorResult = iter.next();
            const firstChain = iteratorResult.value;
            firstChain.addHex(this);
            iteratorResult = iter.next();
            while (!iteratorResult.done) {
                firstChain.addChain(iteratorResult.value);
                iteratorResult = iter.next();
            }
        }
        if (this.chain.isWinning()) {
            return this.chain;
        }
        return null;
    }

    unplay() {
        if (this.color === undefined) {
            throw new Error('illegal unmove');
        }
        const exColor = this.color;
        this.color = undefined;
        const exChain = this.chain;
        this.chain = undefined;
        this.game.chains.get(exColor).delete(exChain);
        exChain.hexes.forEach(h => h.color = undefined);
        exChain.hexes.forEach(h => {if (h !== this) {h.play(exColor)}});
    }

    getICoord() {
        return this.color.getICoord(this);
    }

    toString() {
        return `${this.getColumnLetter()}${this.iRow + 1}`;
    }

    compareTo(other) {
        if (this.iRow < other.iRow) {
            return -1;
        } else if  (this.iRow > other.iRow) {
            return 1;
        } else if (this.iCol < other.iCol) {
            return -1;
        } else if (this.iCol > other.iCol) {
            return 1;
        } else {
            return 0;
        }
    }

    toAscii() {
        if (this.color === undefined) {
            return '_';
        } else {
            return this.color.prompt;
        }
    }

    getPositionString() {
        return this.color
    }
}

class Chain {
    constructor(hex) {
        this.hexes = [hex];
        this.game = hex.game;
        this.isTouchingHigh = (hex.getICoord() === this.game.size - 1);
        this.isTouchingLow = (hex.getICoord() === 0);
        this.minICoord = hex.getICoord();
        this.maxICoord = hex.getICoord();
        this.game.chains.get(hex.color).add(this);
    }
    
    getColor() {
        return this.hexes[0].color;
    }
    
    addHex(hex) {
        this.hexes.push(hex);
        hex.chain = this;
        this.isTouchingHigh ||= (hex.getICoord() === this.game.size - 1);
        this.isTouchingLow ||= (hex.getICoord() === 0);
        this.minICoord = Math.min(this.minICoord, hex.getICoord());
        this.maxICoord = Math.max(this.maxICoord, hex.getICoord());
    }

    addChain(chain) {
        this.hexes = this.hexes.concat(chain.hexes);
        chain.hexes.forEach(h => h.chain = this);
        this.game.chains.get(this.getColor()).delete(chain);
        this.isTouchingHigh ||= chain.isTouchingHigh;
        this.isTouchingLow ||= chain.isTouchingLow;
        this.minICoord = Math.min(this.minICoord, chain.minICoord);
        this.maxICoord = Math.max(this.maxICoord, chain.maxICoord);
    }

    isWinning() {
        return this.isTouchingHigh && this.isTouchingLow;
    }

    toString() {
        return this.hexes
        .toSorted((h, i) => h.compareTo(i))
        .map(h => h.toString()).join(' ');
    }

    getValue() {
        if (this.isWinning()) {
            return 4 * this.game.size;
        }
        let value = this.maxICoord - this.minICoord;
        if (this.isTouchingHigh || this.isTouchingLow) {
            value *= 2;
        }
        return value;
    }
}

function getLinePositionString(line) {
    return line.map(h => h.color?.positionString ?? ' ').join('').replaceAll(/ +/g, ss => ss.length);
}

class Clock {
    getTime() {
        return Date.now();
    }
}

const clock = new Clock();

export class Game {
    constructor(size) {
        this.size = size;
        this.board = range(size).map(iRow => range(size).map((iCol) => new Hex(this, iRow, iCol)));
        this.chains = new Map();
        this.chains.set(white, new Set());
        this.chains.set(black, new Set());
        this.currentColor = white;
        this.sequence = [];
        this.clock = clock;
        this.maxChainValue = this.size * 4;

    }

    copy() {
        let g = new Game(this.size);
        for (let [iRow, iCol] of this.sequence) {
            g.play(iRow, iCol);
        }
        return g;
    }

    play(iRow, iCol) {
        if (iRow < 0 || iRow >= this.size || iCol < 0 || iCol >= this.size) {
            throw new Error(`out of board ${iRow} ${iCol}`);
        }
        this.sequence.push([iRow, iCol]);
        const winningChain = this.board[iRow][iCol].play(this.currentColor);
        this.currentColor = this.currentColor.other;
        if (winningChain) {
            return winningChain;
        }
    }

    after(iRow, iCol) {
        let result = this.copy();
        result.play(iRow, iCol);
        return result;
    }

    unplay() {
        if (this.sequence.length === 0) {
            throw new Error('no move to unplay');
        }
        let [iRow, iCol] = this.sequence.pop();
        if (iRow < 0 || iRow >= this.size || iCol < 0 || iCol >= this.size) {
            throw new Error(`out of board ${iRow} ${iCol}`);
        }
        this.board[iRow][iCol].unplay();
        this.currentColor = this.currentColor.other;
    }

    toOneMoveBefore() {
        let g = new Game(this.size);
        for (let [iRow, iCol] of this.sequence.slice(0, this.sequence.length - 1)) {
            g.play(iRow, iCol);
        }
        return g;
    }

    getReverseSequence() {
        if (this.sequence.length <= 2) {
            return [];
        }
        let result = [];
        let game = this.copy();
        // sequence is interesting only 2 moves before.
        game.unplay();
        game.unplay();
        while (game.sequence.length > 0) {
            result.push(game);
            game = game.toOneMoveBefore();
        }
        return result;
    }

    getNeighbourHexes(iRow, iCol) {
        return [[iRow - 1, iCol], [iRow - 1, iCol + 1], [iRow, iCol -1], [iRow, iCol + 1], [iRow + 1, iCol -1], [iRow + 1, iCol]].filter(
            rc => rc[0] >= 0 && rc[0] < this.size && rc[1] >= 0 && rc[1] < this.size).map(
            rc => this.board[rc[0]][rc[1]]);
    }

    colIndexFromLetter(letter) {
      return letter.toUpperCase().charCodeAt(0) - 65;
    }

    playFromHumanString(str) {
        const letter = str[0];
        if (!/[a-zA-Z]/.test(letter)){
            throw Error ("invalid column");
        }
        return this.play(parseInt(str.substr(1)) - 1, this.colIndexFromLetter(letter));
    }

    async twoPlayers() {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        while (true) {
            try{
                const winningChain = await this.promptOnce(rl);
                if (winningChain) {
                    return;
                }
            } catch (e) {
                console.log(e.message);
                continue;
            }
        }
    }

    async promptOnce(rl) {
        const input = await rl.question(`${this.toAscii()}\n${this.currentColor.prompt}:`);
        const winningChain = this.playFromHumanString(input);
        if (winningChain) {
            console.log(this.toAscii());
            console.log(winningChain.toString());
        }
        return winningChain;
    }

    toAscii() {
        return '\x1b[47m\x1b[30m'.concat(this.board[0].map(h => h.getColumnLetter()).join(' ')).concat('\x1b[0m\n').concat(
                this.board.map(
                    (row, iRow) => " ".repeat(iRow + 1)
                        .concat(row.map(h => h.toAscii())
                        .join(' ')
                        .concat(`  ${iRow + 1}`))
                    ).join('\n')
                ).concat('\n').concat(' '.repeat(this.size)).concat('\x1b[47m').concat('  '.repeat(this.size)).concat('\x1b[0m\n');
    }

    toPositionString() {
        return this.board.map(l => getLinePositionString(l)).join('/');
    }

    getRawValue() {
        const maxWhite = Math.max(...[...this.chains.get(white)].map(c => c.getValue()));
        const maxBlack = Math.max(...[...this.chains.get(black)].map(c => c.getValue()));
        if (maxWhite === this.maxChainValue) {
            return maxWhite;
        } else if (maxBlack  === this.maxChainValue) {
            return -maxBlack;
        } else {
            return maxWhite - maxBlack;
        }
    }

    getPossibleNexts() {
        return this.board.flat().filter(h => h.color === undefined);
    }


}
