import {white, black} from './hexModel.js';
import { pickWeighted, pick } from '../libhex.js';


const unsure = 0;


function checkNotNan(n) {
    if (Number.isNaN(n)) {
        throw new Error();
    }
    return n;
}

export class Evaluator {
    constructor(game, sequenceValueStorage, player) {
        this.game = game;
        this.game.evaluator = this;
        this.sequenceValueStorage = sequenceValueStorage;
        this.player = player ?? black;
        if (this.game.dispatcher) {
            this.game.addGameOverListener(evt => this.onGameOver(evt.winner));
        }
        this.WinningValue = new Map();
        this.WinningValue.set(white, game.size * 4);
        this.WinningValue.set(black, -game.size * 4);
    }

    /* The value of a sequence says if the sequence is winning for firstPlayer or secondPlayer.
     * It is winning for firstPlayer if the value is close to firstPlayerValue, and same for secondPlayer.
     * The value of the sequence depends on the value of its successors.
     * All players are considered good. If a winning move exists, the evaluation supposes she will take it.
     */
    evaluateSequence(game) {
        // player who just played last move
        const previousPlayer = game.currentColor.other;
        const nextPlayer = game.currentColor;
        const nexts = game.board.flat().filter(h => h.color === undefined);
        const nextsValues = nexts.map(next => this.getSequenceValue(game.after(next.iRow, next.iCol)));
        const bestValue = nextPlayer.getBestValue(nextsValues);
        const nextWin = this.WinningValue.get(nextPlayer);
        const prevWin = this.WinningValue.get(previousPlayer);
        if (bestValue === nextWin) {
            // the current sequence is considered winning for nextPlayer.
            // attenuated for the possible losing moves, and the distance.
            return checkNotNan(nextPlayer.attenuate(bestValue, nextsValues.filter(v => v !== nextWin).length + 1));
        }
        if (bestValue === prevWin) {
            return checkNotNan(previousPlayer.attenuate(bestValue, nextsValues.filter(v => v !== prevWin).length + 1));
        }
        return checkNotNan(bestValue);
    }

    evaluateAllSubsequences() {
        const lastPlayerValue = this.game.getRawValue();
        this.sequenceValueStorage.storeValue(this.game.toPositionString(), lastPlayerValue);
        if (this.game.sequence.length > 0) {
            const oneMoveBefore = this.game.toOneMoveBefore();
            this.sequenceValueStorage.storeValue(oneMoveBefore.toPositionString(), lastPlayerValue);
        }
        for (let game of this.game.getReverseSequence()) {
            const value = this.evaluateSequence(game);
            if (Number.isNaN(value)) {
                throw new Error();
            }
            if (Math.abs(value) > game.size) {
                this.sequenceValueStorage.storeValue(game.toPositionString(), value);
            } else {
                break;
            }
        }
    }

    getSequenceValue(game) {
        const storedValue = this.sequenceValueStorage.getValue(game.toPositionString());
        if (storedValue !== null && storedValue !== undefined) {
            return Number(storedValue);
        }
        return game.getRawValue();
    }


    evaluateNexts(time) {
        this.evaluateAbstract(time, (evaluator, t) => {
            setTimeout(() => {
                evaluator.evaluateNexts(t);
            }, 0);
        });
    }

    evaluateNextsSync(time) {
        this.evaluateAbstract(time, (evaluator, t) => {
            evaluator.evaluateNextsSync(t);
        });
    }

    evaluateAbstract(time, f) {
        const now = this.game.clock.getTime()
        if (!time || now < time) {
            const possibleNexts = this.game.getPossibleNexts();
            const remainingTime = (time - now) / possibleNexts.length;
            for (let iNext = 0; iNext < possibleNexts.length; iNext++) {
                const next = possibleNexts[iNext];
                const gameCopy = this.game.copy();
                const evaluator = new Evaluator(gameCopy, this.sequenceValueStorage, this.player);
                const winningChain = gameCopy.play(next.iRow, next.iCol);
                if (winningChain) {
                    evaluator.evaluateAllSubsequences();
                } else {
                    f(evaluator, now + ((iNext + 1) * remainingTime));
                }
            }
        } else {
            this.evaluateAllSubsequences();
        }
    }

    // choose best next move for bot
    chooseNext() {
        const possibleNextsValues = this.game.getPossibleNexts().map(move => {return {move, value:this.getMoveValue(move)};});
        const winning = possibleNextsValues.find(mv => this.player.isWinning(mv.value, this.game.size));
        if (winning) {
            return pick(this.player.getArgsBest(possibleNextsValues, _ => _.value)).move;
        }
        const notLosings = possibleNextsValues.filter(mv => !this.player.other.isWinning(mv.value, this.game.size));
        if (notLosings.length >= 1) {
            const weighteds = notLosings.map(_ => {
                return {move: _.move, weight: Math.abs(_.value)};
            });
            return (pickWeighted(weighteds)).move;
        } else {
            return pick(this.player.getArgsBest(possibleNextsValues, _ => _.value)).move;
        }
    }

    getMoveValue(hex) {
        return this.getSequenceValue(this.game.after(hex.iRow, hex.iCol));
    }
}


export class MemorySequenceValueStorage {
    constructor() {
        this.values = new Map();
    }
    storeValue(positionString, value) {
        this.values.set(positionString, value);
    }
    getValue(positionString) {
        return this.values.get(positionString);
    }
    removeValue(positionString) {
        this.values.delete(positionString);
    }
}
